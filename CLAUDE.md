# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check (tsc --noEmit) then production build (outputs to dist/)
npm run preview   # Preview production build locally
npm run lint      # ESLint (flat config, ESLint 9+ with typescript-eslint)
```

There are no test commands — this project has no test suite.

## Architecture

**Stack:** React 19, TypeScript 6, Vite 7, Tailwind CSS 4 (via `@tailwindcss/vite` plugin)

**Deployment:** GitHub Pages via `.github/workflows/deploy.yml` on push to `main`. The Vite base path is `/darts-minigames/`.

### File structure

```
src/
  vite-env.d.ts       # /// <reference types="vite/client" /> — required for CSS imports
  utils/
    checkouts.ts      # dart scoring utilities — THREE_DART_CHECKOUTS, randomUniqueCheckoutNumbers
    gameLogic.ts      # tic-tac-toe game state (pure functions, no React) — all types, WIN_LINES, STORAGE_KEY, LANGUAGE_STORAGE_KEY, all game state functions
    i18n.ts           # getValueByPath, interpolate
  hooks/
    useTranslation.tsx  # TranslationProvider + useTranslation hook (context-based, single language state)
  components/
    Header.tsx          # fixed top header: back button (subpages only) + language selector
    Layout.tsx          # outer bg wrapper, renders Header, pt-14 content slot
    ConfirmModal.tsx    # reusable confirm/cancel modal
    SetupModal.tsx      # tic-tac-toe game setup form
    ClaimModal.tsx      # claim/unclaim modal for shared board mode
    GameBoard.tsx       # 3×3 tile grid
    MatchScoreboard.tsx # match score header card
    RoundOutcome.tsx    # round result banner + action buttons
    BoardTabs.tsx       # player tab switcher for separate-boards mode
    HomePage.tsx        # landing page with game picker cards
  pages/
    TicTacToePage.tsx   # full tic-tac-toe game page (all game state + handlers)
    DartCounterPage.tsx # dart counter page (301/501, 2-6 players)
  App.tsx               # root: TranslationProvider, Layout, page routing via currentPage state
  locales/
    en.json
    de.json
```

### TypeScript

- `tsconfig.json` at project root: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `resolveJsonModule`, `moduleResolution: "bundler"`
- All imports use extensionless paths (e.g. `from "../utils/gameLogic"`)
- Key exported types from `gameLogic.ts`: `PlayerSymbol`, `Claim`, `Board`, `Setup`, `SharedGame`, `SeparateGame`, `Game` (discriminated union on `mode`), `ValidationResult`, `SeparateRoundState`

### Navigation

`App.tsx` derives `currentPage` from `window.location.hash` (via `useState` + `hashchange` listener). Pages navigate by setting `window.location.hash` directly (e.g. `window.location.hash = "/tictactoe"`). Browser back/forward works natively. No `onNavigate` prop — pages are self-contained. `Header.tsx` reads `window.location.hash` directly to decide whether to show the back button.

### Game overview

Dart Checkout Tic-Tac-Toe: players race to claim tiles on a 3×3 grid. Each tile shows a valid dart checkout score. Two board modes:
- **Shared board**: both players compete for the same 9 tiles
- **Separate boards**: each player has their own 3×3 grid with different score ranges

Match tracking uses a configurable "Best Of N" system across multiple rounds.

### Key constants and state

- `WIN_LINES`: 8 winning line combinations (rows, cols, diagonals) — in `utils/gameLogic.ts`
- `STORAGE_KEY` / `LANGUAGE_STORAGE_KEY`: localStorage keys — in `utils/gameLogic.ts`
- Game state is persisted to and hydrated from localStorage on load (in `TicTacToePage`)
- Score generation uses valid 3-dart finishes (2–170, excluding non-checkout scores) — in `utils/checkouts.ts`

### Localization

Translation files at `src/locales/en.json` and `src/locales/de.json`. Translations support template interpolation with single curly braces (e.g. `{playerName}`). Language state lives in `TranslationProvider` (context). All components call `useTranslation()` to get the `t()` function.
