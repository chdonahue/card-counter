import { useMemo } from 'react';
import { COLORS } from '../../constants/colors';

interface CountChoicesProps {
  correctAnswer: number;
  onSelect: (value: number) => void;
  numChoices?: number;
  label?: string;
}

export function CountChoices({
  correctAnswer,
  onSelect,
  numChoices = 5,
  label = 'What was the count?',
}: CountChoicesProps) {
  // Generate choices with random offset
  const choices = useMemo(() => {
    // Random offset: correct answer can be in any position (0 to numChoices-1)
    const position = Math.floor(Math.random() * numChoices);
    const startValue = correctAnswer - position;

    return Array.from({ length: numChoices }, (_, i) => startValue + i);
  }, [correctAnswer, numChoices]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <p style={{ color: COLORS.text.primary, fontSize: 18, margin: 0 }}>{label}</p>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {choices.map(value => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            style={{
              width: 56,
              height: 56,
              backgroundColor: COLORS.background.card,
              color: COLORS.text.primary,
              fontWeight: 600,
              fontSize: 18,
              borderRadius: 10,
              border: `2px solid ${COLORS.background.border}`,
              cursor: 'pointer',
            }}
          >
            {value > 0 ? `+${value}` : value}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CountChoices;
