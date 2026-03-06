/**
 * Basic Strategy lookup tables for 6-deck blackjack
 * Rules: Dealer stands on soft 17 (S17), Double After Split allowed (DAS), no surrender
 */

import type { Card, Rank } from '../../types/card';
import type { BlackjackHand } from './Hand';
import { evaluateHand, canSplit, canDoubleDown } from './Hand';

export type Decision = 'hit' | 'stand' | 'double' | 'split';

// Internal codes for the lookup tables
// H = Hit, S = Stand, D = Double (hit if can't), Ds = Double (stand if can't), P = Split
type StrategyCode = 'H' | 'S' | 'D' | 'Ds' | 'P';

/**
 * Hard totals strategy (player has no usable ace)
 * Rows: player total (5-17+), Columns: dealer up card (A, 2-10)
 */
const HARD_TOTALS: Record<number, StrategyCode[]> = {
  //       A    2    3    4    5    6    7    8    9   10
  5:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  6:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  7:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  8:  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  9:  ['H', 'H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H'],
  10: ['H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H'],
  11: ['H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'],  // Double vs 2-10, Hit vs A only (S17 rules)
  12: ['H', 'H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H'],
  13: ['H', 'S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H'],
  14: ['H', 'S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H'],
  15: ['H', 'S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H'],
  16: ['H', 'S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H'],
  17: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
};

/**
 * Soft totals strategy (player has ace counted as 11)
 * Rows: soft total (13-20), Columns: dealer up card (A, 2-10)
 */
const SOFT_TOTALS: Record<number, StrategyCode[]> = {
  //       A    2    3    4    5    6    7    8    9   10
  13: ['H', 'H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H'],  // A-2
  14: ['H', 'H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H'],  // A-3
  15: ['H', 'H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H'],  // A-4
  16: ['H', 'H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H'],  // A-5
  17: ['H', 'H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H'],  // A-6: Hit vs 2, Double vs 3-6
  18: ['H', 'S', 'Ds','Ds','Ds','Ds','S', 'S', 'H', 'H'],  // A-7: Hit vs A, Stand vs 2/7/8, Double vs 3-6 (stand if can't), Hit vs 9/10
  19: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],  // A-8: Always stand
  20: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],  // A-9
};

/**
 * Pairs strategy (two cards of same rank)
 * Rows: pair rank (A, 2-10), Columns: dealer up card (A, 2-10)
 * Note: 5-5 should never split (treat as hard 10), 10-10 should never split
 */
const PAIRS: Record<string, StrategyCode[]> = {
  //       A    2    3    4    5    6    7    8    9   10
  'A': ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  '2': ['H', 'P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H'],
  '3': ['H', 'P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H'],
  '4': ['H', 'H', 'H', 'H', 'P', 'P', 'H', 'H', 'H', 'H'],
  '5': ['H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H'],  // Never split - treat as hard 10
  '6': ['H', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  '7': ['H', 'P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H'],
  '8': ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  '9': ['S', 'P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S'],
  '10':['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],  // Never split
};

/**
 * Get dealer up card index (0-9) for table lookup
 * A=0, 2=1, 3=2, ..., 10=9
 */
function getDealerIndex(rank: Rank): number {
  if (rank === 'A') return 0;
  if (rank === 'J' || rank === 'Q' || rank === 'K' || rank === '10') return 9;
  return parseInt(rank) - 1;
}

/**
 * Normalize pair rank for lookup (J/Q/K → 10)
 */
function normalizePairRank(rank: Rank): string {
  if (rank === 'J' || rank === 'Q' || rank === 'K') return '10';
  return rank;
}

/**
 * Convert strategy code to decision, considering whether doubling is allowed
 */
function codeToDecision(code: StrategyCode, canDouble: boolean): Decision {
  switch (code) {
    case 'H': return 'hit';
    case 'S': return 'stand';
    case 'D': return canDouble ? 'double' : 'hit';
    case 'Ds': return canDouble ? 'double' : 'stand';
    case 'P': return 'split';
  }
}

/**
 * Get the basic strategy action for a given hand and dealer up card
 */
export function getBasicStrategyAction(
  playerHand: BlackjackHand,
  dealerUpCard: Card
): Decision {
  const value = evaluateHand(playerHand.cards);
  const dealerIndex = getDealerIndex(dealerUpCard.rank);
  const canDouble = canDoubleDown(playerHand);

  // Check for splittable pair first (exactly 2 cards of same rank)
  if (canSplit(playerHand)) {
    const pairRank = normalizePairRank(playerHand.cards[0].rank);
    const code = PAIRS[pairRank][dealerIndex];

    // If the strategy says split, return split
    // Otherwise fall through to hard/soft total logic
    if (code === 'P') {
      return 'split';
    }
    // For non-split decisions on pairs (like 5-5 or 10-10), use the code
    return codeToDecision(code, canDouble);
  }

  // Check soft total (has usable ace)
  if (value.isSoft && value.best >= 13 && value.best <= 20) {
    const code = SOFT_TOTALS[value.best][dealerIndex];
    return codeToDecision(code, canDouble);
  }

  // Hard total lookup
  const hardTotal = Math.min(value.best, 17); // 17+ all stand
  const hardKey = Math.max(hardTotal, 5);     // 5 is minimum row
  const code = HARD_TOTALS[hardKey][dealerIndex];
  return codeToDecision(code, canDouble);
}

/**
 * Get a human-readable explanation of why this is the correct play
 */
export function getStrategyExplanation(
  playerHand: BlackjackHand,
  dealerUpCard: Card,
  decision: Decision
): string {
  const value = evaluateHand(playerHand.cards);
  const dealerRank = dealerUpCard.rank === 'A' ? 'Ace' : dealerUpCard.rank;

  // Format decision with first letter capitalized
  const decisionText = decision.charAt(0).toUpperCase() + decision.slice(1);

  if (canSplit(playerHand)) {
    const pairRank = playerHand.cards[0].rank;
    const pairText = pairRank === 'A' ? 'Aces' : `${pairRank}s`;
    return `Pair of ${pairText} vs ${dealerRank}: ${decisionText}`;
  }

  if (value.isSoft) {
    return `Soft ${value.best} vs ${dealerRank}: ${decisionText}`;
  }

  return `Hard ${value.best} vs ${dealerRank}: ${decisionText}`;
}

export default { getBasicStrategyAction, getStrategyExplanation };
