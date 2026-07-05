# Progress

---

## Task 7 — Dart Counter: In-game statistics + post-game statistics screen ✅

### What was done

**New files created:**
- `src/utils/dartCounterTypes.ts` — shared types and stats computation utilities
- `src/components/DartCounterStats.tsx` — post-game statistics screen component

**Modified files:**
- `src/pages/DartCounterPage.tsx` — integrated types from `dartCounterTypes.ts`, extended history tracking, added live stats, history popup, routing to stats screen
- `src/locales/en.json` + `src/locales/de.json` — added `counter.stats.*` and `counter.history.*` keys

**`dartCounterTypes.ts` exports:**
- `MatchFormat`, `HistoryEntry`, `LegHistory`, `CounterPlayer`, `CounterGame`, `PlayerStats` — all shared types (removed from `DartCounterPage.tsx`)
- `HistoryEntry` extended with: `noScore`, `dartsThrown`, `remainingAfter`, `doubleAttempted`, `doubleHit`
- `CounterPlayer` extended with: `completedLegs: LegHistory[]` — stores completed leg history snapshots
- `LegHistory` — `{ history, setNum, legNum, won }` — a full leg's throw record
- `getPlayerLegs(player, game)` — combines `completedLegs` with current in-progress leg
- `remainingBefore(entry)` — derives remaining score before an entry (for avgUntil* stats)
- `computePlayerStats(legs, startingScore): PlayerStats` — computes all stats from leg history

**Stats computed in `PlayerStats`:**
- `legsPlayed`, `legsWon`, `totalDarts`
- `avgOverall` — total scored / total visits
- `avgFirst9/12/15` — average for first 3/4/5 visits per leg across all legs
- `avgUntil100/170` — average of all visits where remaining was above 100/170
- `checkoutAvg`, `highestCheckout` — from winning leg last entries
- `doublesHit`, `doublesAttempted` — tracked per throw
- `bestLegDarts`, `bestLegAvg` — from best won leg (fewest darts)
- `highscore` — highest non-bust score in a single visit
- `buckets[11]` — visit count by score range: No Score, 1–19, 20+, 40+, 60+, 80+, 100+, 120+, 140+, 160+, 180

**`DartCounterStats.tsx`:**
- Tab bar: "Game" (all legs) + per-leg tabs (labeled "Leg N" or "Set N Leg N" when sets > 1)
- Stats table with 4 sections: Summary, 3-Dart Average, Checkout, Best, Visits
- Double rows (Doubles, Double %) hidden when `matchFormat.doubleOut = false`
- Winner column highlighted in cyan; winner name has 🏆
- Play again / New game buttons at bottom

**Changes to `DartCounterPage.tsx`:**
- All types imported from `dartCounterTypes.ts` (removed local definitions)
- `commitThrow` now populates all `HistoryEntry` fields: `dartsThrown` accumulates from previous entry, `remainingAfter` is the new score, `doubleAttempted` set when `doubleOut=true && score <= 170`, `doubleHit` passed via `extras`
- `handleSubmitScore(score, extras?)` accepts `{ noScore?: boolean }` extra
- `pressNoScore` passes `{ noScore: true }` — score is 0 but tagged as intentional
- `confirmDoubleOut(true)` passes `{ doubleHit: true }` to `commitThrow`
- `handleNextLeg` snapshots each player's current history into `completedLegs` before clearing
- `handlePlayAgain` / `handleStartGame` initialize `completedLegs: []`
- `hydrateGame` hydrates `completedLegs` via `hydrateLeg` → `hydrateEntry` functions
- Win screen: replaced win overlay with `<DartCounterStats game={game} onPlayAgain={handlePlayAgain} onNewGame={goToSetup} />`
- **Live stats row** in each player card: "Avg: X.X / Y.Y · D%: N% · Darts: N" (leg avg / overall avg, double %, darts this leg)
- **History popup**: clicking any player card opens a bottom-sheet modal showing throws in reverse order; tap backdrop or ✕ to close

### Key design decisions
- `dartCounterTypes.ts` was created as a shared module to avoid circular imports between `DartCounterPage.tsx` and `DartCounterStats.tsx`
- `dartsThrown` accumulates as `prev.dartsThrown + 3` per visit (3 darts per visit); stored in entry to avoid recomputing from index position across legs
- `doubleAttempted` is set automatically based on `doubleOut=true && remaining <= 170` — no user input needed
- `getPlayerLegs` appends the current in-progress leg to `completedLegs` so stats always include the live leg
- `historyPopupPlayer: number | null` state manages the popup — no new modal component, inline IIFE render for simplicity

