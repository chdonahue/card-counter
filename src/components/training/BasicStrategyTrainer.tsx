import { useState, useEffect, useCallback, useRef } from 'react';
import { Hand } from '../cards';
import type { BlackjackHand } from '../../core/blackjack';
import type { Card } from '../../types/card';
import type { Shoe as ShoeType } from '../../core/card/Shoe';
import { createHand, addCardToHand, evaluateHand, canSplit, canDoubleDown } from '../../core/blackjack';
import { createShoe, dealCard, DEFAULT_SHOE_CONFIG } from '../../core/card/Shoe';
import {
  type Decision,
  getBasicStrategyAction,
} from '../../core/blackjack/BasicStrategy';
import { HiLoSystem } from '../../core/counting';
import { useProgressStore } from '../../stores/useProgressStore';
import {
  type ScaffoldingLevel,
  SCAFFOLDING_LABELS,
  BUTTON_STYLES,
  ProgressBar,
  DecisionButtons,
} from './shared';

type TrainingState =
  | 'idle'
  | 'dealing'           // Initial 4-card deal
  | 'deciding'          // Waiting for user decision
  | 'deciding-fallback' // Missed double or wrong double, now pick hit/stand
  | 'dealing-card'      // Dealing a card after hit/double
  | 'checking-card'     // After dealing, check if bust/21/continue
  | 'dealing-split'     // Dealing second cards to split hands
  | 'playing-dealer'    // Dealer's turn
  | 'hand-complete'     // Hand finished, show summary
  | 'session-complete';

const SESSION_DECISIONS_TARGET = 20;
const FEEDBACK_DURATION = 1200;

// Timing constants
const TIMING = {
  FIRST_CARD_DELAY: 100,    // Brief pause before first card
  CARD_DEAL_DELAY: 150,     // Quick deal for hit/double
  FLASH_DURATION: 400,      // How long card outlines flash
  AUTO_ADVANCE_DELAY: 400,  // Pause before auto-standing on 21
} as const;

interface TrainerStats {
  correct: number;
  total: number;
}

interface FeedbackMessage {
  text: string;
  isCorrect: boolean;
  id: number;
}

// Deal sequence step types for unified dealing
type DealStep =
  | { type: 'player'; handIndex: number; flash: boolean }
  | { type: 'dealerUp'; flash: boolean }
  | { type: 'dealerHole' }
  | { type: 'checkBlackjack' };

// Initial deal sequence: player card, dealer up, player card, dealer hole, check
const INITIAL_DEAL_SEQUENCE: DealStep[] = [
  { type: 'player', handIndex: 0, flash: true },
  { type: 'dealerUp', flash: true },
  { type: 'player', handIndex: 0, flash: true },
  { type: 'dealerHole' },
  { type: 'checkBlackjack' },
];

// Decision validation result
type ValidationResult =
  | { valid: true }
  | { valid: false; feedback: string; goToFallback: boolean; continueWithAction?: Decision };

/**
 * Validate a player's decision against the correct action
 * Returns validation result with feedback and next state info
 */
function validateDecision(action: Decision, correctAction: Decision | null): ValidationResult {
  if (!correctAction) {
    return { valid: true };
  }

  // Should double but picked hit/stand
  if (correctAction === 'double' && (action === 'hit' || action === 'stand')) {
    return { valid: false, feedback: 'Missed double opportunity', goToFallback: true };
  }

  // Picked double but shouldn't have
  if (action === 'double' && correctAction !== 'double') {
    return { valid: false, feedback: "Shouldn't double here", goToFallback: true };
  }

  // Should split but didn't
  if (correctAction === 'split' && action !== 'split') {
    return { valid: false, feedback: 'Should have split', goToFallback: false, continueWithAction: action };
  }

  // Picked split but shouldn't have
  if (action === 'split' && correctAction !== 'split') {
    return { valid: false, feedback: "Shouldn't split here", goToFallback: true };
  }

  // Normal validation
  if (action !== correctAction) {
    return { valid: false, feedback: `Incorrect - should ${correctAction}`, goToFallback: false };
  }

  return { valid: true };
}

