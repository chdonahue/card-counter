import { motion } from 'motion/react';
import type { Card as CardType, Suit, Rank } from '../../types/card';
import type { CountOverlay } from '../../core/counting/CountingSystem';

export interface CardProps {
  card: CardType;
  overlay?: CountOverlay | 'none';
  overlayIntensity?: 'bold' | 'subtle' | 'flash' | 'none';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onAnimationComplete?: () => void;
}

// Outline colors for count values - cyan/magenta for maximum pop
const OUTLINE_COLORS = {
  positive: '#00ffff', // Cyan - good for player (+1)
  negative: '#ff00ff', // Magenta - bad for player (-1)
  neutral: 'transparent', // No outline
};

// Outline width based on intensity
const OUTLINE_WIDTH = {
  bold: 4,
  subtle: 2,
  flash: 2,
  none: 0,
};

// Card dimensions based on size (proper 2.5:3.5 poker ratio = 210:315)
const SIZES = {
  sm: { width: 58, height: 87 },
  md: { width: 83, height: 124 },
  lg: { width: 113, height: 170 },
};

// Map our suit names to file naming convention
const SUIT_MAP: Record<Suit, string> = {
  hearts: 'heart',
  diamonds: 'diamond',
  clubs: 'club',
  spades: 'spade',
};

// Map our rank names to file naming convention
const RANK_MAP: Record<Rank, string> = {
  'A': 'Ace',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  'J': 'Jack',
  'Q': 'Queen',
  'K': 'King',
};

function getCardFilename(suit: Suit, rank: Rank): string {
  return `/cards/${SUIT_MAP[suit]}${RANK_MAP[rank]}.svg`;
}

export function Card({
  card,
  overlay = 'none',
  overlayIntensity = 'none',
  size = 'md',
  className = '',
  onAnimationComplete,
}: CardProps) {
  const dims = SIZES[size];
  const cardFile = getCardFilename(card.suit, card.rank);

  // Determine outline color and width
  const outlineColor = overlay !== 'none' ? OUTLINE_COLORS[overlay] : 'transparent';
  const outlineWidth = overlayIntensity !== 'none' ? OUTLINE_WIDTH[overlayIntensity] : 0;
  const hasOutline = overlay !== 'none' && overlay !== 'neutral' && outlineWidth > 0;

  return (
    <motion.div
      className={className}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onAnimationComplete={onAnimationComplete}
      style={{
        width: dims.width,
        height: dims.height,
        perspective: 1000,
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: card.faceUp ? 'rotateY(0deg)' : 'rotateY(180deg)',
        }}
      >
        {/* Card Front */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 8,
            boxShadow: hasOutline
              ? `0 0 0 1px #000, 0 0 0 ${outlineWidth + 1}px ${outlineColor}, 0 0 0 ${outlineWidth + 2}px #000, 0 4px 8px rgba(0, 0, 0, 0.3)`
              : '0 4px 8px rgba(0, 0, 0, 0.3)',
            backfaceVisibility: 'hidden',
            overflow: 'hidden',
            backgroundColor: 'white',
            transition: 'box-shadow 0.2s ease',
          }}
        >
          <img
            src={cardFile}
            alt={`${card.rank} of ${card.suit}`}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'fill',
            }}
          />
        </div>

        {/* Card Back */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 8,
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            overflow: 'hidden',
            backgroundColor: 'white',
          }}
        >
          <img
            src="/cards/blueBack.svg"
            alt="Card back"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'fill',
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default Card;
