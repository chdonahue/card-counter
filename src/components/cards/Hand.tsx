import { AnimatePresence } from 'motion/react';
import { Card } from './Card';
import type { BlackjackHand } from '../../core/blackjack';
import { evaluateHand, formatHandValue } from '../../core/blackjack';
import type { CountingSystem } from '../../core/counting/CountingSystem';
import { getCountOverlay } from '../../core/counting/CountingSystem';

export interface HandProps {
  hand: BlackjackHand;
  countingSystem?: CountingSystem;
  showOverlays?: boolean;
  overlayIntensity?: 'bold' | 'subtle' | 'flash' | 'none';
  flashIndex?: number; // Only show overlay on this card index (-1 means show all or none based on showOverlays)
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

// Card overlap amount (how much each card overlaps the previous)
const OVERLAP = {
  sm: 30,
  md: 45,
  lg: 60,
};

// Card widths for calculating total hand width
const CARD_WIDTHS = {
  sm: 58,
  md: 83,
  lg: 113,
};

export function Hand({
  hand,
  countingSystem,
  showOverlays = true,
  overlayIntensity = 'bold',
  flashIndex = -1,
  showValue = true,
  size = 'md',
  label,
}: HandProps) {
  const overlap = OVERLAP[size];
  const cardWidth = CARD_WIDTHS[size];
  const value = evaluateHand(hand.cards);

  // Calculate total width of the hand
  const handWidth = hand.cards.length > 0
    ? cardWidth + (hand.cards.length - 1) * (cardWidth - overlap)
    : cardWidth;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Label (e.g., "Player 1", "Dealer") */}
      {label && (
        <span style={{ color: '#9ca3af', fontSize: 12 }}>{label}</span>
      )}

      {/* Cards container */}
      <div
        style={{
          position: 'relative',
          width: handWidth,
          height: size === 'sm' ? 87 : size === 'md' ? 124 : 170,
          minWidth: cardWidth,
        }}
      >
        <AnimatePresence mode="popLayout">
          {hand.cards.map((card, index) => {
            const countValue = countingSystem?.getCountValue(card.rank);

            // Determine if this card should show overlay
            // If flashIndex >= 0, only that card shows overlay
            // Otherwise, showOverlays controls all cards
            const shouldShowOverlay = flashIndex >= 0
              ? index === flashIndex
              : showOverlays;

            const overlay = shouldShowOverlay && countValue !== undefined
              ? getCountOverlay(countValue)
              : 'none';

            return (
              <div
                key={card.id}
                style={{
                  position: 'absolute',
                  left: index * (cardWidth - overlap),
                  zIndex: index,
                }}
              >
                <Card
                  card={card}
                  overlay={overlay}
                  overlayIntensity={shouldShowOverlay ? overlayIntensity : 'none'}
                  size={size}
                />
              </div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {hand.cards.length === 0 && (
          <div
            style={{
              width: cardWidth,
              height: '100%',
              border: '2px dashed #374151',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#6b7280', fontSize: 12 }}>Empty</span>
          </div>
        )}
      </div>

      {/* Hand value display */}
      {showValue && hand.cards.length > 0 && (
        <div
          style={{
            padding: '4px 12px',
            backgroundColor: value.isBust ? '#7f1d1d' : value.isBlackjack ? '#14532d' : '#1f2937',
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 600,
            color: value.isBust ? '#fca5a5' : value.isBlackjack ? '#86efac' : '#e5e7eb',
          }}
        >
          {formatHandValue(value)}
        </div>
      )}
    </div>
  );
}

export default Hand;
