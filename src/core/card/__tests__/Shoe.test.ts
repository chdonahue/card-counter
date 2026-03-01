import { describe, it, expect } from 'vitest';
import type { Card } from '../../../types/card';
import { SUITS, RANKS } from '../../../types/card';
import {
  fisherYatesShuffle,
  createDeck,
  createShoe,
  dealCard,
  getDecksRemaining,
  reshuffleShoe,
  DEFAULT_SHOE_CONFIG,
} from '../Shoe';

describe('fisherYatesShuffle', () => {
  it('returns an array of the same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = fisherYatesShuffle(arr);
    expect(shuffled).toHaveLength(arr.length);
  });

  it('contains all the same elements', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = fisherYatesShuffle(arr);
    expect(shuffled.sort((a, b) => a - b)).toEqual(arr);
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    fisherYatesShuffle(arr);
    expect(arr).toEqual(copy);
  });

  it('handles empty array', () => {
    expect(fisherYatesShuffle([])).toEqual([]);
  });

  it('handles single element', () => {
    expect(fisherYatesShuffle([42])).toEqual([42]);
  });
});

describe('createDeck', () => {
  it('creates 52 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('contains all suits and ranks', () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const found = deck.find(c => c.suit === suit && c.rank === rank);
        expect(found).toBeDefined();
      }
    }
  });

  it('creates cards with faceUp = false', () => {
    const deck = createDeck();
    expect(deck.every(c => c.faceUp === false)).toBe(true);
  });

  it('includes deck index in card ids', () => {
    const deck = createDeck(3);
    expect(deck.every(c => c.id.startsWith('3-'))).toBe(true);
  });

  it('uses 0 as default deck index', () => {
    const deck = createDeck();
    expect(deck.every(c => c.id.startsWith('0-'))).toBe(true);
  });
});

describe('createShoe', () => {
  it('creates a shoe with correct number of cards', () => {
    const shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    expect(shoe.cards).toHaveLength(52);

    const shoe6 = createShoe({ deckCount: 6, penetration: 0.75 });
    expect(shoe6.cards).toHaveLength(312);
  });

  it('starts with no dealt cards', () => {
    const shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    expect(shoe.dealtCards).toHaveLength(0);
  });

  it('stores the config', () => {
    const config = { deckCount: 6 as const, penetration: 0.75 };
    const shoe = createShoe(config);
    expect(shoe.config).toEqual(config);
  });

  it('calculates cut card position based on penetration', () => {
    const shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    expect(shoe.cutCardPosition).toBe(39); // 52 * 0.75 = 39
  });
});

describe('dealCard', () => {
  it('deals the first card from the shoe', () => {
    const shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    const firstCard = shoe.cards[0];
    const result = dealCard(shoe);

    expect(result).not.toBeNull();
    expect(result!.card.rank).toBe(firstCard.rank);
    expect(result!.card.suit).toBe(firstCard.suit);
  });

  it('deals cards face up', () => {
    const shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    const result = dealCard(shoe);
    expect(result!.card.faceUp).toBe(true);
  });

  it('removes the dealt card from remaining cards', () => {
    const shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    const result = dealCard(shoe);
    expect(result!.updatedShoe.cards).toHaveLength(51);
  });

  it('adds the dealt card to dealtCards', () => {
    const shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    const result = dealCard(shoe);
    expect(result!.updatedShoe.dealtCards).toHaveLength(1);
  });

  it('returns null when shoe is empty', () => {
    const shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    const emptiedShoe = { ...shoe, cards: [] as Card[] };
    expect(dealCard(emptiedShoe)).toBeNull();
  });

  it('does not mutate the original shoe', () => {
    const shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    const originalLength = shoe.cards.length;
    dealCard(shoe);
    expect(shoe.cards).toHaveLength(originalLength);
  });

  it('deals all cards sequentially', () => {
    let shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    let count = 0;
    let result = dealCard(shoe);
    while (result !== null) {
      count++;
      shoe = result.updatedShoe;
      result = dealCard(shoe);
    }
    expect(count).toBe(52);
    expect(shoe.dealtCards).toHaveLength(52);
  });
});

describe('getDecksRemaining', () => {
  it('returns correct decks for a full shoe', () => {
    const shoe = createShoe({ deckCount: 6, penetration: 0.75 });
    expect(getDecksRemaining(shoe)).toBe(6);
  });

  it('returns fractional decks after dealing', () => {
    const shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    const result = dealCard(shoe);
    expect(getDecksRemaining(result!.updatedShoe)).toBeCloseTo(51 / 52);
  });
});

describe('reshuffleShoe', () => {
  it('collects all dealt cards back into the shoe', () => {
    let shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    // Deal 10 cards
    for (let i = 0; i < 10; i++) {
      const result = dealCard(shoe)!;
      shoe = result.updatedShoe;
    }
    expect(shoe.cards).toHaveLength(42);
    expect(shoe.dealtCards).toHaveLength(10);

    const reshuffled = reshuffleShoe(shoe);
    expect(reshuffled.cards).toHaveLength(52);
    expect(reshuffled.dealtCards).toHaveLength(0);
  });

  it('resets all cards to face down', () => {
    let shoe = createShoe({ deckCount: 1, penetration: 0.75 });
    const result = dealCard(shoe)!;
    shoe = result.updatedShoe;

    const reshuffled = reshuffleShoe(shoe);
    expect(reshuffled.cards.every(c => c.faceUp === false)).toBe(true);
  });

  it('preserves config after reshuffle', () => {
    const config = { deckCount: 6 as const, penetration: 0.8 };
    const shoe = createShoe(config);
    const reshuffled = reshuffleShoe(shoe);
    expect(reshuffled.config).toEqual(config);
  });
});

describe('DEFAULT_SHOE_CONFIG', () => {
  it('uses 6 decks with 75% penetration', () => {
    expect(DEFAULT_SHOE_CONFIG.deckCount).toBe(6);
    expect(DEFAULT_SHOE_CONFIG.penetration).toBe(0.75);
  });
});
