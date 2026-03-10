import { useState, useEffect, useCallback, useRef } from 'react';
import { Hand } from '../cards';
import { CountChoices } from '../ui';
import type { BlackjackHand } from '../../core/blackjack';
import type { Shoe as ShoeType } from '../../core/card/Shoe';
import type { Card } from '../../types/card';
import { createHand, addCardToHand, evaluateHand } from '../../core/blackjack';
import { createShoe, dealCard, DEFAULT_SHOE_CONFIG } from '../../core/card/Shoe';
import { HiLoSystem } from '../../core/counting';
import { useProgressStore } from '../../stores/useProgressStore';
import { TIMING } from '../../constants/timing';
import {
  type ScaffoldingLevel,
  SCAFFOLDING_LABELS,
  BUTTON_STYLES,
  Legend,
  ProgressBar,
} from './shared';

type TrainingState = 'idle' | 'dealing' | 'asking-count' | 'feedback' | 'session-complete';

const SESSION_ROUNDS_TARGET = 10;
const MAX_PLAYERS = 7;
const MIN_PLAYERS = 1;

// Timing multipliers (relative to base dealSpeed)
const DEAL_MULTIPLIERS = {
  cardDeal: 1,           // Base timing for dealing each card
  pauseAfterDeal: 2,     // Pause after initial deal before playing
  pauseBetweenHands: 1.5, // Pause between each player's turn
  dealerFlip: 1.5,       // Pause when dealer flips hole card
};

type DealingPhase =
  | 'first-round'
  | 'second-round'
  | 'pause-after-deal'
  | 'playing-hands'
  | 'pause-between-hands'
  | 'dealer-flip'
  | 'dealer-play'
  | 'complete';

interface DealingState {
  phase: DealingPhase;
  currentPosition: number;
  currentHand: number;
}