---

## Task 6 — Dart Counter: Numpad input + save/resume flow ✅

### What was done

**Modified files:**
- `src/pages/DartCounterPage.tsx` — replaced text input with numpad, added leave/resume flow
- `src/components/Header.tsx` — added module-level back interceptor (`setBackInterceptor`)
- `src/locales/en.json` + `src/locales/de.json` — added `counter.leave.*`, `counter.resume.*`, `counter.game.rest`, `counter.game.noScore`, `counter.game.clear`

**Numpad panel (fixed-bottom, `z-40`):**
- 5-column grid: left shortcuts (amber) | digits 1–9 | right shortcuts (amber) | bottom row
- Top row: Undo (cyan when active) | input display (cyan when valid, submit on tap) | Rest
- Rows 2–4: shortcuts 26/41/45 (left), 1–9 (center), 60/85/100 (right) — all amber-accented
- Bottom row: CLR (red), 0 (span 2, grey digit), No Score (span 2, emerald)
- State: `numpadInput: string` (digit string built left-to-right); pressing display submits `parseInt(numpadInput)`
- `pressDigit`: ignores leading zeros past first, ignores digits that would exceed 180
- `pressShortcut`: immediately calls `handleSubmitScore(score)` without display input
- `pressRest`: submits `currentScore − numpadValue` (can be bust if negative)
- `pressNoScore`: submits 0 (moves to next player, recorded in history as 0)
- Numpad hidden when any modal/overlay is open (`anyModalOpen`)
- Main content has `pb-80` to clear the numpad height

**Back button intercept (module-level singleton in `Header.tsx`):**
- `_backInterceptor: (() => void) | null` — set by DartCounterPage when game is in progress
- Header's back button calls interceptor if set, else navigates home normally
- DartCounterPage sets interceptor via `useEffect([gameInProgress])`, clears on unmount

**Leave modal (shown when back is pressed during active game):**
- "Save & exit" (primary/cyan) — ensures game is in localStorage, navigates home
- "Stop game" (destructive/red) — clears localStorage, navigates home
- "Cancel" — dismisses modal, stays in game

**Resume flow:**
- `loadSavedGame()` called during `useState` init — reads localStorage, validates, checks `inProgress: true`
- `savedGame` state (static, set once): the hydrated game if one exists
- `showResumeModal` initialized to `!!savedGame`
- Resume modal shown on top of setup screen:
  - "Continue" — calls `setGame(savedGame)`
  - "New game" — clears localStorage, dismisses modal
- Setup form pre-filled with saved game's settings (player names, score, match format)

