import { describe, it, expect } from 'vitest';
import type { Card } from '../../../types/card';
import {
  getCardValue,
  evaluateHand,
  createHand,
  addCardToHand,
  canSplit,
  canDoubleDown,
  dealerShowsAce,
  formatHandValue,
} from '../Hand';

// Helper to create a card quickly
function card(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { id: `test-${suit}-${rank}`, suit, rank, faceUp: true };
}

describe('getCardValue', () => {
  it('returns 1 for Ace', () => {
    expect(getCardValue('A')).toBe(1);
  });

  it('returns face value for number cards', () => {
    expect(getCardValue('2')).toBe(2);
    expect(getCardValue('5')).toBe(5);
    expect(getCardValue('9')).toBe(9);
  });

  it('returns 10 for 10 and face cards', () => {
    expect(getCardValue('10')).toBe(10);
    expect(getCardValue('J')).toBe(10);
    expect(getCardValue('Q')).toBe(10);
    expect(getCardValue('K')).toBe(10);
  });
});

describe('evaluateHand', () => {
  it('returns zeros for empty hand', () => {
    const result = evaluateHand([]);
    expect(result).toEqual({
      hard: 0,
      soft: 0,
      best: 0,
      isSoft: false,
      isBlackjack: false,
      isBust: false,
    });
  });

  it('evaluates a simple hand without aces', () => {
    const result = evaluateHand([card('5'), card('10')]);
    expect(result.hard).toBe(15);
    expect(result.soft).toBe(15);
    expect(result.best).toBe(15);
    expect(result.isSoft).toBe(false);
    expect(result.isBust).toBe(false);
  });

  it('evaluates a soft hand with one ace', () => {
    const result = evaluateHand([card('A'), card('6')]);
    expect(result.hard).toBe(7);
    expect(result.soft).toBe(17);
    expect(result.best).toBe(17);
    expect(result.isSoft).toBe(true);
  });

  it('evaluates a hand with ace where soft would bust', () => {
    // A(1) + 6 + 8 = 15 hard; soft 11 would make 25 (bust), so soft stays at 15
    const result = evaluateHand([card('A'), card('6'), card('8')]);
    expect(result.hard).toBe(15);
    expect(result.soft).toBe(15);
    expect(result.best).toBe(15);
    expect(result.isSoft).toBe(false);
    expect(result.isBust).toBe(false);
  });

  it('evaluates two aces', () => {
    const result = evaluateHand([card('A'), card('A')]);
    expect(result.hard).toBe(2);
    expect(result.soft).toBe(12);
    expect(result.best).toBe(12);
    expect(result.isSoft).toBe(true);
  });

  it('detects blackjack (Ace + 10-value)', () => {
    const result = evaluateHand([card('A'), card('K')]);
    expect(result.isBlackjack).toBe(true);
    expect(result.best).toBe(21);
  });

  it('detects blackjack with Ace + 10', () => {
    const result = evaluateHand([card('10'), card('A')]);
    expect(result.isBlackjack).toBe(true);
  });

  it('does not count 3-card 21 as blackjack', () => {
    const result = evaluateHand([card('7'), card('7'), card('7')]);
    expect(result.best).toBe(21);
    expect(result.isBlackjack).toBe(false);
  });

  it('detects bust', () => {
    const result = evaluateHand([card('K'), card('Q'), card('5')]);
    expect(result.hard).toBe(25);
    expect(result.best).toBe(25);
    expect(result.isBust).toBe(true);
    expect(result.isSoft).toBe(false);
  });

  it('handles hand of all face cards', () => {
    const result = evaluateHand([card('J'), card('Q')]);
    expect(result.best).toBe(20);
    expect(result.isBust).toBe(false);
  });

  it('handles single card', () => {
    const result = evaluateHand([card('7')]);
    expect(result.best).toBe(7);
    expect(result.isSoft).toBe(false);
  });

  it('handles single ace as soft 11', () => {
    const result = evaluateHand([card('A')]);
    expect(result.hard).toBe(1);
    expect(result.soft).toBe(11);
    expect(result.best).toBe(11);
    expect(result.isSoft).toBe(true);
  });
});

