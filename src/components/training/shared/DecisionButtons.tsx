/**
 * Decision buttons for Basic Strategy training
 * Shows Hit/Stand/Double/Split with optional scaffolding highlights
 * All buttons always visible - Double/Split grayed out when not legal
 */

import type { Decision } from '../../../core/blackjack/BasicStrategy';
import type { ScaffoldingLevel } from './types';

interface DecisionButtonsProps {
  onSelect: (action: Decision) => void;
  correctAction?: Decision | null;
  scaffolding: ScaffoldingLevel;
  showHint: boolean;  // Controls whether scaffolding is currently visible
  canDouble: boolean;
  canSplit: boolean;
  disabled?: boolean;
}

const DECISION_LABELS: Record<Decision, string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
  split: 'Split',
};

// All four decisions always shown
const ALL_DECISIONS: Decision[] = ['hit', 'stand', 'double', 'split'];

// Base button style
const baseButtonStyle: React.CSSProperties = {
  padding: '16px 28px',
  fontSize: 17,
  fontWeight: 700,
  borderRadius: 10,
  minWidth: 90,
  transition: 'all 0.15s ease',
};

export function DecisionButtons({
  onSelect,
  correctAction,
  scaffolding,
  showHint,
  canDouble,
  canSplit,
  disabled = false,
}: DecisionButtonsProps) {
  const isActionAllowed = (action: Decision): boolean => {
    if (action === 'double') return canDouble;
    if (action === 'split') return canSplit;
    return true; // hit and stand always allowed
  };

  const getButtonStyle = (action: Decision): React.CSSProperties => {
    const isAllowed = isActionAllowed(action);
    const isCorrect = action === correctAction;
    const shouldHighlight = showHint && isCorrect && scaffolding !== 'none';

    // Disabled/grayed out (not legal)
    if (!isAllowed) {
      return {
        ...baseButtonStyle,
        backgroundColor: '#1f2937',
        color: '#4b5563',
        border: '2px solid #374151',
        opacity: 0.4,
        cursor: 'not-allowed',
      };
    }

    // Bold mode: strong gold highlight
    if (shouldHighlight && scaffolding === 'bold') {
      return {
        ...baseButtonStyle,
        backgroundColor: '#d4af37',
        color: '#0d1117',
        border: '2px solid #d4af37',
        boxShadow: '0 0 12px rgba(212, 175, 55, 0.5)',
        cursor: 'pointer',
      };
    }

    // Subtle mode: faint glow
    if (shouldHighlight && scaffolding === 'subtle') {
      return {
        ...baseButtonStyle,
        backgroundColor: '#1f2937',
        color: '#e5e7eb',
        border: '2px solid #d4af37',
        boxShadow: '0 0 6px rgba(212, 175, 55, 0.3)',
        cursor: 'pointer',
      };
    }

    // Flash mode: same as bold when visible
    if (shouldHighlight && scaffolding === 'flash') {
      return {
        ...baseButtonStyle,
        backgroundColor: '#d4af37',
        color: '#0d1117',
        border: '2px solid #d4af37',
        boxShadow: '0 0 12px rgba(212, 175, 55, 0.5)',
        cursor: 'pointer',
      };
    }

    // Default (no highlight, but enabled)
    return {
      ...baseButtonStyle,
      backgroundColor: '#1f2937',
      color: '#e5e7eb',
      border: '2px solid #374151',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    };
  };

  const handleClick = (action: Decision) => {
    if (disabled || !isActionAllowed(action)) return;
    onSelect(action);
  };

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      flexWrap: 'wrap',
    }}>
      {ALL_DECISIONS.map(action => (
        <button
          key={action}
          onClick={() => handleClick(action)}
          disabled={disabled || !isActionAllowed(action)}
          style={getButtonStyle(action)}
        >
          {DECISION_LABELS[action]}
        </button>
      ))}
    </div>
  );
}

export default DecisionButtons;
