import type { Rank } from '../../../types/card';
import type { CountingSystem } from '../CountingSystem';

/**
 * Hi-Lo Counting System (MIT Blackjack Team)
 *
 * The most popular and beginner-friendly card counting system.
 *
 * Card Values:
 * - 2, 3, 4, 5, 6 = +1 (low cards favor the player when removed)
 * - 7, 8, 9 = 0 (neutral cards)
 * - 10, J, Q, K, A = -1 (high cards favor the player when in deck)
 *
 * Balanced system: A full deck sums to 0
 */
export const HiLoSystem: CountingSystem = {
  id: 'hi-lo',
  name: 'Hi-Lo',
  description:
    'The most popular balanced counting system. Easy to learn, effective for betting decisions.',
  isPremium: false,
  difficulty: 'beginner',

  getCountValue(rank: Rank): number {
    // Low cards: +1 (good for player when removed from deck)
    if (['2', '3', '4', '5', '6'].includes(rank)) {
      return 1;
    }

    // Neutral cards: 0
    if (['7', '8', '9'].includes(rank)) {
      return 0;
    }

    // High cards: -1 (bad for player when removed from deck)
    // 10, J, Q, K, A
    return -1;
  },
};
