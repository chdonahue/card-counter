/**
 * Timing Constants
 * Single source of truth for all timing/animation durations used in trainers.
 *
 * All values are in milliseconds.
 */

export const TIMING = {
  /**
   * Delay before the first card appears in a round.
   * Gives the UI time to settle after starting.
   */
  FIRST_CARD_DELAY: 100,

  /**
   * Brief flicker of empty space between cards.
   * Creates a visual "dealing rhythm" so consecutive identical cards
   * are distinguishable.
   */
  GAP_BETWEEN_CARDS: 60,

  /**
   * Pause between hands in running count mode.
   * Gives user a moment to process before next hand starts.
   */
  BETWEEN_HANDS_PAUSE: 800,

  /**
   * Auto-advance delay from running count feedback to true count question.
   * Shows the result briefly before moving on.
   */
  FEEDBACK_AUTO_ADVANCE: 1000,

  /**
   * Duration that count overlay shows in "flash" scaffolding mode.
   * Long enough to register, short enough to require quick recognition.
   */
  FLASH_OVERLAY_DURATION: 400,
} as const;

export type TimingKey = keyof typeof TIMING;
