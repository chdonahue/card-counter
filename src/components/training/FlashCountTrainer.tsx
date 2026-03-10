import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Shoe } from '../cards';
import { CountChoices } from '../ui';
import type { Card as CardType } from '../../types/card';
import type { Shoe as ShoeType } from '../../core/card/Shoe';
import { createShoe, dealCard, getDecksRemaining, DEFAULT_SHOE_CONFIG } from '../../core/card/Shoe';
import { HiLoSystem, getCountOverlay, calculateTrueCount } from '../../core/counting';
import { useProgressStore, type SessionStats } from '../../stores/useProgressStore';
import { useFlashMode } from '../../hooks/useFlashMode';
import { COLORS } from '../../constants/colors';
import { TIMING } from '../../constants/timing';
import {
  type ScaffoldingLevel,
  BUTTON_STYLES,
  getOverlaySettings,
  Legend,
  ProgressBar,
  SpeedControl,
  ScaffoldingControl,
  ToggleControl,
  TrainingSettingsPanel,
  SessionCompleteStats,
} from './shared';

type TrainingState = 'idle' | 'dealing' | 'asking-count' | 'feedback-count' | 'asking-true-count' | 'feedback' | 'session-complete';

// Shoe reading difficulty: how much help you get estimating decks remaining
type ShoeReadingLevel = 'easy' | 'medium' | 'hard';

const SESSION_ROUNDS_TARGET = 20;
const DEFAULT_CARDS_PER_ROUND = 10;

interface TrainerStats {
  countCorrect: number;
  trueCountCorrect: number;
  roundsCompleted: number;
}

