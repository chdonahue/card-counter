import type { Shoe as ShoeType } from '../../core/card/Shoe';

interface ShoeProps {
  shoe: ShoeType;
}

export function Shoe({ shoe }: ShoeProps) {
  const totalCards = shoe.config.deckCount * 52;
  const remainingCards = shoe.cards.length;
  const percentRemaining = remainingCards / totalCards;

  // Fixed dimensions per deck - shoe scales based on deck count
  const deckCount = shoe.config.deckCount;
  const deckHeight = 35; // Fixed height per deck (constant regardless of deck count)
  const shoeWidth = 80;
  const edgeHeight = 6; // Blue bars at top and bottom
  const cardStackMaxHeight = deckHeight * deckCount; // Total card area scales with deck count
  const shoeHeight = cardStackMaxHeight + (edgeHeight * 2); // Total shoe height

  // Current card stack height
  const cardStackHeight = Math.max(0, cardStackMaxHeight * percentRemaining);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Shoe container - fixed size */}
      <div
        style={{
          position: 'relative',
          width: shoeWidth,
          height: shoeHeight,
        }}
      >
        {/* Top edge of shoe (blue bar) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: shoeWidth,
            height: edgeHeight,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1e3a8a 100%)',
            borderRadius: '3px 3px 0 0',
            zIndex: 20,
          }}
        />

        {/* Card stack area (empty space where cards were) */}
        <div
          style={{
            position: 'absolute',
            top: edgeHeight,
            left: 0,
            width: shoeWidth,
            height: cardStackMaxHeight,
            backgroundColor: '#0d1117',
          }}
        />

        {/* Remaining cards stack */}
        <div
          style={{
            position: 'absolute',
            bottom: edgeHeight,
            left: 0,
            width: shoeWidth,
            height: cardStackHeight,
            transition: 'height 0.3s ease',
            overflow: 'hidden',
          }}
        >
          {/* Card edges effect - like looking at the side of stacked cards */}
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `repeating-linear-gradient(
                to top,
                #e8e8e8 0px,
                #e8e8e8 1px,
                #f5f5f5 1px,
                #f5f5f5 3px
              )`,
              borderLeft: '1px solid #ccc',
              borderRight: '1px solid #ccc',
            }}
          />
        </div>

        {/* Deck marker lines - one for each deck boundary */}
        {Array.from({ length: deckCount }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: edgeHeight + deckHeight * i,
              left: 0,
              width: shoeWidth,
              borderTop: '1px dashed #ef4444',
              pointerEvents: 'none',
              zIndex: 10,
            }}
            title={`${i} deck${i !== 1 ? 's' : ''} dealt`}
          />
        ))}

        {/* Bottom edge of shoe (blue bar) */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: shoeWidth,
            height: edgeHeight,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1e3a8a 100%)',
            borderRadius: '0 0 3px 3px',
            zIndex: 20,
          }}
        />
      </div>

      {/* Label */}
      <span style={{ color: '#9ca3af', fontSize: 12 }}>Shoe</span>
    </div>
  );
}

export default Shoe;