export function BasicStrategyTrainer() {
  const [shoe, setShoe] = useState<ShoeType>(() => createShoe(DEFAULT_SHOE_CONFIG));
  // Support multiple hands for splits
  const [playerHands, setPlayerHands] = useState<BlackjackHand[]>([createHand()]);
  const [activeHandIndex, setActiveHandIndex] = useState(0);
  const [dealerHand, setDealerHand] = useState<BlackjackHand>(() => createHand());
  const [trainingState, setTrainingState] = useState<TrainingState>('idle');

  // Track dealer cards separately for display during initial deal
  const [dealerUpCard, setDealerUpCard] = useState<Card | null>(null);
  const [dealerHoleCard, setDealerHoleCard] = useState<Card | null>(null);

  // Decision tracking
  const [correctAction, setCorrectAction] = useState<Decision | null>(null);
  const [lastAction, setLastAction] = useState<Decision | null>(null);

  // Track which hands were just split and need second cards [firstIndex, secondIndex]
  const [splitIndices, setSplitIndices] = useState<[number, number] | null>(null);

  // Unified dealing: current step in the deal sequence
  const [dealStep, setDealStep] = useState(0);

  // Flash mode: track which card is flashing in dealer and player hands
  const [dealerFlashIndex, setDealerFlashIndex] = useState<number>(-1);
  // Map of player hand index -> card index that's flashing
  const [playerFlashIndices, setPlayerFlashIndices] = useState<Record<number, number>>({});

  // Feedback - independent of game state
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const feedbackIdRef = useRef(0);

  // Stats
  const [stats, setStats] = useState<TrainerStats>({ correct: 0, total: 0 });

  // Settings
  const [dealSpeed, setDealSpeed] = useState<number>(600);
  // Scaffolding for card counting overlays (cyan/magenta outlines)
  const [countScaffolding, setCountScaffolding] = useState<ScaffoldingLevel>('bold');

  // Use ref for shoe to avoid stale closure issues
  const shoeRef = useRef(shoe);
  useEffect(() => { shoeRef.current = shoe; }, [shoe]);

  // Progress store
  const { startSession, recordHandComplete, endSession, totalHandsCounted, streakCurrent, streakBest } = useProgressStore();

  // Get the currently active hand
  const activeHand = playerHands[activeHandIndex] || createHand();

  // Show feedback (persists independently, auto-clears)
  const showFeedback = useCallback((text: string, isCorrect: boolean) => {
    const id = ++feedbackIdRef.current;
    setFeedback({ text, isCorrect, id });
    setTimeout(() => {
      setFeedback(prev => prev?.id === id ? null : prev);
    }, FEEDBACK_DURATION);
  }, []);

  // Flash a dealer card briefly (for flash scaffolding mode)
  const flashDealerCard = useCallback((cardIndex: number) => {
    if (countScaffolding !== 'flash') return;
    setDealerFlashIndex(cardIndex);
    setTimeout(() => setDealerFlashIndex(-1), TIMING.FLASH_DURATION);
  }, [countScaffolding]);

  // Flash a player card briefly (for flash scaffolding mode)
  const flashPlayerCard = useCallback((handIndex: number, cardIndex: number) => {
    if (countScaffolding !== 'flash') return;
    setPlayerFlashIndices(prev => ({ ...prev, [handIndex]: cardIndex }));
    setTimeout(() => setPlayerFlashIndices(prev => ({ ...prev, [handIndex]: -1 })), TIMING.FLASH_DURATION);
  }, [countScaffolding]);

  // Deal a card from the shoe
  const dealOneCard = useCallback((): Card | null => {
    const result = dealCard(shoeRef.current);
    if (!result) {
      const newShoe = createShoe(DEFAULT_SHOE_CONFIG);
      setShoe(newShoe);
      shoeRef.current = newShoe;
      return null;
    }
    setShoe(result.updatedShoe);
    shoeRef.current = result.updatedShoe;
    return { ...result.card, faceUp: true };
  }, []);

  // Calculate correct action for current hand state
  const updateCorrectAction = useCallback(() => {
    if (dealerUpCard && activeHand.cards.length >= 2) {
      const action = getBasicStrategyAction(activeHand, dealerUpCard);
      setCorrectAction(action);
    }
  }, [dealerUpCard, activeHand]);

  // Start a new hand
  const startNewHand = useCallback(() => {
    setPlayerHands([createHand()]);
    setActiveHandIndex(0);
    setDealerHand(createHand());
    setDealerUpCard(null);
    setDealerHoleCard(null);
    setCorrectAction(null);
    setLastAction(null);
    setFeedback(null);
    setSplitIndices(null);
    setDealStep(0);
    setDealerFlashIndex(-1);
    setPlayerFlashIndices({});
    setTrainingState('dealing');
  }, []);

  // Start training session
  const startTraining = useCallback(() => {
    startSession('basic-strategy', {
      scaffolding: 'none',
      speed: dealSpeed,
      askTotal: false,
      deckCount: DEFAULT_SHOE_CONFIG.deckCount,
    });
    setStats({ correct: 0, total: 0 });
    startNewHand();
  }, [startSession, dealSpeed, startNewHand]);

  // Unified initial deal effect - processes steps from INITIAL_DEAL_SEQUENCE
  useEffect(() => {
    if (trainingState !== 'dealing') return;
    if (dealStep >= INITIAL_DEAL_SEQUENCE.length) return;

    const step = INITIAL_DEAL_SEQUENCE[dealStep];
    const delay = dealStep === 0 ? TIMING.FIRST_CARD_DELAY : dealSpeed;

    const timer = setTimeout(() => {
      switch (step.type) {
        case 'player': {
          const card = dealOneCard();
          if (card) {
            const cardIndex = playerHands[step.handIndex]?.cards.length || 0;
            setPlayerHands(prev => {
              const newHands = [...prev];
              newHands[step.handIndex] = addCardToHand(newHands[step.handIndex], card);
              return newHands;
            });
            if (step.flash) flashPlayerCard(step.handIndex, cardIndex);
          }
          setDealStep(prev => prev + 1);
          break;
        }
        case 'dealerUp': {
          const card = dealOneCard();
          if (card) {
            setDealerUpCard(card);
            if (step.flash) flashDealerCard(0);
          }
          setDealStep(prev => prev + 1);
          break;
        }
        case 'dealerHole': {
          const card = dealOneCard();
          if (card) setDealerHoleCard({ ...card, faceUp: false });
          setDealStep(prev => prev + 1);
          break;
        }
        case 'checkBlackjack': {
          const playerValue = evaluateHand(playerHands[0]?.cards || []);
          if (playerValue.isBlackjack) {
            showFeedback('Blackjack!', true);
            if (dealerUpCard && dealerHoleCard) {
              setDealerHand({ cards: [dealerUpCard, { ...dealerHoleCard, faceUp: true }] });
            }
            setTrainingState('playing-dealer');
          } else {
            setTrainingState('deciding');
          }
          break;
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [trainingState, dealStep, playerHands, dealerUpCard, dealerHoleCard, dealSpeed, dealOneCard, showFeedback, flashDealerCard, flashPlayerCard]);

  // Update correct action when entering deciding state
  useEffect(() => {
    if (trainingState === 'deciding') {
      updateCorrectAction();
    }
  }, [trainingState, activeHand.cards.length, updateCorrectAction]);

  // Record a decision
  const recordDecision = useCallback((isCorrect: boolean) => {
    setStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
    recordHandComplete(isCorrect);
  }, [recordHandComplete]);

  // Handle decision - uses extracted validation logic
  const handleDecision = (action: Decision) => {
    setLastAction(action);
    const validation = validateDecision(action, correctAction);

    if (!validation.valid) {
      // Invalid decision
      showFeedback(validation.feedback, false);
      recordDecision(false);

      if (validation.goToFallback) {
        setTrainingState('deciding-fallback');
        return;
      }

      // Continue with the player's chosen action (e.g., missed split)
      if (validation.continueWithAction) {
        if (validation.continueWithAction === 'stand') {
          moveToNextHandOrDealer();
        } else {
          setTrainingState('dealing-card');
        }
        return;
      }
    }

    // Valid or normal incorrect decision
    const isCorrect = action === correctAction;
    if (validation.valid) {
      showFeedback('Correct!', true);
    }
    recordDecision(isCorrect);

    // Execute the action
    switch (action) {
      case 'stand':
        moveToNextHandOrDealer();
        break;
      case 'split':
        performSplit();
        break;
      case 'double':
      case 'hit':
        setTrainingState('dealing-card');
        break;
    }
  };

  // Move to next split hand or dealer
  const moveToNextHandOrDealer = useCallback(() => {
    if (activeHandIndex < playerHands.length - 1) {
      // More hands to play
      setActiveHandIndex(prev => prev + 1);
      setTrainingState('deciding');
    } else {
      // All hands done, dealer plays
      if (dealerUpCard && dealerHoleCard) {
        setDealerHand({ cards: [dealerUpCard, { ...dealerHoleCard, faceUp: true }] });
      }
      setTrainingState('playing-dealer');
    }
  }, [activeHandIndex, playerHands.length, dealerUpCard, dealerHoleCard]);

  // Auto-stand on 21 (no decision needed)
  useEffect(() => {
    if (trainingState === 'deciding') {
      const handValue = evaluateHand(activeHand.cards);
      if (handValue.best === 21) {
        showFeedback('21!', true);
        const timer = setTimeout(() => {
          moveToNextHandOrDealer();
        }, TIMING.AUTO_ADVANCE_DELAY);
        return () => clearTimeout(timer);
      }
    }
  }, [trainingState, activeHand.cards, showFeedback, moveToNextHandOrDealer]);

  // Perform the split - supports re-splitting by inserting new hand after current
  const performSplit = () => {
    const hand = activeHand;

    // Defensive validation: ensure hand is actually splittable
    if (!canSplit(hand)) {
      console.error('Attempted to split invalid hand', hand);
      return;
    }

    // Create two hands, each with one card from the pair
    const hand1: BlackjackHand = { cards: [hand.cards[0]] };
    const hand2: BlackjackHand = { cards: [hand.cards[1]] };

    // Insert the new hand right after the current one
    setPlayerHands(prev => {
      const newHands = [...prev];
      // Replace current hand with first split hand
      newHands[activeHandIndex] = hand1;
      // Insert second split hand right after
      newHands.splice(activeHandIndex + 1, 0, hand2);
      return newHands;
    });

    // Track which hands need cards
    setSplitIndices([activeHandIndex, activeHandIndex + 1]);
    setTrainingState('dealing-split');
  };

  // Deal cards to split hands - deals one card to each split hand then transitions
  useEffect(() => {
    if (trainingState !== 'dealing-split') return;
    if (!splitIndices) return;

    const [idx1, idx2] = splitIndices;
    const hand1Cards = playerHands[idx1]?.cards.length || 0;
    const hand2Cards = playerHands[idx2]?.cards.length || 0;

    // Helper to deal a card to a specific hand index
    const dealToHand = (handIndex: number) => {
      const card = dealOneCard();
      if (card) {
        const cardIndex = playerHands[handIndex]?.cards.length || 0;
        setPlayerHands(prev => {
          const newHands = [...prev];
          newHands[handIndex] = addCardToHand(newHands[handIndex], card);
          return newHands;
        });
        flashPlayerCard(handIndex, cardIndex);
      }
    };

    // Determine next action based on current card counts
    const timer = setTimeout(() => {
      if (hand1Cards === 1) {
        dealToHand(idx1);
      } else if (hand1Cards === 2 && hand2Cards === 1) {
        dealToHand(idx2);
      } else if (hand1Cards === 2 && hand2Cards === 2) {
        // Both split hands ready, continue playing
        setActiveHandIndex(idx1);
        setSplitIndices(null);
        setTrainingState('deciding');
      }
    }, dealSpeed);

    return () => clearTimeout(timer);
  }, [trainingState, playerHands, dealOneCard, splitIndices, flashPlayerCard, dealSpeed]);

  // Handle fallback decision
  const handleFallbackDecision = (action: Decision) => {
    setLastAction(action);

    if (action === 'stand') {
      moveToNextHandOrDealer();
    } else if (action === 'hit') {
      setTrainingState('dealing-card');
    }
  };

  // Deal card after hit/double - deals exactly one card then transitions to checking
  useEffect(() => {
    if (trainingState !== 'dealing-card') return;

    const currentHandLength = playerHands[activeHandIndex]?.cards.length || 0;

    const timer = setTimeout(() => {
      const card = dealOneCard();
      if (card) {
        setPlayerHands(prev => {
          const newHands = [...prev];
          newHands[activeHandIndex] = addCardToHand(newHands[activeHandIndex], card);
          return newHands;
        });
        flashPlayerCard(activeHandIndex, currentHandLength);
      }
      // Immediately transition to checking state to prevent re-dealing
      setTrainingState('checking-card');
    }, TIMING.CARD_DEAL_DELAY);

    return () => clearTimeout(timer);
  }, [trainingState, activeHandIndex, dealOneCard, flashPlayerCard, playerHands]);

  // After dealing a card, check if we need another decision
  useEffect(() => {
    if (trainingState !== 'checking-card') return;

    const timer = setTimeout(() => {
      const value = evaluateHand(activeHand.cards);

      if (value.isBust) {
        moveToNextHandOrDealer();
      } else if (lastAction === 'double') {
        moveToNextHandOrDealer();
      } else if (value.best === 21) {
        moveToNextHandOrDealer();
      } else {
        setTrainingState('deciding');
      }
    }, dealSpeed);

    return () => clearTimeout(timer);
  }, [trainingState, activeHand.cards, lastAction, dealSpeed, moveToNextHandOrDealer]);

  // Play out dealer's hand
  useEffect(() => {
    if (trainingState !== 'playing-dealer') return;

    // Check if all player hands busted
    const allBusted = playerHands.every(h => evaluateHand(h.cards).isBust);
    if (allBusted) {
      const timer = setTimeout(() => {
        setTrainingState('hand-complete');
      }, dealSpeed);
      return () => clearTimeout(timer);
    }

    const dealerValue = evaluateHand(dealerHand.cards);

    if (dealerValue.best >= 17 || dealerValue.isBust) {
      const timer = setTimeout(() => {
        setTrainingState('hand-complete');
      }, dealSpeed);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      const card = dealOneCard();
      if (card) {
        const newCardIndex = dealerHand.cards.length;
        setDealerHand(prev => addCardToHand(prev, card));
        flashDealerCard(newCardIndex);
      }
    }, dealSpeed);
    return () => clearTimeout(timer);
  }, [trainingState, dealerHand.cards.length, dealOneCard, playerHands, flashDealerCard, dealSpeed]);

  // Continue to next hand
  const handleContinue = () => {
    if (stats.total >= SESSION_DECISIONS_TARGET) {
      endSession();
      setTrainingState('session-complete');
    } else {
      startNewHand();
    }
  };

  // Reset
  const handleReset = () => {
    if (stats.total > 0) {
      endSession();
    }
    setTrainingState('idle');
    setPlayerHands([createHand()]);
    setActiveHandIndex(0);
    setDealerHand(createHand());
    setDealerUpCard(null);
    setDealerHoleCard(null);
    setStats({ correct: 0, total: 0 });
    setLastAction(null);
    setCorrectAction(null);
    setFeedback(null);
    setSplitIndices(null);
    setDealStep(0);
    setDealerFlashIndex(-1);
    setPlayerFlashIndices({});
  };

  const handleNewSession = () => {
    startTraining();
  };

  // Build dealer display hand
  const getDealerDisplayHand = (): BlackjackHand => {
    if (trainingState === 'playing-dealer' || trainingState === 'hand-complete' || trainingState === 'session-complete') {
      return dealerHand;
    }
    const cards: Card[] = [];
    if (dealerUpCard) cards.push(dealerUpCard);
    if (dealerHoleCard) cards.push(dealerHoleCard);
    return { cards };
  };

  const isFallbackMode = trainingState === 'deciding-fallback';
  const isSplitInProgress = playerHands.length > 1;
  const isHandComplete = trainingState === 'hand-complete';

  // Get dealer value for results
  const dealerValue = evaluateHand(dealerHand.cards);

  // Get outcome for a single hand
  const getHandOutcome = (hand: BlackjackHand): { text: string; color: string } => {
    const playerValue = evaluateHand(hand.cards);
    if (playerValue.isBust) return { text: 'Bust', color: '#ef4444' };
    if (playerValue.isBlackjack && !dealerValue.isBlackjack) return { text: 'Blackjack!', color: '#22c55e' };
    if (dealerValue.isBust) return { text: 'Win', color: '#22c55e' };
    if (playerValue.best > dealerValue.best) return { text: 'Win', color: '#22c55e' };
    if (playerValue.best < dealerValue.best) return { text: 'Lose', color: '#ef4444' };
    return { text: 'Push', color: '#eab308' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* Progress bar */}
      {trainingState !== 'idle' && trainingState !== 'session-complete' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ProgressBar current={stats.total} target={SESSION_DECISIONS_TARGET} />
          <div style={{ display: 'flex', gap: 24, fontSize: 14, color: '#9ca3af' }}>
            <span>Decisions: {stats.correct}/{stats.total}</span>
            {stats.total > 0 && (
              <span>Accuracy: {Math.round((stats.correct / stats.total) * 100)}%</span>
            )}
          </div>
        </div>
      )}

      {/* Training Area */}
      <div style={{
        minHeight: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        position: 'relative',
      }}>
        {/* Idle state */}
        {trainingState === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', marginBottom: 16 }}>
              Practice optimal blackjack decisions.<br />
              Make the correct play for each situation.
            </p>
            <button onClick={startTraining} style={BUTTON_STYLES.primary}>
              Start Training
            </button>
          </div>
        )}

        {/* Show hands during play */}
        {trainingState !== 'idle' && trainingState !== 'session-complete' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
            {/* Dealer hand */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#6b7280', fontSize: 12 }}>Dealer</span>
              <Hand
                hand={getDealerDisplayHand()}
                showValue={false}
                size="md"
                hideEmptyState
                countingSystem={HiLoSystem}
                showOverlays={countScaffolding === 'bold' || countScaffolding === 'subtle'}
                overlayIntensity={countScaffolding === 'none' ? 'none' : countScaffolding === 'flash' ? 'subtle' : countScaffolding}
                flashIndex={countScaffolding === 'flash' ? dealerFlashIndex : -1}
              />
              {isHandComplete && dealerHand.cards.length > 0 && (
                <span style={{
                  color: dealerValue.isBust ? '#ef4444' : '#e5e7eb',
                  fontSize: 14,
                  fontWeight: 600,
                }}>
                  {dealerValue.isBust ? 'Bust!' : dealerValue.best}
                </span>
              )}
            </div>

            {/* Player hands */}
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
              {playerHands.map((hand, index) => {
                const isActive = index === activeHandIndex;
                const handValue = evaluateHand(hand.cards);
                const outcome = getHandOutcome(hand);

                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: 8,
                      borderRadius: 8,
                      border: isActive && isSplitInProgress && trainingState !== 'hand-complete' && trainingState !== 'playing-dealer'
                        ? '2px solid #d4af37'
                        : '2px solid transparent',
                    }}
                  >
                    <span style={{ color: '#6b7280', fontSize: 12 }}>
                      {isSplitInProgress ? `Hand ${index + 1}` : 'Your hand'}
                    </span>
                    <Hand
                      hand={hand}
                      showValue={false}
                      size="lg"
                      hideEmptyState
                      countingSystem={HiLoSystem}
                      showOverlays={countScaffolding === 'bold' || countScaffolding === 'subtle'}
                      overlayIntensity={countScaffolding === 'none' ? 'none' : countScaffolding === 'flash' ? 'subtle' : countScaffolding}
                      flashIndex={countScaffolding === 'flash' ? (playerFlashIndices[index] ?? -1) : -1}
                    />
                    {isHandComplete && hand.cards.length > 0 && (
                      <span style={{
                        color: outcome.color,
                        fontSize: 14,
                        fontWeight: 600,
                      }}>
                        {handValue.best} - {outcome.text}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback area - fixed height to prevent layout shift */}
        <div style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {feedback && (
            <div style={{
              padding: '8px 24px',
              borderRadius: 8,
              backgroundColor: feedback.isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: `2px solid ${feedback.isCorrect ? '#22c55e' : '#ef4444'}`,
              whiteSpace: 'nowrap',
            }}>
              <span style={{
                color: feedback.isCorrect ? '#22c55e' : '#ef4444',
                fontSize: 18,
                fontWeight: 600,
              }}>
                {feedback.text}
              </span>
            </div>
          )}
        </div>

        {/* Decision buttons area - fixed height to prevent layout shift */}
        <div style={{ minHeight: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {(trainingState === 'deciding' || trainingState === 'deciding-fallback') && dealerUpCard && (
            <DecisionButtons
              onSelect={isFallbackMode ? handleFallbackDecision : handleDecision}
              correctAction={isFallbackMode ? null : correctAction}
              scaffolding="none"
              showHint={false}
              canDouble={!isFallbackMode && canDoubleDown(activeHand)}
              canSplit={!isFallbackMode && canSplit(activeHand)}
            />
          )}
        </div>

        {/* Playing indicator */}
        {trainingState === 'playing-dealer' && (
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            Dealer playing...
          </p>
        )}

        {/* Hand complete */}
        {trainingState === 'hand-complete' && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleContinue}
              style={BUTTON_STYLES.secondary}
            >
              {stats.total >= SESSION_DECISIONS_TARGET ? 'Finish Session' : 'Next Hand'}
            </button>
          </div>
        )}

        {/* Session complete */}
        {trainingState === 'session-complete' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#d4af37', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              Session Complete!
            </p>

            <div style={{
              backgroundColor: '#1f2937',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
              minWidth: 280,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Decisions:</span>
                  <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{stats.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Accuracy:</span>
                  <span style={{
                    color: (stats.correct / stats.total) >= 0.8 ? '#22c55e' : '#ef4444',
                    fontWeight: 600,
                  }}>
                    {Math.round((stats.correct / stats.total) * 100)}%
                  </span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #374151', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Current Streak:</span>
                  <span style={{ color: '#d4af37', fontWeight: 600 }}>{streakCurrent}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Best Streak:</span>
                  <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{streakBest}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Total (All Time):</span>
                  <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{totalHandsCounted}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={handleNewSession} style={BUTTON_STYLES.primary}>
                New Session
              </button>
              <button onClick={handleReset} style={BUTTON_STYLES.tertiary}>
                Change Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings - only in idle */}
      {trainingState === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          {/* Speed control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#9ca3af', fontSize: 14, minWidth: 80 }}>Speed:</span>
            <input
              type="range"
              min={200}
              max={1200}
              step={100}
              value={dealSpeed}
              onChange={e => setDealSpeed(Number(e.target.value))}
              style={{ width: 150 }}
            />
            <span style={{ color: '#9ca3af', fontSize: 14, minWidth: 50 }}>
              {(dealSpeed / 1000).toFixed(1)}s
            </span>
          </div>

          {/* Count scaffolding - card counting overlay helpers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#9ca3af', fontSize: 14, minWidth: 100 }}>Count Helpers:</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['bold', 'subtle', 'flash', 'none'] as ScaffoldingLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => setCountScaffolding(level)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: countScaffolding === level ? '#d4af37' : '#1f2937',
                    color: countScaffolding === level ? '#0d1117' : '#9ca3af',
                    fontWeight: 500,
                    fontSize: 13,
                    borderRadius: 6,
                    border: countScaffolding === level ? 'none' : '1px solid #374151',
                    cursor: 'pointer',
                  }}
                >
                  {SCAFFOLDING_LABELS[level]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reset button */}
      {trainingState !== 'idle' && trainingState !== 'session-complete' && trainingState !== 'hand-complete' && (
        <button onClick={handleReset} style={BUTTON_STYLES.reset}>
          Reset
        </button>
      )}
    </div>
  );
}

export default BasicStrategyTrainer;
