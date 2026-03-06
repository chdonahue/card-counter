/**
 * Shared training settings controls
 * Extracted from trainer components to eliminate duplication.
 */

import { COLORS } from '../../../constants/colors';
import type { ScaffoldingLevel } from './types';
import { SCAFFOLDING_LABELS } from './types';

// ============================================================================
// SpeedControl - Slider for deal speed
// ============================================================================

interface SpeedControlProps {
  speed: number;
  onChange: (speed: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export function SpeedControl({
  speed,
  onChange,
  min = 300,
  max = 2000,
  step = 100,
  label = 'Speed:',
}: SpeedControlProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: COLORS.text.secondary, fontSize: 14, minWidth: 80 }}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={speed}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: 150 }}
      />
      <span style={{ color: COLORS.text.secondary, fontSize: 14, minWidth: 50 }}>
        {(speed / 1000).toFixed(1)}s
      </span>
    </div>
  );
}

// ============================================================================
// ScaffoldingControl - Button group for scaffolding levels
// ============================================================================

interface ScaffoldingControlProps {
  level: ScaffoldingLevel;
  onChange: (level: ScaffoldingLevel) => void;
  label?: string;
}

export function ScaffoldingControl({
  level,
  onChange,
  label = 'Helpers:',
}: ScaffoldingControlProps) {
  const levels: ScaffoldingLevel[] = ['bold', 'subtle', 'flash', 'none'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: COLORS.text.secondary, fontSize: 14, minWidth: 80 }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        {levels.map(l => (
          <button
            key={l}
            onClick={() => onChange(l)}
            style={{
              padding: '6px 12px',
              backgroundColor: level === l ? COLORS.gold.primary : COLORS.background.card,
              color: level === l ? COLORS.text.inverse : COLORS.text.secondary,
              fontWeight: 500,
              fontSize: 13,
              borderRadius: 6,
              border: level === l ? 'none' : `1px solid ${COLORS.background.border}`,
              cursor: 'pointer',
            }}
          >
            {SCAFFOLDING_LABELS[l]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ToggleControl - On/Off toggle button
// ============================================================================

interface ToggleControlProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}

export function ToggleControl({
  label,
  value,
  onChange,
  hint,
}: ToggleControlProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: COLORS.text.secondary, fontSize: 14, minWidth: 80 }}>
        {label}:
      </span>
      <button
        onClick={() => onChange(!value)}
        style={{
          padding: '6px 16px',
          backgroundColor: value ? COLORS.gold.primary : COLORS.background.card,
          color: value ? COLORS.text.inverse : COLORS.text.secondary,
          fontWeight: 500,
          fontSize: 13,
          borderRadius: 6,
          border: value ? 'none' : `1px solid ${COLORS.background.border}`,
          cursor: 'pointer',
        }}
      >
        {value ? 'On' : 'Off'}
      </button>
      {hint && (
        <span style={{ color: COLORS.text.muted, fontSize: 12 }}>
          ({hint})
        </span>
      )}
    </div>
  );
}

// ============================================================================
// NumberSelect - Button group for number selection
// ============================================================================

interface NumberSelectProps {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}

export function NumberSelect({
  label,
  value,
  options,
  onChange,
}: NumberSelectProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: COLORS.text.secondary, fontSize: 14, minWidth: 80 }}>
        {label}:
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        {options.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              width: 40,
              height: 40,
              backgroundColor: value === n ? COLORS.gold.primary : COLORS.background.card,
              color: value === n ? COLORS.text.inverse : COLORS.text.secondary,
              fontWeight: 600,
              fontSize: 14,
              borderRadius: 6,
              border: value === n ? 'none' : `1px solid ${COLORS.background.border}`,
              cursor: 'pointer',
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TrainingSettingsPanel - Container wrapper for settings
// ============================================================================

interface TrainingSettingsPanelProps {
  children: React.ReactNode;
}

export function TrainingSettingsPanel({ children }: TrainingSettingsPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      {children}
    </div>
  );
}
