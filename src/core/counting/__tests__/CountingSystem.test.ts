import { describe, it, expect } from 'vitest';
import type { Card } from '../../../types/card';
import { RANKS } from '../../../types/card';
import {
  calculateRunningCount,
  calculateTrueCount,
  getCountOverlay,
} from '../CountingSystem';
import { HiLoSystem } from '../systems/HiLo';

// Helper to create a card quickly
function card(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { id: `test-${suit}-${rank}`, suit, rank, faceUp: true };
}

describe('HiLoSystem', () => {
  it('has correct metadata', () => {
    expect(HiLoSystem.id).toBe('hi-lo');
    expect(HiLoSystem.name).toBe('Hi-Lo');
    expect(HiLoSystem.isPremium).toBe(false);
    expect(HiLoSystem.difficulty).toBe('beginner');
  });

  it('assigns +1 to low cards (2-6)', () => {
    expect(HiLoSystem.getCountValue('2')).toBe(1);
    expect(HiLoSystem.getCountValue('3')).toBe(1);
    expect(HiLoSystem.getCountValue('4')).toBe(1);
    expect(HiLoSystem.getCountValue('5')).toBe(1);
    expect(HiLoSystem.getCountValue('6')).toBe(1);
  });

  it('assigns 0 to neutral cards (7-9)', () => {
    expect(HiLoSystem.getCountValue('7')).toBe(0);
    expect(HiLoSystem.getCountValue('8')).toBe(0);
    expect(HiLoSystem.getCountValue('9')).toBe(0);
  });

  it('assigns -1 to high cards (10, J, Q, K, A)', () => {
    expect(HiLoSystem.getCountValue('10')).toBe(-1);
    expect(HiLoSystem.getCountValue('J')).toBe(-1);
    expect(HiLoSystem.getCountValue('Q')).toBe(-1);
    expect(HiLoSystem.getCountValue('K')).toBe(-1);
    expect(HiLoSystem.getCountValue('A')).toBe(-1);
  });

  it('is balanced (full deck sums to 0)', () => {
    let sum = 0;
    for (const rank of RANKS) {
      const count = rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K'
        ? 1  // each face card appears once per suit
        : 1;
      sum += HiLoSystem.getCountValue(rank) * 4; // 4 suits
    }
    expect(sum).toBe(0);
  });
});

describe('calculateRunningCount', () => {
  it('returns 0 for no cards', () => {
    expect(calculateRunningCount([], HiLoSystem)).toBe(0);
  });

  it('calculates positive running count for low cards', () => {
    const cards = [card('2'), card('3'), card('4'), card('5'), card('6')];
    expect(calculateRunningCount(cards, HiLoSystem)).toBe(5);
  });

  it('calculates negative running count for high cards', () => {
    const cards = [card('10'), card('J'), card('Q'), card('K'), card('A')];
    expect(calculateRunningCount(cards, HiLoSystem)).toBe(-5);
  });

  it('calculates zero for neutral cards', () => {
    const cards = [card('7'), card('8'), card('9')];
    expect(calculateRunningCount(cards, HiLoSystem)).toBe(0);
  });

  it('calculates correct count for mixed cards', () => {
    // +1, +1, 0, -1, -1 = 0
    const cards = [card('2'), card('5'), card('7'), card('K'), card('A')];
    expect(calculateRunningCount(cards, HiLoSystem)).toBe(0);
  });

  it('handles a realistic sequence', () => {
    // Deal: 3(+1), 7(0), K(-1), 2(+1), A(-1), 5(+1), 10(-1) = 0
    const cards = [
      card('3'), card('7'), card('K'), card('2'),
      card('A'), card('5'), card('10'),
    ];
    expect(calculateRunningCount(cards, HiLoSystem)).toBe(0);
  });
});

describe('calculateTrueCount', () => {
  it('divides running count by decks remaining', () => {
    expect(calculateTrueCount(6, 3)).toBe(2);
  });

  it('rounds to 1 decimal place', () => {
    expect(calculateTrueCount(7, 3)).toBe(2.3);
  });

  it('returns running count when decks remaining is 0 or less', () => {
    expect(calculateTrueCount(5, 0)).toBe(5);
    expect(calculateTrueCount(5, -1)).toBe(5);
  });

  it('handles negative running count', () => {
    expect(calculateTrueCount(-6, 2)).toBe(-3);
  });

  it('handles fractional decks', () => {
    expect(calculateTrueCount(4, 0.5)).toBe(8);
  });
});

describe('getCountOverlay', () => {
  it('returns positive for positive counts', () => {
    expect(getCountOverlay(1)).toBe('positive');
    expect(getCountOverlay(5)).toBe('positive');
  });

  it('returns negative for negative counts', () => {
    expect(getCountOverlay(-1)).toBe('negative');
    expect(getCountOverlay(-5)).toBe('negative');
  });

  it('returns neutral for zero', () => {
    expect(getCountOverlay(0)).toBe('neutral');
  });
});
