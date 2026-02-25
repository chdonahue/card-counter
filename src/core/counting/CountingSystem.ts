import type { Card, Rank } from '../../types/card';

export interface CountingSystem {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  /**
   * Gets the count value for a given card rank
   */
  getCountValue(rank: Rank): number;
}

/**
 * Calculate the running count for a set of dealt cards
 */
export function calculateRunningCount(
  cards: Card[],
  system: CountingSystem
): number {
  return cards.reduce((count, card) => {
    return count + system.getCountValue(card.rank);
  }, 0);
}

/**
 * Calculate the true count (running count / decks remaining)
 */
export function calculateTrueCount(
  runningCount: number,
  decksRemaining: number
): number {
  if (decksRemaining <= 0) return runningCount;
  // Round to 1 decimal place
  return Math.round((runningCount / decksRemaining) * 10) / 10;
}

/**
 * Get the count overlay type based on count value
 */
export type CountOverlay = 'positive' | 'negative' | 'neutral';

export function getCountOverlay(countValue: number): CountOverlay {
  if (countValue > 0) return 'positive';
  if (countValue < 0) return 'negative';
  return 'neutral';
}
