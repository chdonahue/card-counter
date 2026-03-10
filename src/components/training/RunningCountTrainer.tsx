import { useState, useEffect, useCallback } from 'react';
import { Hand } from '../cards';
import { CountChoices } from '../ui';
import type { BlackjackHand } from '../../core/blackjack';
import type { Shoe as ShoeType } from '../../core/card/Shoe';
import { createHand, addCardToHand, evaluateHand } from '../../core/blackjack';
import { createShoe, dealCard, DEFAULT_SHOE_CONFIG } from '../../core/card/Shoe';
import { HiLoSystem, calculateRunningCount } from '../../core/counting';
import { useProgressStore } from '../../stores/useProgressStore';
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
  TrainingSettingsPanel,
  SessionCompleteStats,
} from './shared';

type TrainingState = 'idle' | 'dealing' | 'between-hands' | 'asking-count' | 'feedback' | 'session-complete';

const SESSION_HANDS_TARGET = 20;
const VERIFICATION_MIN_HANDS = 3;
const VERIFICATION_MAX_HANDS = 6;

export function RunningCountTrainer() {
  const [shoe, setShoe] = useState<ShoeType>(() => createShoe(DEFAULT_SHOE_CONFIG));
  const [currentHand, setCurrentHand] = useState<BlackjackHand>(() => createHand());
  const [trainingState, setTrainingState] = useState<TrainingState>('idle');
  const [runningCount, setRunningCount] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [dealSpeed, setDealSpeed] = useState<number>(1000);
  const [scaffolding, setScaffolding] = useState<ScaffoldingLevel>('bold');

  // Flash mode hook
  const flashingCardIndex = useFlashMode({
    scaffolding,
    isActive: trainingState === 'dealing',
    triggerValue: currentHand.cards.length,
  });

  // Running count tracking
  const [handsCompleted, setHandsCompleted] = useState<number>(0);
  const [handsSinceLastCheck, setHandsSinceLastCheck] = useState<number>(0);
  const [nextCheckAt, setNextCheckAt] = useState<number>(0);
  const [checksCorrect, setChecksCorrect] = useState<number>(0);
  const [totalChecks, setTotalChecks] = useState<number>(0);

  // Session tracking
  const { startSession, recordHandComplete, endSession, totalHandsCounted, streakCurrent, streakBest } = useProgressStore();

  // Calculate when next verification should happen
  const scheduleNextCheck = useCallback(() => {
    const handsUntilCheck = Math.floor(Math.random() * (VERIFICATION_MAX_HANDS - VERIFICATION_MIN_HANDS + 1)) + VERIFICATION_MIN_HANDS;
    setNextCheckAt(handsCompleted + handsSinceLastCheck + handsUntilCheck);
  }, [handsCompleted, handsSinceLastCheck]);

  // Current hand's count contribution
  const handCount = calculateRunningCount(currentHand.cards, HiLoSystem);
  const handValue = evaluateHand(currentHand.cards);
  const shouldStopDealing = handValue.best >= 17 || handValue.isBust;

  // Calculate overlay settings based on scaffolding level
  const overlaySettings = getOverlaySettings(scaffolding, flashingCardIndex);

  // Deal one card
  const dealOneCard = useCallback(() => {
    const result = dealCard(shoe);
    if (!result) {
      const newShoe = createShoe(DEFAULT_SHOE_CONFIG);
      setShoe(newShoe);
      setRunningCount(0); // Reset count on reshuffle
      return false;
    }
    setShoe(result.updatedShoe);
    setCurrentHand(prev => addCardToHand(prev, result.card));
    return true;
  }, [shoe]);

  // Start training
  const startTraining = useCallback(() => {
    startSession('running-count', {
      scaffolding,
      speed: dealSpeed,
      askTotal: false,
      deckCount: DEFAULT_SHOE_CONFIG.deckCount,
    });
    setRunningCount(0);
    setHandsCompleted(0);
    setHandsSinceLastCheck(0);
    setChecksCorrect(0);
    setTotalChecks(0);
    setCurrentHand(createHand());
    // Schedule first check
    const firstCheck = Math.floor(Math.random() * (VERIFICATION_MAX_HANDS - VERIFICATION_MIN_HANDS + 1)) + VERIFICATION_MIN_HANDS;
    setNextCheckAt(firstCheck);
    setTrainingState('dealing');
  }, [startSession, scaffolding, dealSpeed]);

  // Start next hand
  const startNextHand = useCallback(() => {
    setCurrentHand(createHand());
    setTrainingState('dealing');
  }, []);

  // Auto-deal effect
  useEffect(() => {
    if (trainingState !== 'dealing') return;

    if (shouldStopDealing && currentHand.cards.length >= 2) {
      // Hand is complete - update running count and check if we need to verify
      const timer = setTimeout(() => {
        const newRunningCount = runningCount + handCount;
        setRunningCount(newRunningCount);

        const newHandsCompleted = handsCompleted + 1;
        const newHandsSinceCheck = handsSinceLastCheck + 1;
        setHandsCompleted(newHandsCompleted);
        setHandsSinceLastCheck(newHandsSinceCheck);

        // Record hand completion (without verification result yet)
        recordHandComplete(true); // We'll track accuracy on checks, not individual hands

        // Check if session is complete
        if (newHandsCompleted >= SESSION_HANDS_TARGET) {
          // Force a final verification
          setTrainingState('asking-count');
          return;
        }

        // Check if it's time for verification
        if (newHandsCompleted >= nextCheckAt) {
          setTrainingState('asking-count');
        } else {
          setTrainingState('between-hands');
        }
      }, dealSpeed);
      return () => clearTimeout(timer);
    }

    // Deal next card
    const timer = setTimeout(() => {
      dealOneCard();
    }, currentHand.cards.length === 0 ? 100 : dealSpeed);

    return () => clearTimeout(timer);
  }, [trainingState, shouldStopDealing, currentHand.cards.length, dealSpeed, dealOneCard, handCount, runningCount, handsCompleted, handsSinceLastCheck, nextCheckAt, recordHandComplete]);

  // Auto-advance between hands
  useEffect(() => {
    if (trainingState !== 'between-hands') return;

    const timer = setTimeout(() => {
      startNextHand();
    }, TIMING.BETWEEN_HANDS_PAUSE);

    return () => clearTimeout(timer);
  }, [trainingState, startNextHand]);

  // Handle answer
  const handleAnswer = (answer: number) => {
    setSelectedAnswer(answer);
    const isCorrect = answer === runningCount;

    setTotalChecks(prev => prev + 1);
    if (isCorrect) {
      setChecksCorrect(prev => prev + 1);
    }
    setHandsSinceLastCheck(0);

    // Schedule next check
    scheduleNextCheck();

    // Check if session is complete
    if (handsCompleted >= SESSION_HANDS_TARGET) {
      endSession();
      setTrainingState('session-complete');
    } else {
      setTrainingState('feedback');
    }
  };

  // Continue after feedback
  const handleContinue = () => {
    setSelectedAnswer(null);
    startNextHand();
  };

  // Reset
  const handleReset = () => {
    if (handsCompleted > 0) {
      endSession();
    }
    setTrainingState('idle');
    setCurrentHand(createHand());
    setRunningCount(0);
    setHandsCompleted(0);
    setHandsSinceLastCheck(0);
    setChecksCorrect(0);
    setTotalChecks(0);
    setSelectedAnswer(null);
  };

  // New session
  const handleNewSession = () => {
    startTraining();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* Progress bar */}
      {trainingState !== 'idle' && trainingState !== 'session-complete' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ProgressBar current={handsCompleted} target={SESSION_HANDS_TARGET} />
          <div style={{ display: 'flex', gap: 24, fontSize: 14, color: COLORS.text.secondary }}>
            <span>Checks: {checksCorrect}/{totalChecks}</span>
            <span>Since last check: {handsSinceLastCheck} hands</span>
            {totalChecks > 0 && (
              <span>Accuracy: {Math.round((checksCorrect / totalChecks) * 100)}%</span>
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
            <p style={{ color: COLORS.text.secondary, marginBottom: 16 }}>
              Track the running count across multiple hands.<br />
              You'll be checked randomly every {VERIFICATION_MIN_HANDS}-{VERIFICATION_MAX_HANDS} hands.
            </p>
            <button onClick={startTraining} style={BUTTON_STYLES.primary}>
              Start Training
            </button>
          </div>
        )}

        {/* Dealing state */}
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

        {/* Between hands - brief transition */}
        {trainingState === 'between-hands' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: COLORS.text.muted, fontSize: 14 }}>Next hand...</p>
          </div>
        )}

        {/* Asking for count */}
        {trainingState === 'asking-count' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <p style={{ color: COLORS.text.muted, fontSize: 14, margin: 0 }}>
              ({handsSinceLastCheck} hand{handsSinceLastCheck !== 1 ? 's' : ''} since last check)
            </p>
            <CountChoices
              correctAnswer={runningCount}
              onSelect={handleAnswer}
              label="What's the running count?"
            />
          </div>
        )}

        {/* Feedback */}
        {trainingState === 'feedback' && (
          <div style={{ textAlign: 'center' }}>
            {selectedAnswer === runningCount ? (
              <p style={{ color: COLORS.feedback.success, fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
                Correct!
              </p>
            ) : (
              <div style={{ marginBottom: 8 }}>
                <p style={{ color: COLORS.feedback.error, fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
                  Incorrect
                </p>
                <p style={{ color: COLORS.text.secondary, fontSize: 16 }}>
                  The running count was {runningCount > 0 ? `+${runningCount}` : runningCount}
                </p>
              </div>
            )}

            <button
              onClick={handleContinue}
              style={{ ...BUTTON_STYLES.secondary, marginTop: 16 }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Session complete */}
        {trainingState === 'session-complete' && (
          <>
            {/* Final answer feedback (shown before stats card) */}
            {selectedAnswer !== null && (
              <p style={{
                color: selectedAnswer === runningCount ? COLORS.feedback.success : COLORS.feedback.error,
                fontSize: 16,
                marginBottom: 8,
              }}>
                Final count: {selectedAnswer === runningCount ? 'Correct!' : `Incorrect (was ${runningCount > 0 ? `+${runningCount}` : runningCount})`}
              </p>
            )}
            <SessionCompleteStats
              stats={[
                { label: 'Hands Dealt', value: handsCompleted },
                { label: 'Verifications', value: totalChecks },
                {
                  label: 'Accuracy',
                  value: `${totalChecks > 0 ? Math.round((checksCorrect / totalChecks) * 100) : 0}%`,
                  color: totalChecks > 0 && (checksCorrect / totalChecks) >= 0.8
                    ? COLORS.feedback.success
                    : COLORS.feedback.error,
                },
              ]}
              globalStats={{
                streakCurrent,
                streakBest,
                totalHandsCounted,
              }}
              onNewSession={handleNewSession}
              onChangeSettings={handleReset}
            />
          </>
        )}
      </div>

      {/* Settings - only in idle */}
      {trainingState === 'idle' && (
        <TrainingSettingsPanel>
          <SpeedControl speed={dealSpeed} onChange={setDealSpeed} />
          <ScaffoldingControl level={scaffolding} onChange={setScaffolding} />
        </TrainingSettingsPanel>
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

export default RunningCountTrainer;
