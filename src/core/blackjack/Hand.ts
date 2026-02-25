import type { Card, Rank } from '../../types/card';

/**
 * Blackjack hand representation and evaluation
 * Designed for reuse in both training and game modes
 */

export interface BlackjackHand {
  cards: Card[];
  bet?: number; // Optional, for game mode
  isDoubledDown?: boolean;
  isSplit?: boolean;
  isStanding?: boolean;
}

export interface HandValue {
  hard: number; // Value counting all aces as 1
  soft: number; // Value counting one ace as 11 (if possible)
  best: number; // Best playable value (soft if <= 21, else hard)
  isSoft: boolean; // Whether the best value uses an ace as 11
  isBlackjack: boolean; // Natural 21 with exactly 2 cards
  isBust: boolean; // Best value > 21
}

/**
 * Get the base value of a card rank (aces = 1 for base calculation)
 */
export function getCardValue(rank: Rank): number {
  switch (rank) {
    case 'A':
      return 1;
    case '2':
      return 2;
    case '3':
      return 3;
    case '4':
      return 4;
    case '5':
      return 5;
    case '6':
      return 6;
    case '7':
      return 7;
    case '8':
      return 8;
    case '9':
      return 9;
    case '10':
    case 'J':
    case 'Q':
    case 'K':
      return 10;
  }
}

/**
 * Calculate the value of a blackjack hand
 * Handles soft/hard totals and ace evaluation
 */
export function evaluateHand(cards: Card[]): HandValue {
  if (cards.length === 0) {
    return {
      hard: 0,
      soft: 0,
      best: 0,
      isSoft: false,
      isBlackjack: false,
      isBust: false,
    };
  }

  // Count aces and calculate hard total (all aces = 1)
  let aceCount = 0;
  let hardTotal = 0;

  for (const card of cards) {
    const value = getCardValue(card.rank);
    hardTotal += value;
    if (card.rank === 'A') {
      aceCount++;
    }
  }

  // Calculate soft total (one ace = 11 if it doesn't bust)
  // Only one ace can ever count as 11 (since 11 + 11 = 22 = bust)
  let softTotal = hardTotal;
  let isSoft = false;

  if (aceCount > 0 && hardTotal + 10 <= 21) {
    softTotal = hardTotal + 10;
    isSoft = true;
  }

  // Best value is soft if it doesn't bust, otherwise hard
  const best = softTotal <= 21 ? softTotal : hardTotal;
  const isBust = best > 21;

  // Blackjack is exactly 2 cards totaling 21
  const isBlackjack = cards.length === 2 && best === 21;

  return {
    hard: hardTotal,
    soft: softTotal,
    best,
    isSoft: isSoft && !isBust,
    isBlackjack,
    isBust,
  };
}

/**
 * Create an empty hand
 */
export function createHand(bet?: number): BlackjackHand {
  return {
    cards: [],
    bet,
    isDoubledDown: false,
    isSplit: false,
    isStanding: false,
  };
}

/**
 * Add a card to a hand (immutable)
 */
export function addCardToHand(hand: BlackjackHand, card: Card): BlackjackHand {
  return {
    ...hand,
    cards: [...hand.cards, card],
  };
}

/**
 * Check if hand can be split (two cards of same rank)
 */
export function canSplit(hand: BlackjackHand): boolean {
  if (hand.cards.length !== 2) return false;
  return hand.cards[0].rank === hand.cards[1].rank;
}

/**
 * Check if hand can double down (typically only on first two cards)
 */
export function canDoubleDown(hand: BlackjackHand): boolean {
  return hand.cards.length === 2 && !hand.isDoubledDown;
}

/**
 * Check if hand should be offered insurance (dealer shows ace)
 * This is a dealer-side check, included for completeness
 */
export function dealerShowsAce(dealerUpCard: Card): boolean {
  return dealerUpCard.rank === 'A';
}

/**
 * Format hand value for display
 */
export function formatHandValue(value: HandValue): string {
  if (value.isBlackjack) return 'Blackjack!';
  if (value.isBust) return `Bust (${value.hard})`;
  if (value.isSoft && value.soft !== value.hard) {
    return `${value.hard}/${value.soft}`;
  }
  return `${value.best}`;
}