export function MultiPositionTrainer() {
  const [shoe, setShoe] = useState<ShoeType>(() => createShoe(DEFAULT_SHOE_CONFIG));
  const [playerHands, setPlayerHands] = useState<BlackjackHand[]>([]);
  const [dealerHand, setDealerHand] = useState<BlackjackHand>(() => createHand());
  const [trainingState, setTrainingState] = useState<TrainingState>('idle');
  const [dealingState, setDealingState] = useState<DealingState>({ phase: 'first-round', currentPosition: 0, currentHand: 0 });

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [dealSpeed, setDealSpeed] = useState<number>(600);
  const [scaffolding, setScaffolding] = useState<ScaffoldingLevel>('bold');
  const [numPlayers, setNumPlayers] = useState<number>(3);
  const [flashingPosition, setFlashingPosition] = useState<number>(-1);

  // Track running count incrementally
  const runningCountRef = useRef<number>(0);

  // Stats
  const [roundsCompleted, setRoundsCompleted] = useState<number>(0);
  const [roundsCorrect, setRoundsCorrect] = useState<number>(0);

  // Session tracking
  const { startSession, recordHandComplete, endSession, totalHandsCounted, streakCurrent, streakBest } = useProgressStore();

  // Check if a hand should stop (17+ or bust)
  const shouldStopHand = (hand: BlackjackHand): boolean => {
    if (hand.cards.length < 2) return false;
    const value = evaluateHand(hand.cards);
    return value.best >= 17 || value.isBust;
  };

  // Add to running count when a card is dealt
  const addCardToCount = useCallback((card: Card) => {
    if (card.faceUp) {
      const countValue = HiLoSystem.getCountValue(card.rank);
      runningCountRef.current += countValue;
    }
  }, []);

  // Initialize hands for a new round
  const initializeRound = useCallback(() => {
    const hands: BlackjackHand[] = [];
    for (let i = 0; i < numPlayers; i++) {
      hands.push(createHand());
    }
    setPlayerHands(hands);
    setDealerHand(createHand());
    runningCountRef.current = 0;
    setDealingState({ phase: 'first-round', currentPosition: 0, currentHand: 0 });
  }, [numPlayers]);

  // Deal one card to current position
  const dealToCurrentPosition = useCallback(() => {
    const result = dealCard(shoe);
    if (!result) {
      const newShoe = createShoe(DEFAULT_SHOE_CONFIG);
      setShoe(newShoe);
      return null;
    }

    setShoe(result.updatedShoe);
    const { currentPosition, phase } = dealingState;

    if (currentPosition < numPlayers) {
      // Deal to player - always face up
      const card: Card = { ...result.card, faceUp: true };
      addCardToCount(card);
      setPlayerHands(prev => {
        const newHands = [...prev];
        newHands[currentPosition] = addCardToHand(newHands[currentPosition], card);
        return newHands;
      });
      return card;
    } else {
      // Deal to dealer - first card face up, second face down
      const card: Card = {
        ...result.card,
        faceUp: phase === 'first-round',
      };
      if (card.faceUp) {
        addCardToCount(card);
      }
      setDealerHand(prev => addCardToHand(prev, card));
      return card;
    }
  }, [shoe, dealingState, numPlayers, addCardToCount]);

  // Deal a hit card to a specific hand
  const dealHitCard = useCallback((handIndex: number) => {
    const result = dealCard(shoe);
    if (!result) {
      const newShoe = createShoe(DEFAULT_SHOE_CONFIG);
      setShoe(newShoe);
      return null;
    }

    setShoe(result.updatedShoe);
    const card: Card = { ...result.card, faceUp: true };
    addCardToCount(card);

    setPlayerHands(prev => {
      const newHands = [...prev];
      newHands[handIndex] = addCardToHand(newHands[handIndex], card);
      return newHands;
    });

    return card;
  }, [shoe, addCardToCount]);

  // Deal to dealer
  const dealToDealer = useCallback(() => {
    const result = dealCard(shoe);
    if (!result) {
      const newShoe = createShoe(DEFAULT_SHOE_CONFIG);
      setShoe(newShoe);
      return null;
    }

    setShoe(result.updatedShoe);
    const card: Card = { ...result.card, faceUp: true };
    addCardToCount(card);
    setDealerHand(prev => addCardToHand(prev, card));
    return card;
  }, [shoe, addCardToCount]);

  // Flip dealer's hole card
  const flipDealerHoleCard = useCallback(() => {
    // Count the hole card BEFORE the state update to avoid React Strict Mode double-counting
    const holeCard = dealerHand.cards.find(c => !c.faceUp);
    if (holeCard) {
      const countValue = HiLoSystem.getCountValue(holeCard.rank);
      runningCountRef.current += countValue;
    }

    // Now flip all cards to face up
    setDealerHand(prev => ({
      ...prev,
      cards: prev.cards.map(c => ({ ...c, faceUp: true })),
    }));
  }, [dealerHand.cards]);

  // Start training
  const startTraining = useCallback(() => {
    startSession('multi-position', {
      scaffolding,
      speed: dealSpeed,
      askTotal: false,
      deckCount: DEFAULT_SHOE_CONFIG.deckCount,
    });
    setRoundsCompleted(0);
    setRoundsCorrect(0);
    initializeRound();
    setTrainingState('dealing');
  }, [startSession, scaffolding, dealSpeed, initializeRound]);

  // Flash effect for scaffolding
  useEffect(() => {
    if (scaffolding !== 'flash' || trainingState !== 'dealing') return;

    const pos = dealingState.currentPosition;
    setFlashingPosition(pos);

    const timer = setTimeout(() => {
      setFlashingPosition(-1);
    }, TIMING.FLASH_OVERLAY_DURATION);

    return () => clearTimeout(timer);
  }, [playerHands, dealerHand.cards.length, scaffolding, trainingState, dealingState.currentPosition]);

  // Main dealing state machine
  useEffect(() => {
    if (trainingState !== 'dealing') return;

    const { phase, currentPosition, currentHand } = dealingState;

    // Calculate timing based on phase
    let timing = dealSpeed;
    if (phase === 'pause-after-deal') timing = dealSpeed * DEAL_MULTIPLIERS.pauseAfterDeal;
    else if (phase === 'pause-between-hands') timing = dealSpeed * DEAL_MULTIPLIERS.pauseBetweenHands;
    else if (phase === 'dealer-flip') timing = dealSpeed * DEAL_MULTIPLIERS.dealerFlip;

    const timer = setTimeout(() => {
      // Initial dealing rounds
      if (phase === 'first-round' || phase === 'second-round') {
        dealToCurrentPosition();

        const nextPosition = currentPosition + 1;
        const totalPositions = numPlayers + 1;

        if (nextPosition >= totalPositions) {
          if (phase === 'first-round') {
            setDealingState({ phase: 'second-round', currentPosition: 0, currentHand: 0 });
          } else {
            // Pause before playing out hands
            setDealingState({ phase: 'pause-after-deal', currentPosition: 0, currentHand: 0 });
          }
        } else {
          setDealingState(prev => ({ ...prev, currentPosition: nextPosition }));
        }
      }

      // Pause after initial deal
      else if (phase === 'pause-after-deal') {
        setDealingState({ phase: 'playing-hands', currentPosition: 0, currentHand: 0 });
      }

      // Playing out each hand
      else if (phase === 'playing-hands') {
        if (currentHand < numPlayers) {
          const hand = playerHands[currentHand];

          if (shouldStopHand(hand)) {
            // Hand is done (standing or busted), move to next with pause
            setDealingState(prev => ({ ...prev, phase: 'pause-between-hands' }));
          } else {
            // Deal another card
            dealHitCard(currentHand);
          }
        } else {
          // All players done, dealer's turn
          // First flip the hole card
          if (dealerHand.cards.some(c => !c.faceUp)) {
            setDealingState(prev => ({ ...prev, phase: 'dealer-flip' }));
          } else {
            setDealingState(prev => ({ ...prev, phase: 'dealer-play' }));
          }
        }
      }

      // Pause between hands
      else if (phase === 'pause-between-hands') {
        const nextHand = currentHand + 1;
        if (nextHand < numPlayers) {
          setDealingState({ phase: 'playing-hands', currentPosition: 0, currentHand: nextHand });
        } else {
          // Move to dealer
          if (dealerHand.cards.some(c => !c.faceUp)) {
            setDealingState(prev => ({ ...prev, phase: 'dealer-flip', currentHand: nextHand }));
          } else {
            setDealingState(prev => ({ ...prev, phase: 'dealer-play', currentHand: nextHand }));
          }
        }
      }

      // Dealer flips hole card
      else if (phase === 'dealer-flip') {
        flipDealerHoleCard();
        setDealingState(prev => ({ ...prev, phase: 'dealer-play' }));
      }

      // Dealer plays
      else if (phase === 'dealer-play') {
        if (!shouldStopHand(dealerHand)) {
          dealToDealer();
        } else {
          // Round complete!
          setDealingState(prev => ({ ...prev, phase: 'complete' }));
          setTrainingState('asking-count');
        }
      }
    }, timing);

    return () => clearTimeout(timer);
  }, [trainingState, dealingState, dealToCurrentPosition, dealHitCard, dealToDealer, flipDealerHoleCard, numPlayers, playerHands, dealerHand, dealSpeed]);

  // Handle answer
  const handleAnswer = (answer: number) => {
    setSelectedAnswer(answer);
    const isCorrect = answer === runningCountRef.current;

    const newRoundsCompleted = roundsCompleted + 1;
    setRoundsCompleted(newRoundsCompleted);
    if (isCorrect) {
      setRoundsCorrect(prev => prev + 1);
    }

    for (let i = 0; i < numPlayers; i++) {
      recordHandComplete(isCorrect);
    }

    if (newRoundsCompleted >= SESSION_ROUNDS_TARGET) {
      endSession();
      setTrainingState('session-complete');
    } else {
      setTrainingState('feedback');
    }
  };

  // Continue to next round
  const handleContinue = () => {
    setSelectedAnswer(null);
    initializeRound();
    setTrainingState('dealing');
  };

  // Reset
  const handleReset = () => {
    if (roundsCompleted > 0) {
      endSession();
    }
    setTrainingState('idle');
    setPlayerHands([]);
    setDealerHand(createHand());
    setRoundsCompleted(0);
    setRoundsCorrect(0);
    setSelectedAnswer(null);
  };

  // New session
  const handleNewSession = () => {
    startTraining();
  };

  // Get overlay settings - hide colors at verification time
  const getOverlaySettings = (position: number) => {
    // Always hide overlays when asking for count (no recounting allowed)
    if (trainingState === 'asking-count') {
      return { showOverlays: false, intensity: 'none' as const };
    }

    const isFlashing = scaffolding === 'flash' && flashingPosition === position;
    switch (scaffolding) {
      case 'bold':
        return { showOverlays: true, intensity: 'bold' as const };
      case 'subtle':
        return { showOverlays: true, intensity: 'subtle' as const };
      case 'flash':
        return { showOverlays: isFlashing, intensity: 'subtle' as const };
      case 'none':
        return { showOverlays: false, intensity: 'none' as const };
    }
  };

  // Get the correct count for display in feedback
  const correctCount = runningCountRef.current;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* Progress bar */}
      {trainingState !== 'idle' && trainingState !== 'session-complete' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ProgressBar current={roundsCompleted} target={SESSION_ROUNDS_TARGET} unit="rounds" />
          <div style={{ display: 'flex', gap: 24, fontSize: 14, color: '#9ca3af' }}>
            <span>Correct: {roundsCorrect}/{roundsCompleted}</span>
            {roundsCompleted > 0 && (
              <span>Accuracy: {Math.round((roundsCorrect / roundsCompleted) * 100)}%</span>
            )}
          </div>
        </div>
      )}

      {/* Training Area */}
      <div style={{
        minHeight: 300,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}>
        {/* Idle state */}
        {trainingState === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', marginBottom: 16 }}>
              Practice counting across multiple positions.<br />
              Cards are dealt round-robin like a real blackjack table.
            </p>
            <button onClick={startTraining} style={BUTTON_STYLES.primary}>
              Start Training
            </button>
          </div>
        )}

        {/* Dealing / Playing state - Show table */}
        {(trainingState === 'dealing' || trainingState === 'asking-count' || trainingState === 'feedback') && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Dealer */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Hand
                hand={dealerHand}
                countingSystem={HiLoSystem}
                {...getOverlaySettings(numPlayers)}
                showValue={trainingState === 'feedback'}
                size="md"
                label="Dealer"
              />
            </div>

            {/* Players - Arc layout */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: numPlayers <= 4 ? 180 : 280,
              marginTop: 8,
            }}>
              {playerHands.map((hand, index) => {
                // Highlight active hand during play
                const isActive = trainingState === 'dealing' &&
                  dealingState.phase === 'playing-hands' &&
                  dealingState.currentHand === index;

                return (
                  <div
                    key={index}
                    style={{
                      position: 'absolute',
                      left: `${calculateXPosition(index, numPlayers)}%`,
                      top: calculateYPosition(index, numPlayers),
                      transform: 'translateX(-50%)',
                      transition: 'opacity 0.3s ease',
                      ...(isActive && {
                        filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))',
                      }),
                    }}
                  >
                    <Hand
                      hand={hand}
                      countingSystem={HiLoSystem}
                      {...getOverlaySettings(index)}
                      showValue={trainingState === 'feedback'}
                      size="sm"
                      label={`P${index + 1}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Asking for count */}
        {trainingState === 'asking-count' && (
          <div style={{ marginTop: 24 }}>
            <CountChoices
              correctAnswer={correctCount}
              onSelect={handleAnswer}
              label="What's the total count?"
            />
          </div>
        )}

        {/* Feedback */}
        {trainingState === 'feedback' && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            {selectedAnswer === correctCount ? (
              <p style={{ color: '#22c55e', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
                Correct!
              </p>
            ) : (
              <div style={{ marginBottom: 8 }}>
                <p style={{ color: '#ef4444', fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
                  Incorrect
                </p>
                <p style={{ color: '#9ca3af', fontSize: 16 }}>
                  The count was {correctCount > 0 ? `+${correctCount}` : correctCount}
                </p>
              </div>
            )}

            <button
              onClick={handleContinue}
              style={{ ...BUTTON_STYLES.secondary, marginTop: 16 }}
            >
              Next Round
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
                  <span style={{ color: '#9ca3af' }}>Rounds:</span>
                  <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{roundsCompleted}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Players per round:</span>
                  <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{numPlayers}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Accuracy:</span>
                  <span style={{
                    color: (roundsCorrect / roundsCompleted) >= 0.8 ? '#22c55e' : '#ef4444',
                    fontWeight: 600,
                  }}>
                    {Math.round((roundsCorrect / roundsCompleted) * 100)}%
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
                  <span style={{ color: '#9ca3af' }}>Total Hands (All Time):</span>
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
          {/* Number of players */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#9ca3af', fontSize: 14, minWidth: 80 }}>Players:</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map(n => (
                <button
                  key={n}
                  onClick={() => setNumPlayers(n)}
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: numPlayers === n ? '#d4af37' : '#1f2937',
                    color: numPlayers === n ? '#0d1117' : '#9ca3af',
                    fontWeight: 600,
                    fontSize: 14,
                    borderRadius: 6,
                    border: numPlayers === n ? 'none' : '1px solid #374151',
                    cursor: 'pointer',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

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

          {/* Scaffolding level */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#9ca3af', fontSize: 14, minWidth: 80 }}>Helpers:</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['bold', 'subtle', 'flash', 'none'] as ScaffoldingLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => setScaffolding(level)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: scaffolding === level ? '#d4af37' : '#1f2937',
                    color: scaffolding === level ? '#0d1117' : '#9ca3af',
                    fontWeight: 500,
                    fontSize: 13,
                    borderRadius: 6,
                    border: scaffolding === level ? 'none' : '1px solid #374151',
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
      {trainingState !== 'idle' && trainingState !== 'session-complete' && (
        <button onClick={handleReset} style={BUTTON_STYLES.reset}>
          Reset
        </button>
      )}

      <Legend />
    </div>
  );
}

// Helper functions for position calculation
function calculateXPosition(index: number, numPlayers: number): number {
  const isTwoRows = numPlayers > 4;

  let posInRow: number;
  let playersInRow: number;

  if (isTwoRows) {
    const firstRowCount = Math.ceil(numPlayers / 2);
    if (index < firstRowCount) {
      posInRow = index;
      playersInRow = firstRowCount;
    } else {
      posInRow = index - firstRowCount;
      playersInRow = numPlayers - firstRowCount;
    }
  } else {
    posInRow = index;
    playersInRow = numPlayers;
  }

  const horizontalPadding = 0.1;
  const usableWidth = 1 - (horizontalPadding * 2);

  return playersInRow === 1
    ? 50
    : horizontalPadding * 100 + (posInRow / (playersInRow - 1)) * usableWidth * 100;
}

function calculateYPosition(index: number, numPlayers: number): number {
  const isTwoRows = numPlayers > 4;

  if (!isTwoRows) return 0;

  const firstRowCount = Math.ceil(numPlayers / 2);
  return index < firstRowCount ? 0 : 140;
}

export default MultiPositionTrainer;
