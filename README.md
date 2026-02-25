# Card Counter Pro

A progressive web app for training card counting skills with gamified learning and progressive scaffold removal.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 7** - Build tool with hot reload
- **Tailwind CSS 4** - Styling
- **Motion (Framer Motion)** - Animations
- **Zustand** - State management (planned)
- **vite-plugin-pwa** - PWA support with offline caching

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

## Setup

```bash
# Clone the repository
git clone <repo-url>
cd card_counter

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Mobile Testing with Tunnel

To test the PWA on your phone (especially useful when your computer is on Ethernet):

### 1. Build and start the preview server

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

### 2. Start a cloudflared tunnel

In a separate terminal:

```bash
npx cloudflared tunnel --url http://localhost:4173
```

This will output a public URL like `https://random-words.trycloudflare.com`

### 3. Open on your phone

Navigate to the tunnel URL on your phone's browser. To install as a PWA:

- **iOS Safari**: Tap Share button → "Add to Home Screen"
- **Android Chrome**: Tap menu (⋮) → "Install app" or follow the install banner

## Project Structure

```
src/
├── components/
│   ├── cards/          # Card, Hand, Shoe components
│   ├── training/       # Training module components
│   └── ui/             # Reusable UI components
├── core/               # Framework-agnostic logic
│   ├── blackjack/      # Hand evaluation, basic strategy
│   ├── card/           # Deck, Shoe management
│   └── counting/       # Counting systems (Hi-Lo, etc.)
├── types/              # TypeScript type definitions
└── pages/              # Page components (planned)

public/
├── cards/              # Card sprite SVGs
└── *.png               # PWA icons
```

## Training Modules

### Single Hand Count (Current)
Practice counting individual blackjack hands with progressive scaffolding:

| Level | Visual Aid | Description |
|-------|-----------|-------------|
| Bold | Full color outlines | Cyan (+1), Magenta (-1), clear indicators |
| Subtle | Faint outlines | Reduced opacity, tests recall |
| Flash | Brief flash | 200ms flash on new cards only |
| None | No helpers | Full test mode |

### Planned Modules
- **Running Count** - Track cumulative count across multiple hands
- **Multi-Position** - Multiple hands dealt simultaneously
- **Full Table** - Realistic casino simulation with betting decisions

## Design System

### Colors
- **Cyan (#00ffff)** - +1 cards (2-6)
- **Magenta (#ff00ff)** - -1 cards (10-A)
- **No outline** - 0 cards (7-9)
- **Background** - Dark theme (#0d1117)

## PWA Features

- Installable on iOS and Android home screens
- Offline support - works without internet after first load
- Auto-updates when new versions are deployed

## Regenerating PWA Icons

If you update `public/favicon.svg`, regenerate the PNG icons:

```bash
node scripts/generate-icons.mjs
```

## License

MIT