**`inProgress` field on `CounterGame`:**
- Always `true` when game starts / is active
- Set to `false` in `applyLegWin` when match is won
- `hydrateGame` reads it; `loadSavedGame` returns `null` if `!inProgress` (won games don't prompt resume)
- Won games are cleared from localStorage on next load (`loadSavedGame` removes them)

**Removed from game screen:** text input in active player card, standalone Undo + Reset buttons at bottom

### Key design decisions
- Module-level interceptor in `Header.tsx` instead of React context — avoids prop drilling through App → Layout → Header while keeping components self-contained. Only one interceptor can be active at a time (DartCounterPage manages lifecycle via useEffect cleanup).
- Numpad display tap = submit (not auto-submit on 3 digits) — prevents accidental submissions and keeps the user in control.
- `pressShortcut` calls `handleSubmitScore` directly, bypassing `numpadInput` state, so the display resets cleanly after a shortcut.
- Resume modal uses `savedGame` from useState initializer (runs synchronously on mount) — no loading flicker.

---

## Task 5 — Dart Counter: Match structure (Best Of Legs / Sets) ✅

### What was done

**Modified files:**
- `src/pages/DartCounterPage.tsx` — full rewrite to add match structure support
- `src/locales/en.json` + `src/locales/de.json` — added new `counter.setup.*` and `counter.game.*` keys

**New types added to `DartCounterPage.tsx`:**
- `MatchFormat` — `{ bestOfSets, bestOfLegs, doubleIn, doubleOut }`
- `CounterPlayer` extended — added `legsWon`, `setsWon`, `hasOpenedScoring`
- `CounterGame` extended — added `matchFormat`, `currentSet`, `currentLeg`, `legWinner`, `legWinnerWonSet`

**Setup screen additions:**
- Best of Legs / Best of Sets number inputs (side by side, default 1)
- Double In / Double Out toggles (pill-style on/off switches, default off)
- Validation for legs/sets >= 1 with error messages

**New `applyLegWin` pure helper:**
- Increments `legsWon` for winner; checks if `legsWon >= ceil(bestOfLegs/2)` for set win
- On set win: increments `setsWon`, resets all players' `legsWon` to 0; checks `setsWon >= ceil(bestOfSets/2)` for match win
- Returns updated game state with `winner` (match won), or `legWinner` + `legWinnerWonSet` (leg/set won, match continues)

**Leg/Set win flow:**
- `currentLeg` / `currentSet` counters update only when user clicks "Next Leg" / "Next Set" (not at the moment of the win), so the header shows the completed leg/set during the overlay
- `handleNextLeg` resets player scores, history, `hasOpenedScoring`, and advances leg/set counters

**Game screen changes:**
- Header shows "Set N · Leg N" when bestOfSets > 1 or bestOfLegs > 1
- Player cards show compact `NL NS` counters when legs/sets > 1
- "DI ✓" badge shown on players who have opened scoring in Double In mode
- "Must hit a double" row in active player card with "Doubled in ✓" toggle (default off) when player hasn't opened

**Leg/Set winner overlay (z-50, cyan):**
- Shows "{name} wins the leg!" or "{name} wins the set!" depending on `legWinnerWonSet`
- Undo button (link style) available if `canUndo`
- "Next Leg" / "Next Set" button to advance

**Double Out:**
- When `doubleOut = true` and player reaches exactly 0, commits the score into a `doubleOutConfirm` state instead of immediately applying
- Uses `ConfirmModal` to ask "Did you finish on a double?" — Yes = win, No = bust

**Double In:**
- `hasOpenedScoring` initialized to `!doubleIn` on game start (so when doubleIn=false, all players start as opened)
- When player hasn't opened: score is discarded (effectiveScore = 0) unless they toggle "Doubled in ✓"
- On first successful scored throw with the toggle: `hasOpenedScoring` becomes true permanently for that player

**Backward compat in `hydrateGame`:**
- Missing `matchFormat` defaults to `{ bestOfSets:1, bestOfLegs:1, doubleIn:false, doubleOut:false }`
- Missing player fields (`legsWon`, `setsWon`, `hasOpenedScoring`) default gracefully

### Key design decisions
- `legWinner` / `legWinnerWonSet` are set at the moment of the winning throw; counter advances (`currentLeg`, `currentSet`) happen when user clicks through the overlay — so the overlay context is clear ("you just won Leg 2")
- `applyLegWin` is a pure function (no side effects) called from `commitThrow`, keeping all game state transitions traceable
- `anyModalOpen` includes `game.legWinner` and `game.winner` so the background game content is blurred behind ALL overlays

---

## Task 4 — Layout fixes: Global header with back button and routing ✅

### What was done

**New file:**
- `src/components/Header.tsx` — fixed header (`position: fixed`, full width, `z-50`, `bg-slate-950/90 backdrop-blur-sm border-b border-slate-800`). Left slot: back button shown only when `window.location.hash` is not empty/home. Right slot: language selector (moved from Layout). No props needed — reads hash directly so it updates whenever App re-renders on hash change.

**Modified files:**
- `src/components/Layout.tsx` — removed language selector, imports and renders `<Header />`, wraps children in `<div className="pt-14">` to clear the fixed header height
- `src/App.tsx` — replaced `currentPage` string state + `setCurrentPage` prop drilling with hash-based routing: `parseHash()` reads `window.location.hash`, a `useEffect` listens to `hashchange` events and updates state. Pages no longer receive `onNavigate` prop.
- `src/components/HomePage.tsx` — removed `onNavigate` prop; navigates via `window.location.hash = "/tictactoe"` / `"/dartcounter"`
- `src/pages/TicTacToePage.tsx` — removed `onNavigate` prop and inline back button; kept `<h1>` page title
- `src/pages/DartCounterPage.tsx` — removed `onNavigate` prop and both inline back buttons (setup + game screen); kept `<h1>` page titles

### Key design decisions
- Header reads `window.location.hash` directly rather than receiving a prop, since the whole tree re-renders when App's hash-derived state changes — no extra prop threading needed
- Browser back/forward button now works natively (hash history entries are pushed automatically by setting `window.location.hash`)

---

## Task 1 — Refactor: Split App.jsx into components and utilities ✅

### What was done

Broke the monolithic `src/App.jsx` (~1672 lines) into a proper multi-file structure without changing any game behavior.

**New files created:**

- `src/utils/checkouts.js` — `THREE_DART_CHECKOUTS` constant + `randomUniqueCheckoutNumbers()`
- `src/utils/i18n.js` — `getValueByPath()` + `interpolate()` template helpers
- `src/utils/gameLogic.js` — all pure game-state functions: `WIN_LINES`, `STORAGE_KEY`, `LANGUAGE_STORAGE_KEY`, `getWinner`, `validateRange`, `validateBestOf`, `validateSetup`, `getWinsNeeded`, `buildStoredSetup`, `createBoard`, `buildNewGame`, `recomputeSharedGameState`, `recomputeSeparateBoardState`, `resetSharedRound`, `resetSeparateRound`, `applyRoundWinToMatch`, `hydrateLoadedGame`, `isMatchOngoing`, `getSeparateRoundState`, `getPlayerBoardHeading`, and private helpers
- `src/hooks/useTranslation.jsx` — `TranslationProvider` (context) + `useTranslation()` hook; language state lives here, all components share it via context
- `src/components/Layout.jsx` — outer `min-h-screen bg-slate-950` wrapper + language selector
- `src/components/ConfirmModal.jsx` — reusable confirm/cancel modal (replaces the two identical confirm dialogs)
- `src/components/ClaimModal.jsx` — claim/unclaim modal for shared board mode
- `src/components/GameBoard.jsx` — 3×3 tile grid
- `src/components/MatchScoreboard.jsx` — match score header card
- `src/components/RoundOutcome.jsx` — round result banner + Next Round / Finish Game / Undo buttons
- `src/components/BoardTabs.jsx` — X / O player tab switcher for separate-boards mode
- `src/components/SetupModal.jsx` — full tic-tac-toe game setup form
- `src/components/HomePage.jsx` — landing page with game picker cards (Tic-Tac-Toe + Dart Counter)
- `src/pages/TicTacToePage.jsx` — full tic-tac-toe page: all game state, handlers, renders using the extracted components

**Modified files:**

- `src/App.jsx` — reduced to ~20 lines: `TranslationProvider` wrapping `Layout` + simple `currentPage` string-state router
- `src/locales/en.json` + `src/locales/de.json` — added `app.name`, `nav.back`, and `home.*` keys for the new home page
- `CLAUDE.md` — updated to document new file structure, fixed template interpolation note (single `{key}`, not `{{key}}`)

---

## Task 2 — New feature: Dart Counter page (301 / 501) ✅

### What was done

**New files created:**

- `src/pages/DartCounterPage.jsx` — full dart counter page, ~280 lines, no sub-component extraction needed

**Modified files:**

- `src/locales/en.json` + `src/locales/de.json` — added `counter.*` keys (all required strings for setup, game, win, reset, validation)
- `src/App.jsx` — added `DartCounterPage` import and `currentPage === "dartcounter"` branch

### Features implemented

**Setup screen** (rendered as a centered page card, not a modal overlay):
- Segmented 301 / 501 score selector (default 501)
- Dynamic player name list: starts at 2, add up to 6 via "+ Add player", remove players ≥ index 2 with "×"
- Validation: all names non-empty, no duplicates — inline error shown once the user has started typing
- "Start game" button disabled until valid

**Game screen:**
- Player cards stacked vertically; active player highlighted with `border-cyan-500/60 bg-cyan-500/5`
- Score input + Submit button inside the active player card; Enter key submits
- Score valid range: 0–180; Submit disabled otherwise
- Bust: score unchanged, `{ value, bust: true }` added to history; amber "Bust!" badge shown on inactive players whose last throw was a bust
- Win: score reaches 0 → winner set → win overlay shown
- Last 3 history entries per player shown beneath score (busts in amber)
- "Undo last throw" — restores from `lastSnapshot` (one level); disabled when no snapshot
- "Reset game" — confirm modal → returns to setup with current player names and starting score pre-filled

**Win overlay:**
- Emerald-themed full-screen overlay: "{name} wins!"
- "Play again" — resets scores to starting value, same players, `currentPlayerIndex: 0`
- "New game" — pre-fills setup with current player names/score, clears game state

**Persistence:** `localStorage` key `"darts-counter-gamestate"` with hydration validation on load.

### Key design decisions

- Setup is a regular centered page (not a full-screen overlay) so the back button sits naturally in the page header, same as TicTacToePage.
- `lastSnapshot` stored inline in game state (with its own `lastSnapshot: null`) to enable one-level undo without additional state.
- `goToSetup()` is the single function used by both "Reset game" (confirm) and "New game" (win screen); it pre-fills setup from current game data so players don't re-type names.
- Score input auto-focuses via `useRef` + `useEffect` on `currentPlayerIndex` change.

---

## Task 3 — Migrate codebase from JSX to TSX (TypeScript) ✅

### What was done

**New packages installed:**
- `typescript` (^6.0.3) — compiler
- `typescript-eslint` (^8.62.1) — ESLint TypeScript support

**New config files:**
- `tsconfig.json` — strict TypeScript config: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `resolveJsonModule`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`
- `src/vite-env.d.ts` — `/// <reference types="vite/client" />` to resolve CSS side-effect imports

**Updated config files:**
- `eslint.config.js` — switched from `defineConfig` (eslint/config) to `tseslint.config()`, added `...tseslint.configs.recommended` in `extends`, files glob changed to `**/*.{ts,tsx}`, replaced `no-unused-vars` with `@typescript-eslint/no-unused-vars`, downgraded `react-refresh/only-export-components` to `warn` (co-exporting a hook with a Provider component is fine in practice)
- `package.json` build script — changed to `"tsc --noEmit && vite build"` so builds always include a type check

**File renames:** all `src/**/*.js` → `.ts` and `src/**/*.jsx` → `.tsx`

**Key types added in `src/utils/gameLogic.ts`:**
- `PlayerSymbol = "X" | "O"`, `Claim = PlayerSymbol | null`
- `Board`, `Setup`, `SharedGame`, `SeparateGame`, `Game` (discriminated union)
- `ValidationResult`, `SeparateRoundState`
- Private: `TFunction`, `WinnerResult`, `BaseGame`
- `isPlainObject` upgraded to a type guard `(v: unknown): v is Record<string, unknown>`, same for `isValidClaim`

**Key changes per file:**
- `gameLogic.ts`: `hydrateLoadedGame(unknown): Game | null` — uses `isPlainObject` guards throughout instead of optional chaining on unknown
- `useTranslation.tsx`: context typed `TranslationContextValue | null`; `useTranslation()` throws if called outside Provider (removes `null` from return type); language state typed `"en" | "de"`
- `DartCounterPage.tsx`: `useRef<HTMLInputElement>(null)`, `useState<301 | 501>(501)`, extracted `activePlayerIndex`/`hasWinner` primitives from game to fix `exhaustive-deps` warning; local `isObj` type guard for hydration
- `TicTacToePage.tsx`: `useState<Game | null>`, `useState<PlayerSymbol>("X")`, explicit casts to `SharedGame`/`SeparateGame` where discriminated union access is needed

### Key design decisions

- Discriminated union `Game = SharedGame | SeparateGame` lets TypeScript narrow automatically in `if (game.mode === "shared")` branches throughout the codebase
- `hydrateLoadedGame` and `hydrateGame` (DartCounter) treat incoming data as `unknown` — type assertions only appear after explicit runtime validation
- `noUnusedLocals`/`noUnusedParameters` both `true` — unused code gets cleaned up as we write it, not later

---

### Key design decisions (Task 1)

- Language state is context-based (`TranslationProvider` in `App.jsx`). All components call `useTranslation()` independently — no prop drilling.
- Navigation is a simple `currentPage` state string (`"home"` | `"tictactoe"` | `"dartcounter"`). No URL router.
- The blur-on-overlay effect is managed inside `TicTacToePage` (not in Layout), so the language selector in the Layout header remains always unblurred.
- `ConfirmModal` replaced both the reset and change-setup confirm dialogs (they were structurally identical; callers pass `confirmClassName` for the color variant).
- `LANGUAGE_STORAGE_KEY` and `STORAGE_KEY` remain in `utils/gameLogic.js` as required; `useTranslation.jsx` imports `LANGUAGE_STORAGE_KEY` from there.
