# Card Counter Pro - Project Context

## Overview
A progressive web app for training card counting skills (Hi-Lo system) with gamified learning and scaffold removal.

## Current State
- Single Hand Count Training module is functional
- Scaffolding levels: Bold, Subtle, Flash, None
- Optional "Ask Hand Total" mode for advanced training
- Cards use cyan/magenta outlines with black edges for count indicators

## Design Decisions

### Colors
- **Cyan (#00ffff)** = +1 cards (2-6) - good for player
- **Magenta (#ff00ff)** = -1 cards (10-A) - bad for player
- **No outline** = 0 cards (7-9)
- Black inner/outer edges on color outlines for pop against dark background

### Training Progression (Planned)
1. **Single Hand Count** (current) - count one hand at a time, chunking skill
2. **Running Count** - multiple hands, track cumulative count
3. **Multi-Position** - 2-3 hands dealt simultaneously
4. **Full Table** - dealer + players, realistic pace, bet sizing

### Difficulty Axes
- **Speed**: 2s → 1s → 0.5s per card
- **Scaffolding**: Bold → Subtle → Flash → None
- **Verification**: Every hand → every N hands → end of shoe
- **Cognitive load**: Count only → Count + Hand total → Count + Total + Decisions

## TODOs

### Mobile UX (High Priority for Mobile Phase)
- [ ] **Hand total input**: Current button grid (4-21 + Bust) is bad for mobile. Consider:
  - Number pad (phone dialer style)
  - Stepper (+/- buttons)
  - Swipe/scroll picker
  - Simple text input
  - Location: `SingleHandTrainer.tsx` in the `asking-total` state

### Future Modules
- [ ] Running Count trainer (string hands together)
- [ ] Multi-position trainer (multiple hands at once)
- [ ] Full table simulation with betting decisions
- [ ] Speed auto-progression (gets faster as accuracy improves)

### Polish
- [ ] Hide debug controls (speed slider, scaffolding selector) in "real" training mode
- [ ] Add Duolingo-style curriculum that unlocks progressively
- [ ] Statistics persistence (Zustand + localStorage)
- [ ] PWA setup for offline use

## Tech Stack
- React 18 + TypeScript
- Vite 6
- Motion (Framer Motion) for animations
- Tailwind CSS (configured but using inline styles currently)
- Zustand for state (planned)
- LemonSqueezy for payments (planned)

## File Structure Notes
- `/src/core/` - Framework-agnostic logic (reusable)
- `/src/components/` - React components
- `/src/components/training/` - Training module components
- `/public/cards/` - SVG card assets (saulspatz/SVGCards)
