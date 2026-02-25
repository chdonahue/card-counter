import type { Card } from '../../types/card';
import { SUITS, RANKS } from '../../types/card';

export interface ShoeConfig {
  deckCount: 1 | 2 | 3 | 4 | 6 | 8;
  penetration: number; // 0.0 - 1.0 (percentage of shoe to deal before reshuffling)
}

export interface Shoe {
  cards: Card[];
  dealtCards: Card[];
  config: ShoeConfig;
  cutCardPosition: number;
}

/**
 * Fisher-Yates shuffle algorithm
 * Shuffles array in place and returns it
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Creates a single deck of 52 cards
 */
export function createDeck(deckIndex: number = 0): Card[] {
  const cards: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        id: `${deckIndex}-${suit}-${rank}`,
        suit,
        rank,
        faceUp: false,
      });
    }
  }

  return cards;
}

/**
 * Creates a shoe with multiple decks, shuffled
 */
export function createShoe(config: ShoeConfig): Shoe {
  const cards: Card[] = [];

  for (let deck = 0; deck < config.deckCount; deck++) {
    cards.push(...createDeck(deck));
  }

  const shuffled = fisherYatesShuffle(cards);
  const cutCardPosition = Math.floor(shuffled.length * config.penetration);

  return {
    cards: shuffled,
    dealtCards: [],
    config,
    cutCardPosition,
  };
}

/**
 * Deals a single card from the shoe
 */
export function dealCard(shoe: Shoe): { card: Card; updatedShoe: Shoe } | null {
  if (shoe.cards.length === 0) {
    return null;
  }

  const [card, ...remaining] = shoe.cards;
  const dealtCard: Card = { ...card, faceUp: true };

  return {
    card: dealtCard,
    updatedShoe: {
      ...shoe,
      cards: remaining,
      dealtCards: [...shoe.dealtCards, dealtCard],
    },
  };
}

/**
 * Gets the number of decks remaining (for true count calculation)
 */
export function getDecksRemaining(shoe: Shoe): number {
  return shoe.cards.length / 52;
}

/**
 * Reshuffles the shoe (collects all cards and shuffles)
 */
export function reshuffleShoe(shoe: Shoe): Shoe {
  const allCards = [...shoe.cards, ...shoe.dealtCards];
  const shuffled = fisherYatesShuffle(allCards);

  // Reset all cards to face down
  const resetCards = shuffled.map(card => ({ ...card, faceUp: false }));

  return {
    ...shoe,
    cards: resetCards,
    dealtCards: [],
  };
}

/**
 * Default shoe configuration (6-deck, 75% penetration)
 */
export const DEFAULT_SHOE_CONFIG: ShoeConfig = {
  deckCount: 6,
  penetration: 0.75,
};
