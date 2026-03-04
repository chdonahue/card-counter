import { useState, useEffect, useCallback, useRef } from 'react';
import { Hand } from '../cards';
import { CountChoices } from '../ui';
import type { BlackjackHand } from '../../core/blackjack';
import type { Shoe as ShoeType } from '../../core/card/Shoe';
import { createHand, addCardToHand, evaluateHand } from '../../core/blackjack';
import { createShoe, dealCard, DEFAULT_SHOE_CONFIG } from '../../core/card/Shoe';
import { HiLoSystem, calculateRunningCount } from '../../core/counting';
import { useProgressStore, type SessionStats } from '../../stores/useProgressStore';
import {
  type ScaffoldingLevel,
  SCAFFOLDING_LABELS,
  BUTTON_STYLES,
  getOverlaySettings,
  Legend,
  ProgressBar,
} from './shared';

type TrainingState = 'idle' | 'dealing' | 'asking-count' | 'asking-total' | 'feedback' | 'session-complete';

const SESSION_HANDS_TARGET = 20; // Complete 20 hands for a session

interface TrainerStats {
  countCorrect: number;
  totalCorrect: number;
  handsCompleted: number;
}

export function SingleHandTrainer() {
  const [shoe, setShoe] = useState<ShoeType>(() => createShoe(DEFAULT_SHOE_CONFIG));
  const [currentHand, setCurrentHand] = useState<BlackjackHand>(() => createHand());
  const [trainingState, setTrainingState] = useState<TrainingState>('idle');
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [correctTotal, setCorrectTotal] = useState<number>(0);
  const [selectedCountAnswer, setSelectedCountAnswer] = useState<number | null>(null);
  const [selectedTotalAnswer, setSelectedTotalAnswer] = useState<number | null>(null);
  const [stats, setStats] = useState<TrainerStats>({ countCorrect: 0, totalCorrect: 0, handsCompleted: 0 });
  const [dealSpeed, setDealSpeed] = useState<number>(1000); // ms per card
  const [scaffolding, setScaffolding] = useState<ScaffoldingLevel>('bold');
  const [flashingCardIndex, setFlashingCardIndex] = useState<number>(-1);
  const [askHandTotal, setAskHandTotal] = useState<boolean>(false);
  const [completedSession, setCompletedSession] = useState<SessionStats | null>(null);

  // Progress store for persistence
  const { startSession, recordHandComplete, endSession, totalHandsCounted, streakCurrent, streakBest } = useProgressStore();

  // Track when count question was shown for response time
  const countAskTime = useRef<number>(0);

  // Calculate count for current hand
  const handCount = calculateRunningCount(currentHand.cards, HiLoSystem);

  // Check if hand should stop (17+ or bust)
  const handValue = evaluateHand(currentHand.cards);
  const shouldStopDealing = handValue.best >= 17 || handValue.isBust;

  // Calculate overlay settings based on scaffolding level
  const overlaySettings = getOverlaySettings(scaffolding, flashingCardIndex);

  // Deal one card
  const dealOneCard = useCallback(() => {
    const result = dealCard(shoe);
    if (!result) {
      // Shoe empty, reshuffle
      const newShoe = createShoe(DEFAULT_SHOE_CONFIG);
      setShoe(newShoe);
      return false;
    }

    setShoe(result.updatedShoe);
    setCurrentHand(prev => addCardToHand(prev, result.card));
    return true;
  }, [shoe]);

  // Start a new hand
  const startNewHand = useCallback((isFirstHand: boolean = false) => {
    // Start a new session if this is the first hand
    if (isFirstHand) {
      startSession('single-hand-count', {
        scaffolding,
        speed: dealSpeed,
        askTotal: askHandTotal,
        deckCount: DEFAULT_SHOE_CONFIG.deckCount,
      });
    }
    setCurrentHand(createHand());
    setSelectedCountAnswer(null);
    setSelectedTotalAnswer(null);
    setTrainingState('dealing');
  }, [startSession, scaffolding, dealSpeed, askHandTotal]);

  // Flash mode: show overlay briefly on the newest card only
  useEffect(() => {
    if (scaffolding !== 'flash' || trainingState !== 'dealing') return;
    if (currentHand.cards.length === 0) return;

    // Flash the newest card (last index)
    const newestIndex = currentHand.cards.length - 1;
    setFlashingCardIndex(newestIndex);

    const timer = setTimeout(() => {
      setFlashingCardIndex(-1);
    }, 400); // Flash duration

    return () => clearTimeout(timer);
  }, [currentHand.cards.length, scaffolding, trainingState]);

  // Auto-deal effect
  useEffect(() => {
    if (trainingState !== 'dealing') return;

    // If hand should stop, transition to asking-count
    if (shouldStopDealing && currentHand.cards.length >= 2) {
      const timer = setTimeout(() => {
        setCorrectCount(handCount);
        setCorrectTotal(handValue.best);
        countAskTime.current = Date.now(); // Track response time
        setTrainingState('asking-count');
      }, dealSpeed); // Brief pause before hiding
      return () => clearTimeout(timer);
    }

    // Deal next card
    const timer = setTimeout(() => {
      dealOneCard();
    }, currentHand.cards.length === 0 ? 100 : dealSpeed);

    return () => clearTimeout(timer);
  }, [trainingState, shouldStopDealing, currentHand.cards.length, dealSpeed, dealOneCard, handCount, handValue.best]);

  // Handle count answer selection
  const handleCountAnswer = (answer: number) => {
    setSelectedCountAnswer(answer);
    if (askHandTotal) {
      setTrainingState('asking-total');
    } else {
      // Skip to feedback, update stats
      const isCorrect = answer === correctCount;
      const newStats = {
        countCorrect: stats.countCorrect + (isCorrect ? 1 : 0),
        totalCorrect: stats.totalCorrect,
        handsCompleted: stats.handsCompleted + 1,
      };
      setStats(newStats);

      // Record to persistent store
      recordHandComplete(isCorrect);

      // Check if session is complete
      if (newStats.handsCompleted >= SESSION_HANDS_TARGET) {
        const session = endSession();
        setCompletedSession(session);
        setTrainingState('session-complete');
      } else {
        setTrainingState('feedback');
      }
    }
  };

  // Handle hand total answer selection
  const handleTotalAnswer = (answer: number) => {
    setSelectedTotalAnswer(answer);
    const isCountCorrect = selectedCountAnswer === correctCount;
    const isTotalCorrect = answer === correctTotal || (answer === 0 && correctTotal > 21);
    const newStats = {
      countCorrect: stats.countCorrect + (isCountCorrect ? 1 : 0),
      totalCorrect: stats.totalCorrect + (isTotalCorrect ? 1 : 0),
      handsCompleted: stats.handsCompleted + 1,
    };
    setStats(newStats);

    // Record to persistent store
    recordHandComplete(isCountCorrect, isTotalCorrect);

    // Check if session is complete
    if (newStats.handsCompleted >= SESSION_HANDS_TARGET) {
      const session = endSession();
      setCompletedSession(session);
      setTrainingState('session-complete');
    } else {
      setTrainingState('feedback');
    }
  };

  // Handle next after feedback
  const handleNext = () => {
    startNewHand(false);
  };

  // Reset to idle state (ends current session if in progress)
  const handleReset = () => {
    // End and save current session if we have any hands
    if (stats.handsCompleted > 0) {
      endSession();
    }
    setTrainingState('idle');
    setCurrentHand(createHand());
    setSelectedCountAnswer(null);
    setSelectedTotalAnswer(null);
    setStats({ countCorrect: 0, totalCorrect: 0, handsCompleted: 0 });
    setCompletedSession(null);
  };

  // Start a new session after completing one
  const handleNewSession = () => {
    setStats({ countCorrect: 0, totalCorrect: 0, handsCompleted: 0 });
    setCompletedSession(null);
    startNewHand(true);
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* Stats */}
      {trainingState !== 'idle' && trainingState !== 'session-complete' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ProgressBar current={stats.handsCompleted} target={SESSION_HANDS_TARGET} />
          <div style={{ display: 'flex', gap: 24, fontSize: 14, color: '#9ca3af' }}>
            <span>Count: {stats.countCorrect}/{stats.handsCompleted}</span>
            {askHandTotal && <span>Total: {stats.totalCorrect}/{stats.handsCompleted}</span>}
            {stats.handsCompleted > 0 && (
              <span>
                Accuracy: {Math.round((stats.countCorrect / stats.handsCompleted) * 100)}%
                {askHandTotal && ` / ${Math.round((stats.totalCorrect / stats.handsCompleted) * 100)}%`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Training Area */}
      <div style={{
        minHeight: 200,
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
              A hand will be dealt. Count the cards, then tell us the total.
            </p>
            <button
              onClick={() => startNewHand(true)}
              style={BUTTON_STYLES.primary}
            >
              Start Training
            </button>
          </div>
        )}

        {/* Dealing state - show hand */}
        {trainingState === 'dealing' && (
          <Hand
            hand={currentHand}
            countingSystem={HiLoSystem}
            showOverlays={overlaySettings.showOverlays}
            overlayIntensity={overlaySettings.intensity}
            flashIndex={overlaySettings.flashIndex}
            showValue={false}
            size="lg"
          />
        )}

        {/* Asking count - hand hidden, show number pad */}
        {trainingState === 'asking-count' && (
          <CountChoices
            correctAnswer={correctCount}
            onSelect={handleCountAnswer}
            label="What was the count?"
          />
        )}

        {/* Asking hand total - show button grid */}
        {trainingState === 'asking-total' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <p style={{ color: '#e5e7eb', fontSize: 18, margin: 0 }}>
              What was the hand total?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 320 }}>
              {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map(value => (
                <button
                  key={value}
                  onClick={() => handleTotalAnswer(value)}
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: value === 21 ? '#14532d' : '#1f2937',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    fontSize: 16,
                    borderRadius: 8,
                    border: '2px solid #374151',
                    cursor: 'pointer',
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleTotalAnswer(0)}
              style={{
                width: 200,
                height: 48,
                backgroundColor: '#7f1d1d',
                color: '#e5e7eb',
                fontWeight: 600,
                fontSize: 16,
                borderRadius: 8,
                border: '2px solid #991b1b',
                cursor: 'pointer',
              }}
            >
              Bust (22+)
            </button>
          </div>
        )}

        {/* Feedback state */}
        {trainingState === 'feedback' && (
          <div style={{ textAlign: 'center' }}>
            {/* Count feedback */}
            {selectedCountAnswer === correctCount ? (
              <p style={{ color: '#22c55e', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
                {askHandTotal ? 'Count: Correct!' : 'Correct!'}
              </p>
            ) : (
              <div style={{ marginBottom: 8 }}>
                <p style={{ color: '#ef4444', fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
                  {askHandTotal ? 'Count: Incorrect' : 'Incorrect'}
                </p>
                <p style={{ color: '#9ca3af', fontSize: 16, margin: 0 }}>
                  The count was {correctCount > 0 ? `+${correctCount}` : correctCount}
                </p>
              </div>
            )}

            {/* Total feedback (if enabled) */}
            {askHandTotal && (
              selectedTotalAnswer === correctTotal || (selectedTotalAnswer === 0 && correctTotal > 21) ? (
                <p style={{ color: '#22c55e', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
                  Total: Correct!
                </p>
              ) : (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ color: '#ef4444', fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
                    Total: Incorrect
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: 16, margin: 0 }}>
                    The hand was {correctTotal > 21 ? `Bust (${correctTotal})` : correctTotal}
                  </p>
                </div>
              )
            )}

            {/* Show the hand again for review */}
            <div style={{ marginTop: 20, marginBottom: 20 }}>
              <Hand
                hand={currentHand}
                countingSystem={HiLoSystem}
                showOverlays={true}
                showValue={true}
                size="md"
              />
            </div>

            <button onClick={handleNext} style={BUTTON_STYLES.secondary}>
              Next Hand
            </button>
          </div>
        )}

        {/* Session complete state */}
        {trainingState === 'session-complete' && completedSession && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#d4af37', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              Session Complete!
            </p>

            {/* Session stats */}
            <div style={{
              backgroundColor: '#1f2937',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
              minWidth: 280,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Hands:</span>
                  <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{completedSession.handsCompleted}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Count Accuracy:</span>
                  <span style={{
                    color: (completedSession.countCorrect / completedSession.countTotal) >= 0.8 ? '#22c55e' : '#ef4444',
                    fontWeight: 600,
                  }}>
                    {Math.round((completedSession.countCorrect / completedSession.countTotal) * 100)}%
                  </span>
                </div>
                {completedSession.config.askTotal && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Total Accuracy:</span>
                    <span style={{ color: '#e5e7eb', fontWeight: 600 }}>
                      {Math.round((completedSession.totalCorrect / completedSession.totalQuestions) * 100)}%
                    </span>
                  </div>
                )}
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

            {/* Action buttons */}
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
              min={300}
              max={2000}
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

          {/* Ask hand total toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#9ca3af', fontSize: 14, minWidth: 80 }}>Ask Total:</span>
            <button
              onClick={() => setAskHandTotal(!askHandTotal)}
              style={{
                padding: '6px 16px',
                backgroundColor: askHandTotal ? '#d4af37' : '#1f2937',
                color: askHandTotal ? '#0d1117' : '#9ca3af',
                fontWeight: 500,
                fontSize: 13,
                borderRadius: 6,
                border: askHandTotal ? 'none' : '1px solid #374151',
                cursor: 'pointer',
              }}
            >
              {askHandTotal ? 'On' : 'Off'}
            </button>
            <span style={{ color: '#6b7280', fontSize: 12 }}>
              (also ask for blackjack hand value)
            </span>
          </div>
        </div>
      )}

      {/* Reset button - visible during training */}
      {trainingState !== 'idle' && (
        <button onClick={handleReset} style={BUTTON_STYLES.reset}>
          Reset
        </button>
      )}

      <Legend />
    </div>
  );
}

export default SingleHandTrainer;
