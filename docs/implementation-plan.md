# Card Counting Trainer - Implementation Plan

## Overview

A progressive web app (PWA) for training card counting skills with gamified learning, progressive scaffold removal, and full blackjack gameplay.

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 18 + TypeScript | Large ecosystem, great tooling, maintainable |
| Build | Vite 6 | Fast dev server, excellent PWA plugin |
| Styling | Tailwind CSS 4 | Rapid development, small bundle |
| Animation | Motion (Framer Motion) | Declarative, React-first, spring physics |
| State | Zustand | Minimal boilerplate, built-in persistence |
| Payments | LemonSqueezy | Simple license key system, no backend needed |
| Hosting | Vercel or Cloudflare Pages | Free, fast, zero-config |
| Card Assets | SVG sprite | Single file with all 52 cards, vector quality |

## Design Direction

**Casino Dark Theme**
- Background: Deep blacks and dark greens (#0d1117, #1a2e1a)
- Accent: Gold/amber for highlights (#d4af37)
- Cards: Classic casino-style with crisp edges
- Felt texture: Subtle green felt pattern for table areas
- Typography: Clean sans-serif, high contrast for readability
- Color overlays: Green (+1), Red (-1), Gray (0) - visible against dark bg

## Project Structure

```
card_counter/
├── public/
│   ├── icons/                    # PWA icons
│   └── cards/                    # Card SVGs
│
├── src/
│   ├── components/
│   │   ├── ui/                   # Button, Modal, Slider, etc.
│   │   ├── cards/                # Card, Hand, CardOverlay
│   │   ├── training/             # CountingTrainer, CountPrompt, SpeedControls
│   │   ├── blackjack/            # BlackjackTable, BettingControls, StrategyHint
│   │   └── stats/                # SessionStats, ProgressChart
│   │
│   ├── pages/
│   │   ├── Home.tsx              # Dashboard
│   │   ├── Training.tsx          # Counting trainer
│   │   ├── Blackjack.tsx         # Full game mode
│   │   ├── Stats.tsx             # Statistics
│   │   └── Unlock.tsx            # Premium upgrade
│   │
│   ├── core/                     # Framework-agnostic logic
│   │   ├── card/                 # Card, Deck, Shoe
│   │   ├── counting/             # CountingSystem, HiLo, OmegaII, etc.
│   │   ├── blackjack/            # GameState, BasicStrategy
│   │   └── training/             # Phase, Verification, Progression
│   │
│   ├── stores/                   # Zustand stores with persistence
│   │   ├── useTrainingStore.ts
│   │   ├── useStatsStore.ts
│   │   └── useLicenseStore.ts
│   │
│   ├── hooks/                    # useCardAnimation, useCountingTimer
│   └── types/                    # TypeScript interfaces
│
├── vite.config.ts               # Vite + PWA config
└── tailwind.config.ts
```

## Core Data Models

### Card & Shoe
```typescript
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | ... | 'K';

interface Card { id: string; suit: Suit; rank: Rank; faceUp: boolean; }
interface Shoe { cards: Card[]; dealtCards: Card[]; penetration: number; }
```

### Training
```typescript
enum TrainingPhase {
  PHASE_1 = 1,  // Bold overlays + count shown
  PHASE_2 = 2,  // Subtle tints + count shown
  PHASE_3 = 3,  // Brief flash only
  PHASE_4 = 4,  // No visual aid
}

interface TrainingConfig {
  system: string;        // 'hi-lo', 'omega-ii', etc.
  deckCount: 1-8;
  penetration: 0.0-1.0;
  speed: number;         // cards per second
  phase: TrainingPhase;
  checkFrequency: number;
}
```

### Counting Systems
```typescript
interface CountingSystem {
  id: string;
  name: string;
  isPremium: boolean;
  getCountValue(rank: Rank): number;
}

// Hi-Lo: 2-6 = +1, 7-9 = 0, 10-A = -1
// Omega II: 2,3,7 = +1, 4-6 = +2, 9 = -1, 10-K = -2, A = 0
// Zen Count: 2,3,7 = +1, 4-6 = +2, 10-K = -2, A = -1
// Wong Halves: Fractional values
```

## Implementation Phases

### Phase 1: Foundation
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Create Card component with flip animation
- [ ] Implement Deck/Shoe logic with Fisher-Yates shuffle
- [ ] Basic card dealing animation

**Milestone:** Cards animate from deck to table

### Phase 2: Counting Trainer MVP
- [ ] Implement CountingSystem interface + Hi-Lo
- [ ] Speed-controlled card dealing loop
- [ ] Phase 1 color overlays (bold: green/red/gray)
- [ ] Running count display
- [ ] "What's the count?" prompt
- [ ] End-of-shoe verification
- [ ] Basic accuracy tracking

**Milestone:** Can practice Hi-Lo with Phase 1 scaffolding

### Phase 3: Training Polish
- [ ] All 4 training phases (bold → subtle → flash → none)
- [ ] True count calculation (running ÷ decks remaining)
- [ ] Configurable: deck count, penetration, speed
- [ ] Check frequency adjustment
- [ ] Pause/resume functionality

**Milestone:** Complete scaffold removal training experience

### Phase 4: Statistics & Persistence
- [ ] Zustand stores with localStorage persistence
- [ ] Session recording (accuracy, speed, duration)
- [ ] Historical progress charts
- [ ] Weak spot analysis (which counts cause errors)
- [ ] XP/level progression system

**Milestone:** Progress persists, visible improvement tracking

### Phase 5: Additional Counting Systems
- [ ] Omega II implementation
- [ ] Zen Count implementation
- [ ] Wong Halves implementation
- [ ] System selector UI
- [ ] Per-system statistics

**Milestone:** All 4 counting systems functional

### Phase 6: Blackjack Game Mode
- [ ] Game state machine (betting → dealing → player → dealer → payout)
- [ ] Hand evaluation (soft/hard totals, blackjack, bust)
- [ ] Basic strategy lookup tables
- [ ] Strategy feedback (notify on incorrect plays)
- [ ] Bet spread practice based on true count
- [ ] Bankroll tracking

**Milestone:** Full blackjack with learning feedback

### Phase 7: PWA & Polish
- [ ] Configure vite-plugin-pwa
- [ ] Web manifest with icons
- [ ] Service worker for offline caching
- [ ] Install prompt handling
- [ ] Responsive design testing
- [ ] Performance optimization

**Milestone:** Installable offline-capable PWA

### Phase 8: Monetization
- [ ] LemonSqueezy product setup
- [ ] License key validation
- [ ] Premium feature gating:
  - Free: Hi-Lo Phase 1-2, basic stats
  - Premium: All phases, all systems, full stats
- [ ] Unlock page with purchase flow

**Milestone:** Working freemium model

### Phase 9: Launch
- [ ] Deploy to Vercel/Cloudflare
- [ ] Custom domain (optional)
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Help/documentation

**Milestone:** Production launch

## Key Features Detail

### Training Phase Visual System
| Phase | Color Overlay | Running Count | True Count |
|-------|---------------|---------------|------------|
| 1 | Bold (60% opacity) | Visible | Visible |
| 2 | Subtle (30% opacity) | Visible | Visible |
| 3 | Flash (200ms) | Hidden | Hidden |
| 4 | None | Hidden | Hidden |

### Premium Gating
```
FREE TIER:
├── Hi-Lo counting system
├── Training Phase 1-2
├── Basic session stats
└── 1-6 deck configuration

PREMIUM ($15 one-time):
├── All counting systems (Omega II, Zen, Wong Halves)
├── Training Phase 3-4
├── Full statistics & charts
├── Blackjack mode with strategy feedback
├── Bet spread training
└── Data export
```

## Verification Plan

1. **Unit Tests:** Core logic (counting systems, hand evaluation, strategy lookup)
2. **Manual Testing:**
   - Count through a full shoe, verify running + true count
   - Test all 4 training phases transition correctly
   - Verify blackjack strategy feedback against known charts
   - Test offline mode (disable network, app still works)
   - Test on mobile browsers (iOS Safari, Chrome Android)
3. **PWA Testing:**
   - Lighthouse PWA audit
   - Install on iOS/Android home screen
   - Verify offline functionality

## Critical Files

1. `src/core/counting/CountingSystem.ts` - Foundation for all counting features
2. `src/core/card/Shoe.ts` - Deck management with shuffle/penetration
3. `src/components/cards/Card.tsx` - Visual card with animations
4. `src/stores/useTrainingStore.ts` - Training session orchestration
5. `src/core/blackjack/BasicStrategy.ts` - Strategy tables for feedback