export function FlashCountTrainer() {
  const [currentCard, setCurrentCard] = useState<CardType | null>(null);
  const [cardsDealt, setCardsDealt] = useState<CardType[]>([]);
  const [trainingState, setTrainingState] = useState<TrainingState>('idle');
  // Session running count - accumulates in true count mode, resets each round otherwise
  const [sessionCount, setSessionCount] = useState<number>(0);
  // This round's count - always just the current round's cards
  const [roundCount, setRoundCount] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedTrueCount, setSelectedTrueCount] = useState<number | null>(null);
  const [stats, setStats] = useState<TrainerStats>({ countCorrect: 0, trueCountCorrect: 0, roundsCompleted: 0 });
  const [dealSpeed, setDealSpeed] = useState<number>(500);
  const [scaffolding, setScaffolding] = useState<ScaffoldingLevel>('bold');
  const [cardsPerRound, setCardsPerRound] = useState<number>(DEFAULT_CARDS_PER_ROUND);
  const [askTrueCount, setAskTrueCount] = useState<boolean>(false);
  const [shoeReading, setShoeReading] = useState<ShoeReadingLevel>('easy');
  const [completedSession, setCompletedSession] = useState<SessionStats | null>(null);

  // Shoe state - both ref (for dealing) and state (for display)
  const shoeRef = useRef<ShoeType>(createShoe(DEFAULT_SHOE_CONFIG));
  const [shoeDisplay, setShoeDisplay] = useState<ShoeType>(() => shoeRef.current);

  // Track for true count calculation at time of asking
  const [decksRemainingAtAsk, setDecksRemainingAtAsk] = useState<number>(6);

  // The count we ask about depends on mode
  const correctCount = askTrueCount ? sessionCount : roundCount;

  // Track card index for flash mode
  const cardIndexRef = useRef<number>(0);

  // Flash mode hook
  const flashingCardIndex = useFlashMode({
    scaffolding,
    isActive: trainingState === 'dealing',
    triggerValue: cardIndexRef.current,
  });

  // Progress store
  const { startSession, recordHandComplete, endSession, totalHandsCounted, streakCurrent, streakBest } = useProgressStore();

  // Calculate overlay settings
  const overlaySettings = getOverlaySettings(scaffolding, flashingCardIndex);
  const shouldShowOverlay = trainingState === 'dealing' && overlaySettings.showOverlays;

  // Calculate correct true count (rounded to nearest integer for simplicity)
  const correctTrueCount = Math.round(calculateTrueCount(sessionCount, decksRemainingAtAsk));

  // Deal one card
  const dealOneCard = useCallback(() => {
    let result = dealCard(shoeRef.current);
    if (!result) {
      const newShoe = createShoe(DEFAULT_SHOE_CONFIG);
      result = dealCard(newShoe);
      if (!result) return null;
    }
    shoeRef.current = result.updatedShoe;
    setShoeDisplay(result.updatedShoe);
    return result.card;
  }, []);

  // Start a new round
  const startNewRound = useCallback((isFirstRound: boolean = false) => {
    if (isFirstRound) {
      // Reset shoe and session count for new session
      const newShoe = createShoe(DEFAULT_SHOE_CONFIG);
      shoeRef.current = newShoe;
      setShoeDisplay(newShoe);
      setSessionCount(0);
      startSession('flash-count', {
        scaffolding,
        speed: dealSpeed,
        askTotal: askTrueCount,
        deckCount: DEFAULT_SHOE_CONFIG.deckCount,
      });
    }
    setCurrentCard(null);
    setCardsDealt([]);
    setRoundCount(0);
    // Only reset session count if NOT in true count mode
    if (!askTrueCount) {
      setSessionCount(0);
    }
    setSelectedAnswer(null);
    setSelectedTrueCount(null);
    cardIndexRef.current = 0;
    setTrainingState('dealing');
  }, [startSession, scaffolding, dealSpeed, askTrueCount]);

  // Auto-deal effect with brief gap between cards
  useEffect(() => {
    if (trainingState !== 'dealing') return;

    const gapDuration = TIMING.GAP_BETWEEN_CARDS;
    const isFirstCard = cardsDealt.length === 0;

    if (cardsDealt.length >= cardsPerRound) {
      const timer = setTimeout(() => {
        setCurrentCard(null);
        // Capture decks remaining at time of asking
        setDecksRemainingAtAsk(getDecksRemaining(shoeRef.current));
        // Always ask running count first (in true count mode, we'll ask true count after)
        setTrainingState('asking-count');
      }, dealSpeed);
      return () => clearTimeout(timer);
    }

    // Clear current card briefly before showing next (creates dealing rhythm)
    const gapTimer = !isFirstCard ? setTimeout(() => {
      setCurrentCard(null);
    }, dealSpeed - gapDuration) : null;

    // Deal the next card
    const dealTimer = setTimeout(() => {
      const card = dealOneCard();
      if (card) {
        const faceUpCard = { ...card, faceUp: true };
        const cardValue = HiLoSystem.getCountValue(faceUpCard.rank);
        setCurrentCard(faceUpCard);
        setCardsDealt(prev => [...prev, faceUpCard]);
        setRoundCount(prev => prev + cardValue);
        setSessionCount(prev => prev + cardValue);
        cardIndexRef.current += 1;
      }
    }, isFirstCard ? TIMING.FIRST_CARD_DELAY : dealSpeed);

    return () => {
      if (gapTimer) clearTimeout(gapTimer);
      clearTimeout(dealTimer);
    };
  }, [trainingState, cardsDealt.length, cardsPerRound, dealSpeed, dealOneCard]);

  // Handle running count answer
  const handleCountAnswer = (answer: number) => {
    setSelectedAnswer(answer);
    if (askTrueCount) {
      // Show immediate feedback, then ask true count
      setTrainingState('feedback-count');
    } else {
      finishRound(answer === correctCount, null);
    }
  };

  // Auto-advance from running count feedback to true count question
  useEffect(() => {
    if (trainingState !== 'feedback-count') return;
    const timer = setTimeout(() => {
      setTrainingState('asking-true-count');
    }, TIMING.FEEDBACK_AUTO_ADVANCE);
    return () => clearTimeout(timer);
  }, [trainingState]);

  // Handle true count answer (second question in true count mode)
  const handleTrueCountAnswer = (answer: number) => {
    setSelectedTrueCount(answer);
    // selectedAnswer has the running count answer from the previous step
    const runningCountCorrect = selectedAnswer === correctCount;
    finishRound(runningCountCorrect, answer === correctTrueCount);
  };

  // Finish a round
  const finishRound = (countCorrect: boolean, trueCountCorrect: boolean | null) => {
    const newStats = {
      countCorrect: stats.countCorrect + (countCorrect ? 1 : 0),
      trueCountCorrect: stats.trueCountCorrect + (trueCountCorrect ? 1 : 0),
      roundsCompleted: stats.roundsCompleted + 1,
    };
    setStats(newStats);
    recordHandComplete(countCorrect, trueCountCorrect ?? undefined);

    if (newStats.roundsCompleted >= SESSION_ROUNDS_TARGET) {
      const session = endSession();
      setCompletedSession(session);
      setTrainingState('session-complete');
    } else {
      setTrainingState('feedback');
    }
  };

  const handleNext = () => startNewRound(false);

  const handleReset = () => {
    if (stats.roundsCompleted > 0) endSession();
    setTrainingState('idle');
    setCurrentCard(null);
    setCardsDealt([]);
    setSessionCount(0);
    setRoundCount(0);
    setSelectedAnswer(null);
    setSelectedTrueCount(null);
    setStats({ countCorrect: 0, trueCountCorrect: 0, roundsCompleted: 0 });
    setCompletedSession(null);
    // Reset shoe
    const newShoe = createShoe(DEFAULT_SHOE_CONFIG);
    shoeRef.current = newShoe;
    setShoeDisplay(newShoe);
  };

  const handleNewSession = () => {
    setStats({ countCorrect: 0, trueCountCorrect: 0, roundsCompleted: 0 });
    setCompletedSession(null);
    startNewRound(true);
  };

  const isCountCorrect = selectedAnswer === correctCount;
  const isTrueCountCorrect = selectedTrueCount === correctTrueCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* Progress */}
      {trainingState !== 'idle' && trainingState !== 'session-complete' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ProgressBar current={stats.roundsCompleted} target={SESSION_ROUNDS_TARGET} />
          <div style={{ display: 'flex', gap: 24, fontSize: 14, color: COLORS.text.secondary }}>
            <span>Rounds: {stats.countCorrect}/{stats.roundsCompleted}</span>
            {stats.roundsCompleted > 0 && (
              <span>Accuracy: {Math.round((stats.countCorrect / stats.roundsCompleted) * 100)}%</span>
            )}
          </div>
        </div>
      )}

      {/* Main training area with shoe */}
      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
        {/* Shoe display - show during dealing and questions */}
        {trainingState !== 'idle' && trainingState !== 'session-complete' && (
          <Shoe
            shoe={shoeDisplay}
            showDeckMarkers={shoeReading !== 'hard'}
            showDecksRemaining={shoeReading === 'easy'}
          />
        )}

        {/* Training content */}
        <div style={{
          minHeight: 220,
          minWidth: 280,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}>
          {/* Idle state */}
          {trainingState === 'idle' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: COLORS.text.secondary, marginBottom: 16 }}>
                Cards will flash one at a time. Track the running count.
              </p>
              <button onClick={() => startNewRound(true)} style={BUTTON_STYLES.primary}>
                Start Training
              </button>
            </div>
          )}

          {/* Dealing state */}
          {trainingState === 'dealing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 14, color: COLORS.text.secondary }}>
                Card {cardsDealt.length} of {cardsPerRound}
              </div>
              <div style={{ width: 113, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {currentCard && (
                  <Card
                    key={currentCard.id}
                    card={currentCard}
                    overlay={shouldShowOverlay ? getCountOverlay(HiLoSystem.getCountValue(currentCard.rank)) : 'none'}
                    overlayIntensity={scaffolding}
                    size="lg"
                    noAnimation
                  />
                )}
              </div>
            </div>
          )}

          {/* Asking running count */}
          {trainingState === 'asking-count' && (
            <CountChoices
              correctAnswer={correctCount}
              onSelect={handleCountAnswer}
              label={askTrueCount ? "What's the running count?" : "What was the count?"}
            />
          )}

          {/* Immediate feedback on running count - flashes briefly then auto-advances */}
          {trainingState === 'feedback-count' && (
            <div style={{ textAlign: 'center' }}>
              {isCountCorrect ? (
                <p style={{ color: COLORS.feedback.success, fontSize: 28, fontWeight: 600 }}>
                  ✓
                </p>
              ) : (
                <div>
                  <p style={{ color: COLORS.feedback.error, fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
                    ✗
                  </p>
                  <p style={{ color: COLORS.text.secondary, fontSize: 16, margin: 0 }}>
                    RC: {correctCount > 0 ? `+${correctCount}` : correctCount}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Asking true count */}
          {trainingState === 'asking-true-count' && (
            <CountChoices
              correctAnswer={correctTrueCount}
              onSelect={handleTrueCountAnswer}
              label="What's the true count?"
            />
          )}

          {/* Feedback state */}
          {trainingState === 'feedback' && (
            <div style={{ textAlign: 'center' }}>
              {/* True count mode feedback - only show true count result (running count already shown) */}
              {askTrueCount ? (
                <>
                  {isTrueCountCorrect ? (
                    <p style={{ color: COLORS.feedback.success, fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
                      Correct!
                    </p>
                  ) : (
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ color: COLORS.feedback.error, fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
                        Incorrect
                      </p>
                      <p style={{ color: COLORS.text.secondary, fontSize: 16, margin: 0 }}>
                        True count was {correctTrueCount > 0 ? `+${correctTrueCount}` : correctTrueCount}
                      </p>
                    </div>
                  )}
                  {/* Show summary for recalibration */}
                  <div style={{
                    backgroundColor: COLORS.background.card,
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 12,
                    marginBottom: 12,
                  }}>
                    <p style={{ color: COLORS.text.primary, fontSize: 14, margin: 0 }}>
                      RC: {sessionCount > 0 ? `+${sessionCount}` : sessionCount} ÷ {decksRemainingAtAsk.toFixed(1)} decks = TC: {correctTrueCount > 0 ? `+${correctTrueCount}` : correctTrueCount}
                    </p>
                  </div>
                </>
              ) : (
                /* Simple count mode feedback */
                isCountCorrect ? (
                  <p style={{ color: COLORS.feedback.success, fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
                    Correct!
                  </p>
                ) : (
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ color: COLORS.feedback.error, fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
                      Incorrect
                    </p>
                    <p style={{ color: COLORS.text.secondary, fontSize: 16, margin: 0 }}>
                      The count was {correctCount > 0 ? `+${correctCount}` : correctCount}
                    </p>
                  </div>
                )
              )}

              {/* Show cards from round */}
              <div style={{
                marginTop: 20,
                marginBottom: 20,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                justifyContent: 'center',
                maxWidth: 400,
              }}>
                {cardsDealt.map((card, i) => (
                  <Card
                    key={`${card.rank}-${card.suit}-${i}`}
                    card={card}
                    overlay={getCountOverlay(HiLoSystem.getCountValue(card.rank))}
                    overlayIntensity="bold"
                    size="sm"
                  />
                ))}
              </div>

              <button onClick={handleNext} style={BUTTON_STYLES.secondary}>
                Next Round
              </button>
            </div>
          )}

          {/* Session complete */}
          {trainingState === 'session-complete' && completedSession && (
            <SessionCompleteStats
              stats={[
                { label: 'Rounds', value: completedSession.handsCompleted },
                {
                  label: 'Count Accuracy',
                  value: `${Math.round((completedSession.countCorrect / completedSession.countTotal) * 100)}%`,
                  color: (completedSession.countCorrect / completedSession.countTotal) >= 0.8
                    ? COLORS.feedback.success
                    : COLORS.feedback.error,
                },
                ...(askTrueCount ? [{
                  label: 'True Count Accuracy',
                  value: `${Math.round((completedSession.totalCorrect / completedSession.totalQuestions) * 100)}%`,
                }] : []),
              ]}
              globalStats={{ streakCurrent, streakBest, totalHandsCounted }}
              onNewSession={handleNewSession}
              onChangeSettings={handleReset}
            />
          )}
        </div>
      </div>

      {/* Settings */}
      {trainingState === 'idle' && (
        <TrainingSettingsPanel>
          <SpeedControl speed={dealSpeed} onChange={setDealSpeed} min={200} max={1000} label="Card Speed" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ color: COLORS.text.secondary, fontSize: 14, minWidth: 100 }}>Cards/Round</label>
            <input
              type="range"
              min={5}
              max={52}
              value={cardsPerRound}
              onChange={(e) => setCardsPerRound(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ color: COLORS.text.primary, fontSize: 14, minWidth: 24 }}>{cardsPerRound}</span>
          </div>
          <ScaffoldingControl level={scaffolding} onChange={setScaffolding} />
          <ToggleControl
            label="True Count"
            value={askTrueCount}
            onChange={setAskTrueCount}
            hint="track running count across rounds"
          />
          {/* Shoe reading difficulty - only shown in true count mode */}
          {askTrueCount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: COLORS.text.secondary, fontSize: 14, minWidth: 80 }}>
                Shoe Reading
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['easy', 'medium', 'hard'] as ShoeReadingLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setShoeReading(level)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: shoeReading === level ? COLORS.gold.primary : COLORS.background.card,
                      color: shoeReading === level ? COLORS.text.inverse : COLORS.text.secondary,
                      fontWeight: 500,
                      fontSize: 13,
                      borderRadius: 6,
                      border: shoeReading === level ? 'none' : `1px solid ${COLORS.background.border}`,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}
        </TrainingSettingsPanel>
      )}

      {/* Reset button */}
      {trainingState !== 'idle' && (
        <button onClick={handleReset} style={BUTTON_STYLES.reset}>
          Reset
        </button>
      )}

      <Legend />
    </div>
  );
}

export default FlashCountTrainer;
