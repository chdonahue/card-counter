/**
 * Shared types and constants for training components
 */

import { COLORS } from '../../../constants/colors';

export type ScaffoldingLevel = 'bold' | 'subtle' | 'flash' | 'none';

export const SCAFFOLDING_LABELS: Record<ScaffoldingLevel, string> = {
  bold: 'Bold Outlines',
  subtle: 'Subtle Outlines',
  flash: 'Brief Flash',
  none: 'No Helpers',
};

export interface OverlaySettings {
  showOverlays: boolean;
  intensity: 'bold' | 'subtle' | 'none';
  flashIndex?: number;
}

/**
 * Get overlay settings based on scaffolding level
 */
export function getOverlaySettings(
  scaffolding: ScaffoldingLevel,
  flashingCardIndex: number = -1
): OverlaySettings {
  switch (scaffolding) {
    case 'bold':
      return { showOverlays: true, intensity: 'bold', flashIndex: -1 };
    case 'subtle':
      return { showOverlays: true, intensity: 'subtle', flashIndex: -1 };
    case 'flash':
      // In flash mode: showOverlays false (default off), flashIndex controls which card flashes
      return { showOverlays: false, intensity: 'subtle', flashIndex: flashingCardIndex };
    case 'none':
      return { showOverlays: false, intensity: 'none', flashIndex: -1 };
  }
}

// Common button styles
export const BUTTON_STYLES = {
  primary: {
    padding: '12px 32px',
    backgroundColor: COLORS.action.primary,
    color: COLORS.text.inverse,
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
  } as React.CSSProperties,

  secondary: {
    padding: '12px 32px',
    backgroundColor: COLORS.action.secondary,
    color: 'white',
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
  } as React.CSSProperties,

  tertiary: {
    padding: '12px 32px',
    backgroundColor: COLORS.action.tertiary,
    color: COLORS.text.primary,
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
  } as React.CSSProperties,

  reset: {
    padding: '8px 20px',
    backgroundColor: 'transparent',
    color: COLORS.text.secondary,
    fontWeight: 500,
    borderRadius: 6,
    border: `1px solid ${COLORS.background.border}`,
    cursor: 'pointer',
    fontSize: 14,
  } as React.CSSProperties,
};
