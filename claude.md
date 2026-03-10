# Card Counter Pro

A progressive web app for training card counting skills (Hi-Lo system) with gamified learning and scaffolding removal.

## Design Principles

### Training Philosophy
- **Scaffolding removal**: Start with visual aids, progressively remove them
- **Chunking**: Master small skills before combining them
- **Multiple choice over free input**: Lower friction, faster feedback loops
- **Speed progression**: Accuracy unlocks faster card speeds

### Hi-Lo Counting System
- **+1**: Cards 2-6 (low cards removed = good for player)
- **-1**: Cards 10-A (high cards removed = bad for player)
- **0**: Cards 7-9 (neutral)

### Visual Language
- **Cyan (#00ffff)**: +1 cards - outlined with black edges
- **Magenta (#ff00ff)**: -1 cards - outlined with black edges
- **No outline**: 0 cards
- **Gold (#d4af37)**: Accent/brand color

### Scaffolding Levels
1. **Bold**: Full-strength color outlines while dealing
2. **Subtle**: Dimmed outlines
3. **Flash**: Brief flash then disappears (memory challenge)
4. **None**: No visual hints (pure counting)

### Difficulty Axes
- Speed: 2s → 1s → 0.5s per card
- Scaffolding: Bold → Subtle → Flash → None
- Verification frequency: Every hand → periodic → end of shoe
- Cognitive load: Count only → +Hand total → +Decisions

## Code Quality Rules

### Never Duplicate Component Logic
- **Extend, don't bypass**: If a component doesn't support a needed feature (e.g., `Card` needs a no-animation mode), add a prop to the component. Never copy-paste the component's internals inline.
- **Single source of truth**: Visual constants (colors, sizes, outline widths) must be defined once and imported. Never hardcode values that exist in a component.
- **Shared components exist for a reason**: `/src/components/training/shared/` and `/src/components/ui/` contain reusable pieces. Use them.

### Before Writing New Code
1. Check if an existing component can be extended
2. Check if shared utilities already handle the logic
3. If you need to modify behavior, add a prop—don't fork the code

## Tech Stack
- React 18 + TypeScript
- Vite
- Framer Motion for animations
- Tailwind CSS
- Zustand + localStorage for state persistence

## File Structure
- `/src/core/` - Framework-agnostic logic (card, counting, blackjack)
- `/src/components/training/` - Training module components
- `/src/components/training/shared/` - Reusable training UI
- `/src/components/ui/` - Generic UI components
- `/src/stores/` - Zustand stores
- `/public/cards/` - SVG card assets
