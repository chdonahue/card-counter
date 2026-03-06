/**
 * Design System Colors
 * Single source of truth for all color values used in the app.
 *
 * Color naming follows a semantic approach:
 * - background: Surface colors for containers
 * - text: Text colors at different emphasis levels
 * - gold: Brand/accent colors
 * - count: Card counting overlay colors (per CLAUDE.md)
 * - feedback: Success/error/warning states
 * - action: Button and interactive element colors
 */

export const COLORS = {
  // Background/surface colors
  background: {
    primary: '#0d1117',    // Main app background (casino black)
    elevated: '#161b22',   // Slightly raised surfaces
    card: '#1f2937',       // Card/panel backgrounds
    felt: '#1a2e1a',       // Felt table texture
    feltLight: '#243d24',  // Lighter felt variant
    border: '#374151',     // Border/divider color
  },

  // Text colors
  text: {
    primary: '#e5e7eb',    // Primary text (high contrast)
    secondary: '#9ca3af',  // Secondary text (labels, hints)
    muted: '#6b7280',      // Muted/disabled text
    inverse: '#0d1117',    // Text on light/gold backgrounds
  },

  // Brand accent colors
  gold: {
    primary: '#d4af37',    // Primary gold accent
    light: '#f0d875',      // Light gold variant
  },

  // Card counting overlay colors (per CLAUDE.md design decisions)
  // Cyan for +1 (good), Magenta for -1 (bad), Gray for 0 (neutral)
  count: {
    positive: '#00ffff',   // Cyan - +1 cards (2-6)
    negative: '#ff00ff',   // Magenta - -1 cards (10-A)
    neutral: '#6b7280',    // Gray - 0 cards (7-9)
  },

  // Feedback colors
  feedback: {
    success: '#22c55e',    // Correct answers, positive states
    error: '#ef4444',      // Incorrect answers, errors
    warning: '#eab308',    // Warnings, caution states
  },

  // Action/button colors
  action: {
    primary: '#d4af37',    // Primary action (gold)
    secondary: '#1e40af',  // Secondary action (blue)
    tertiary: '#374151',   // Tertiary/outline buttons
    danger: '#7f1d1d',     // Destructive actions (dark red)
    dangerBorder: '#991b1b', // Danger button border
    special: '#14532d',    // Special highlight (21/blackjack)
  },
} as const;

// Type helper for accessing nested color values
export type ColorToken = typeof COLORS;
