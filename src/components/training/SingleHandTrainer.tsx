import { useState, useEffect, useCallback } from 'react';
import { Hand } from '../cards';
import type { BlackjackHand } from '../../core/blackjack';
import type { Shoe as ShoeType } from '../../core/card/Shoe';
import { createHand, addCardToHand, evaluateHand } from '../../core/blackjack';
import { createShoe, dealCard, DEFAULT_SHOE_CONFIG } from '../../core/card/Shoe';
import { HiLoSystem, calculateRunningCount } from '../../core/counting';

type TrainingState = 'idle' | 'dealing' | 'asking-count' | 'asking-total' | 'feedback';
type ScaffoldingLevel = 'bold' | 'subtle' | 'flash' | 'none';

interface TrainerStats {
  countCorrect: number;
  totalCorrect: number;
  handsCompleted: number;
}

const SCAFFOLDING_LABELS: Record<ScaffoldingLevel, string> = {
  bold: 'Bold Outlines',
  subtle: 'Subtle Outlines',
  flash: 'Brief Flash',
  none: 'No Helpers',
};

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

  // Calculate count for current hand
  const handCount = calculateRunningCount(currentHand.cards, HiLoSystem);

  // Check if hand should stop (17+ or bust)
  const handValue = evaluateHand(currentHand.cards);
  const shouldStopDealing = handValue.best >= 17 || handValue.isBust;

  // Fixed answer options - all possible values for a hand
  const answerOptions = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

  // Determine overlay settings based on scaffolding level
  const getOverlaySettings = () => {
    switch (scaffolding) {
      case 'bold':
        return { showOverlays: true, intensity: 'bold' as const, flashIndex: -1 };
      case 'subtle':
        return { showOverlays: true, intensity: 'subtle' as const, flashIndex: -1 };
      case 'flash':
        // In flash mode: showOverlays false (default off), flashIndex controls which card flashes
        return { showOverlays: false, intensity: 'subtle' as const, flashIndex: flashingCardIndex };
      case 'none':
        return { showOverlays: false, intensity: 'none' as const, flashIndex: -1 };
    }
  };

  const overlaySettings = getOverlaySettings();

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
  const startNewHand = useCallback(() => {
    setCurrentHand(createHand());
    setSelectedCountAnswer(null);
    setSelectedTotalAnswer(null);
    setTrainingState('dealing');
  }, []);

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
      setStats(prev => ({
        countCorrect: prev.countCorrect + (isCorrect ? 1 : 0),
        totalCorrect: prev.totalCorrect,
        handsCompleted: prev.handsCompleted + 1,
      }));
      setTrainingState('feedback');
    }
  };

  // Handle hand total answer selection
  const handleTotalAnswer = (answer: number) => {
    setSelectedTotalAnswer(answer);
    const countCorrect = selectedCountAnswer === correctCount;
    const totalCorrect = answer === correctTotal;
    setStats(prev => ({
      countCorrect: prev.countCorrect + (countCorrect ? 1 : 0),
      totalCorrect: prev.totalCorrect + (totalCorrect ? 1 : 0),
      handsCompleted: prev.handsCompleted + 1,
    }));
    setTrainingState('feedback');
  };

  // Handle next after feedback
  const handleNext = () => {
    startNewHand();
  };

  // Reset to idle state
  const handleReset = () => {
    setTrainingState('idle');
    setCurrentHand(createHand());
    setSelectedCountAnswer(null);
    setSelectedTotalAnswer(null);
    setStats({ countCorrect: 0, totalCorrect: 0, handsCompleted: 0 });
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* Stats */}
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
              onClick={startNewHand}
              style={{
                padding: '12px 32px',
                backgroundColor: '#d4af37',
                color: '#0d1117',
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
              }}
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

        {/* Asking count - hand hidden, show count options */}
        {trainingState === 'asking-count' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#e5e7eb', fontSize: 18, marginBottom: 20 }}>
              What was the count?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {answerOptions.map(option => (
                <button
                  key={option}
                  onClick={() => handleCountAnswer(option)}
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: '#1f2937',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    fontSize: 16,
                    borderRadius: 8,
                    border: '2px solid #374151',
                    cursor: 'pointer',
                  }}
                >
                  {option > 0 ? `+${option}` : option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Asking hand total - show total options */}
        {trainingState === 'asking-total' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#e5e7eb', fontSize: 18, marginBottom: 20 }}>
              What was the hand total?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 400 }}>
              {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map(option => (
                <button
                  key={option}
                  onClick={() => handleTotalAnswer(option)}
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: option === 21 ? '#14532d' : '#1f2937',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    fontSize: 16,
                    borderRadius: 8,
                    border: '2px solid #374151',
                    cursor: 'pointer',
                  }}
                >
                  {option}
                </button>
              ))}
              <button
                onClick={() => handleTotalAnswer(0)}
                style={{
                  width: 72,
                  height: 48,
                  backgroundColor: '#7f1d1d',
                  color: '#e5e7eb',
                  fontWeight: 600,
                  fontSize: 14,
                  borderRadius: 8,
                  border: '2px solid #374151',
                  cursor: 'pointer',
                }}
              >
                Bust
              </button>
            </div>
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

            <button
              onClick={handleNext}
              style={{
                padding: '12px 32px',
                backgroundColor: '#1e40af',
                color: 'white',
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              Next Hand
            </button>
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
        <button
          onClick={handleReset}
          style={{
            padding: '8px 20px',
            backgroundColor: 'transparent',
            color: '#9ca3af',
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid #374151',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Reset
        </button>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 16, height: 22, borderRadius: 3, backgroundColor: 'white', boxShadow: '0 0 0 1px #000, 0 0 0 4px #00ffff, 0 0 0 5px #000' }}></div>
          <span style={{ color: '#9ca3af' }}>+1 (2-6)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 16, height: 22, borderRadius: 3, backgroundColor: 'white', border: '1px solid #6b7280' }}></div>
          <span style={{ color: '#9ca3af' }}>0 (7-9)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 16, height: 22, borderRadius: 3, backgroundColor: 'white', boxShadow: '0 0 0 1px #000, 0 0 0 4px #ff00ff, 0 0 0 5px #000' }}></div>
          <span style={{ color: '#9ca3af' }}>-1 (10-A)</span>
        </div>
      </div>
    </div>
  );
}

export default SingleHandTrainer;