describe('createHand', () => {
  it('creates an empty hand with no bet', () => {
    const hand = createHand();
    expect(hand.cards).toEqual([]);
    expect(hand.bet).toBeUndefined();
    expect(hand.isDoubledDown).toBe(false);
    expect(hand.isSplit).toBe(false);
    expect(hand.isStanding).toBe(false);
  });

  it('creates an empty hand with a bet', () => {
    const hand = createHand(25);
    expect(hand.bet).toBe(25);
  });
});

describe('addCardToHand', () => {
  it('adds a card to an empty hand', () => {
    const hand = createHand();
    const newHand = addCardToHand(hand, card('A'));
    expect(newHand.cards).toHaveLength(1);
    expect(newHand.cards[0].rank).toBe('A');
  });

  it('does not mutate the original hand', () => {
    const hand = createHand();
    addCardToHand(hand, card('K'));
    expect(hand.cards).toHaveLength(0);
  });

  it('preserves hand properties when adding cards', () => {
    const hand = createHand(50);
    const newHand = addCardToHand(hand, card('5'));
    expect(newHand.bet).toBe(50);
  });
});

describe('canSplit', () => {
  it('returns true for two cards of the same rank', () => {
    const hand = {
      ...createHand(),
      cards: [card('8', 'hearts'), card('8', 'spades')],
    };
    expect(canSplit(hand)).toBe(true);
  });

  it('returns false for two cards of different rank', () => {
    const hand = {
      ...createHand(),
      cards: [card('8'), card('9')],
    };
    expect(canSplit(hand)).toBe(false);
  });

  it('returns false for more than two cards', () => {
    const hand = {
      ...createHand(),
      cards: [card('8'), card('8'), card('8')],
    };
    expect(canSplit(hand)).toBe(false);
  });

  it('returns false for one card', () => {
    const hand = {
      ...createHand(),
      cards: [card('8')],
    };
    expect(canSplit(hand)).toBe(false);
  });
});

describe('canDoubleDown', () => {
  it('returns true for two-card hand that has not doubled', () => {
    const hand = {
      ...createHand(),
      cards: [card('5'), card('6')],
    };
    expect(canDoubleDown(hand)).toBe(true);
  });

  it('returns false if already doubled down', () => {
    const hand = {
      ...createHand(),
      cards: [card('5'), card('6')],
      isDoubledDown: true,
    };
    expect(canDoubleDown(hand)).toBe(false);
  });

  it('returns false for three cards', () => {
    const hand = {
      ...createHand(),
      cards: [card('5'), card('6'), card('2')],
    };
    expect(canDoubleDown(hand)).toBe(false);
  });
});

describe('dealerShowsAce', () => {
  it('returns true when dealer shows an ace', () => {
    expect(dealerShowsAce(card('A'))).toBe(true);
  });

  it('returns false for non-ace cards', () => {
    expect(dealerShowsAce(card('K'))).toBe(false);
    expect(dealerShowsAce(card('5'))).toBe(false);
  });
});

describe('formatHandValue', () => {
  it('formats blackjack', () => {
    const value = evaluateHand([card('A'), card('K')]);
    expect(formatHandValue(value)).toBe('Blackjack!');
  });

  it('formats bust', () => {
    const value = evaluateHand([card('K'), card('Q'), card('5')]);
    expect(formatHandValue(value)).toBe('Bust (25)');
  });

  it('formats soft hand showing both values', () => {
    const value = evaluateHand([card('A'), card('6')]);
    expect(formatHandValue(value)).toBe('7/17');
  });

  it('formats hard hand showing single value', () => {
    const value = evaluateHand([card('10'), card('8')]);
    expect(formatHandValue(value)).toBe('18');
  });
});
