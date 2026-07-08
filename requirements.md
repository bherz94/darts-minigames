# Requirements

---

## Task 1 — Refactor: Split App.jsx into components and utilities

### Goal
`src/App.jsx` is ~1672 lines and contains everything: utility functions, game logic, i18n, localStorage persistence, and all UI. Split it into well-scoped files without changing any visible behavior. Also introduce a simple view-based navigation layer to support upcoming additional pages (e.g. the dart counter in Task 2).

### Constraints
- No behavior changes — everything must work exactly as before after the refactor.
- Keep the existing Tailwind / React 19 / Vite stack.
- No new dependencies unless strictly necessary. For routing, a lightweight client-side approach (e.g. a `currentPage` state or `window.location.hash`) is fine. React Router is acceptable if it makes multi-page state management cleaner.
- Follow the existing code style: no unnecessary comments, no abstractions beyond what is needed.
- `CLAUDE.md` documents the single-file design intentionally — update CLAUDE.md to reflect the new structure after the refactor.

### New file structure

```
src/
  utils/
    checkouts.js          # dart scoring utilities (pure functions, no React)
    gameLogic.js          # tic-tac-toe game state logic (pure functions, no React)
    i18n.js               # getValueByPath + interpolate helpers
  hooks/
    useTranslation.js     # useTranslation hook (language state + t() function + localStorage sync)
  components/
    Layout.jsx            # outer chrome: dark bg, language selector, app title, children slot
    ConfirmModal.jsx      # reusable confirm/cancel modal (title, description, confirm button label+style, cancel, onConfirm, onCancel)
    SetupModal.jsx        # game setup form (uses useTranslation, validation from gameLogic)
    ClaimModal.jsx        # claim/unclaim modal for shared board mode
    GameBoard.jsx         # 3×3 tile grid (receives boardNumbers, claims, winningLine, onTileClick, disabled)
    MatchScoreboard.jsx   # match score header (bestOf label, X vs O score, first-to-wins subtitle)
    RoundOutcome.jsx      # round result banner + Next Round / Finish Game / Undo buttons
    BoardTabs.jsx         # player tab switcher shown in separate-boards mode
    HomePage.jsx          # landing page: game picker with cards for each available game
  pages/
    TicTacToePage.jsx     # full tic-tac-toe game page (current App logic, now without the boilerplate shell)
  App.jsx                 # root: manages currentPage state, renders Layout + the correct page
```

### What goes where in detail

**`src/utils/checkouts.js`**
- `getThreeDartCheckoutScores()` — returns sorted array of all valid checkout scores
- `THREE_DART_CHECKOUTS` — exported constant (computed once at module load)
- `randomUniqueCheckoutNumbers(min, max, count)` — returns array of random unique checkout scores in range

**`src/utils/gameLogic.js`**
- All constants: `WIN_LINES`, `STORAGE_KEY`, `LANGUAGE_STORAGE_KEY`
- All pure game functions: `getWinner`, `validateRange`, `validateBestOf`, `validateSetup`, `getWinsNeeded`, `buildStoredSetup`, `createBoard`, `buildNewGame`, `recomputeSharedGameState`, `recomputeSeparateBoardState`, `resetSharedRound`, `resetSeparateRound`, `applyRoundWinToMatch`, `hydrateLoadedGame`, `normalizeClaims`, `normalizeWinningLine`, `sanitizeBoard`, `boardHasProgress`, `isMatchOngoing`, `getSeparateRoundState`, `isPlainObject`, `isValidClaim`, `getPlayerBoardHeading`

**`src/utils/i18n.js`**
- `getValueByPath(obj, path)` — dot-path object accessor
- `interpolate(template, vars)` — `{key}` template interpolation

**`src/hooks/useTranslation.js`**
- `useTranslation()` hook — manages `language` state, persists to localStorage, returns `{ language, setLanguage, t }`
- Imports translations from `src/locales/en.json` and `src/locales/de.json`
- Uses `getValueByPath` and `interpolate` from `src/utils/i18n.js`

**`src/components/Layout.jsx`**
- Props: `children`
- Renders: outer `min-h-screen bg-slate-950 text-white select-none` wrapper, language selector (top-right), `h1` with app title, `children`
- Uses `useTranslation()` internally
- App title should be generic (e.g. "Darts Minigames") since it now wraps multiple games — or pass it as a prop if needed per page

**`src/components/ConfirmModal.jsx`**
- Props: `title`, `description`, `confirmLabel`, `confirmClassName`, `onConfirm`, `onCancel`, `cancelLabel` (optional, defaults to translations "Cancel")
- Replaces both the reset confirm modal and change-setup confirm modal (they are structurally identical)

**`src/components/SetupModal.jsx`**
- Props: `setup`, `onChange`, `onSubmit`, `validation`
- Renders the full setup form (player names, separate boards toggle, best-of, range inputs)
- Uses `useTranslation()` internally

**`src/components/ClaimModal.jsx`**
- Props: `number`, `currentClaim`, `players`, `onClaim`, `onUnclaim`, `onClose`

**`src/components/GameBoard.jsx`**
- Props: `boardNumbers`, `claims`, `winningLine`, `onTileClick`, `disabled`
- Renders the 3×3 grid of tile buttons

**`src/components/MatchScoreboard.jsx`**
- Props: `game` (the full game object)
- Renders the match score header card

**`src/components/RoundOutcome.jsx`**
- Props: `roundWinnerName`, `roundIsDraw`, `roundNumber`, `isFinalRoundWin`, `canUndo`, `onNextRound`, `onFinishGame`, `onUndo`

**`src/components/BoardTabs.jsx`**
- Props: `players`, `activeBoard`, `onChange`
- Renders the X / O player tab switcher

**`src/components/HomePage.jsx`**
- Simple landing page with two clickable game cards:
  - "Tic-Tac-Toe Checkout" — navigates to the tic-tac-toe page
  - "Dart Counter (301/501)" — navigates to the dart counter page
- Styled consistently with the rest of the app (dark cards, slate borders)

**`src/pages/TicTacToePage.jsx`**
- Contains the full tic-tac-toe game logic currently in `App.jsx` (all state, handlers, render output), just without the outer Layout shell
- Props: none needed (manages its own state including localStorage persistence)

**`src/App.jsx` (after refactor)**
- Manages a `currentPage` state (`"home"`, `"tictactoe"`, `"dartcounter"`)
- Renders `<Layout>` wrapping the current page component
- Navigation between pages is passed down via props or a simple context
- Keep it under ~30 lines

### Navigation
- Use a simple string state (`currentPage`) in `App.jsx` — no URL-based router needed yet
- Each page gets an `onNavigate(page)` prop or use a minimal context
- The `TicTacToePage` should have a "Back to games" link/button (small, top-left area within the page, not in the Layout header)

---

## Task 2 — New feature: Dart Counter page (301 / 501)

### Goal
A simple dart score tracker for 2–6 players playing 301 or 501. Players take turns entering the score they just threw. The page fits the existing visual design of the app.

### Screens / flow

**Setup screen** (shown when no active game)
- Input for starting score: radio buttons or segmented control — `301` or `501` (default: 501)
- Player names: start with 2 player rows, a "+ Add player" button adds up to 6 total. Each row has a text input for the player name. Players beyond the first two can be removed with a "×" button.
- "Start Game" button (disabled until all name fields are non-empty, no duplicate names, 2–6 players)
- Same modal/card style as the tic-tac-toe setup (rounded-2xl border border-slate-700 bg-slate-900)

**Game screen**
- Shows all players in order with their remaining scores. The active player is visually highlighted (e.g. brighter border or background).
- Below (or inside) the active player card: a numeric input for entering the turn score (0–180), and a "Submit" button. Pressing Enter on the input also submits.
- When submitted:
  - If `remainingScore - turnScore < 0`: it's a bust. The score does not change. Show a brief "Bust!" indicator on the player card. Move to the next player.
  - If `remainingScore - turnScore === 0`: the player wins. Show the win screen.
  - If `remainingScore - turnScore > 0`: subtract and move to the next player.
- Show a small turn history per player (last 3 scores thrown, shown beneath their remaining score — busts shown as "Bust")
- "Undo last throw" button — reverts the last submitted score (including bust) to the previous state. Only one level of undo is required.
- "Reset game" button — asks for confirmation (reusable ConfirmModal), then resets to the setup screen.

**Win screen** (overlay/banner, not a new screen)
- Full-screen overlay (same style as other modals) showing "{name} wins!" 
- Two buttons: "Play again (same players)" — same names and starting score, reset scores — and "New game" — go back to setup

### State shape

```js
{
  startingScore: 301 | 501,
  players: [
    {
      name: string,
      score: number,         // remaining score
      history: number[],     // scores per turn (negative = bust stored as original value, flag separately)
    }
  ],
  currentPlayerIndex: number,
  winner: string | null,     // player name of winner or null
  lastSnapshot: state | null // for undo (one level)
}
```

For history display, store each entry as `{ value: number, bust: boolean }`.

### Persistence
- Persist the active dart counter game to localStorage under key `"darts-counter-gamestate"`
- Hydrate on load (validate that the state is well-formed before using it)
- Clear on "New game" or win + "New game"

### Localization
- Add all new strings to both `src/locales/en.json` and `src/locales/de.json` under a `"counter"` key
- Required keys (English values listed):
  - `counter.title`: "Dart Counter"
  - `counter.setup.startingScore`: "Starting score"
  - `counter.setup.addPlayer`: "Add player"
  - `counter.setup.playerPlaceholder`: "Player {n}"
  - `counter.setup.startGame`: "Start game"
  - `counter.game.remaining`: "Remaining"
  - `counter.game.enterScore`: "Enter score"
  - `counter.game.submit`: "Submit"
  - `counter.game.bust`: "Bust!"
  - `counter.game.undo`: "Undo last throw"
  - `counter.game.reset`: "Reset game"
  - `counter.win.title`: "{name} wins!"
  - `counter.win.playAgain`: "Play again"
  - `counter.win.newGame`: "New game"
  - `counter.reset.title`: "Reset game?"
  - `counter.reset.description`: "This will clear all scores and return to the setup screen."
  - `counter.reset.confirm`: "Yes, reset"
  - `counter.validation.duplicateNames`: "All player names must be unique"
  - `counter.validation.emptyName`: "All players need a name"

### Visual design guidelines
- Background: `bg-slate-950`, cards: `bg-slate-900 border border-slate-700 rounded-2xl`
- Active player highlight: `border-cyan-500/60 bg-cyan-500/5`
- Win overlay: same style as ConfirmModal but with emerald color scheme
- Bust indicator: brief amber flash or static amber text "Bust!" replacing the score input area momentarily (or just shown in history)
- Score input: large, centered number input — `text-4xl font-black` remaining score display per player
- Turn history entries: small, muted, e.g. `text-sm text-slate-400`
- Bust entries in history: amber color (`text-amber-400`)

### File
- `src/pages/DartCounterPage.jsx` — full page component, manages its own state and localStorage
- No sub-components required unless the file exceeds ~400 lines; if it does, extract a `PlayerCard.jsx` into `src/components/`

---

## Task 3 — Migrate codebase from JSX to TSX (TypeScript)

### Goal
Convert the entire codebase from JavaScript/JSX to TypeScript/TSX. Add all required packages and type definitions. Every file in `src/` should be `.ts` or `.tsx`. No behavior changes.

### Steps

**Install dependencies**
- `typescript` — compiler
- `@types/react` and `@types/react-dom` — React type definitions

**Vite config**
- Vite + `@vitejs/plugin-react` already handle TSX natively — no extra plugin needed
- Add a `tsconfig.json` at the project root with strict settings targeting ESNext/DOM:
  ```json
  {
    "compilerOptions": {
      "target": "ESNext",
      "lib": ["ESNext", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "moduleResolution": "bundler",
      "jsx": "react-jsx",
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true,
      "skipLibCheck": true
    },
    "include": ["src"]
  }
  ```

**File renames**
Rename every `.js` / `.jsx` file under `src/` to `.ts` / `.tsx`:
- `src/utils/checkouts.js` → `checkouts.ts`
- `src/utils/gameLogic.js` → `gameLogic.ts`
- `src/utils/i18n.js` → `i18n.ts`
- `src/hooks/useTranslation.jsx` → `useTranslation.tsx`
- `src/components/*.jsx` → `*.tsx`
- `src/pages/*.jsx` → `*.tsx`
- `src/App.jsx` → `App.tsx`
- `src/main.jsx` → `main.tsx`

**Typing requirements**
- All component props must have explicit TypeScript interfaces or types (no implicit `any`)
- All utility functions must have typed parameters and return types
- Game state objects must have exported interfaces (e.g. `GameState`, `Player`, `Setup`) in the files where they are used
- JSON imports (`en.json`, `de.json`) should be typed via `resolveJsonModule: true` in tsconfig — add that option
- `localStorage` interactions: cast parsed JSON with appropriate types (type assertion is acceptable here)
- Prefer `interface` for object shapes, `type` for unions/aliases
- No `any` types unless truly unavoidable (e.g. caught error objects — use `unknown` and narrow)

### Constraints
- Zero behavior changes
- `npm run build` must succeed with no TypeScript errors after the migration
- `npm run lint` must pass (update ESLint config if needed to handle `.ts`/`.tsx`)

---

## Task 4 — Layout fixes: Global header with back button and routing

### Goal
The back button and language selector are currently embedded inside individual page components. Extract them into a persistent, fixed global header. Also add URL-based routing so each page has its own route.

### Changes

**Global header component (`src/components/Header.jsx`)**
- Fixed at the top of every page (position: fixed, full width, appropriate z-index)
- Left side: back button — rendered only when the user is on a subpage (any page except `"home"`). Clicking it navigates to `"home"`.
- Right side: language selector (moved from `Layout.jsx`)
- Styled consistently with the app (dark background, `bg-slate-950/90 backdrop-blur border-b border-slate-800`)
- `Layout.jsx` should include this header and add top-padding to `children` to avoid content being hidden behind it

**URL-based routing**
- Replace the `currentPage` string state with `window.location.hash`-based routing:
  - `#/` or `#` → home
  - `#/tictactoe` → tic-tac-toe page
  - `#/dartcounter` → dart counter page
- Use a `useState` + `useEffect` listening to the `hashchange` event — no external router dependency
- Navigation calls (previously `onNavigate("tictactoe")`) become `window.location.hash = "/tictactoe"`
- Back button sets `window.location.hash = "/"`
- The browser back button should work naturally as a result

### Constraints
- No React Router or other routing library — keep it to the hash-based approach above
- The `onNavigate` prop can be removed from all pages since pages navigate via hash directly

---

## Task 5 — Dart Counter: Match structure (Best Of Legs / Sets)

### Goal
Replace the simple "reset game" flow with a proper match structure supporting Best Of Legs and Best Of Sets, and add Double In / Double Out game options.

### Setup screen additions

**Match format**
- "Best of Legs" selector — number input (odd numbers only: 1, 3, 5, 7, …) OR free number input. First to win `ceil(n/2)` legs wins the match.
- "Best of Sets" selector — same style. A Set is won by the first player to win 2 legs. First to win `ceil(n/2)` sets wins the match.
- When Sets > 1 the Legs selector applies per set (legs needed to win a set). When Sets = 1 it is a pure legs match.
- Default: 1 set, best of 1 leg (single leg / straight match)
- Style: same segmented control / number input style as tic-tac-toe setup

**In/Out rules**
- Two toggle rows (checkbox or toggle switch):
  - "Double In" — player must start scoring with a double. Throws before hitting a double do not count.
  - "Double Out" — player must finish on a double (or bullseye). A checkout that does not end on a double is a bust.
- Both default to off

### State shape additions

```js
{
  // existing fields …
  matchFormat: {
    bestOfSets: number,       // total sets in match
    bestOfLegs: number,       // legs per set
    doubleIn: boolean,
    doubleOut: boolean,
  },
  players: [
    {
      // existing fields …
      legsWon: number,        // legs won in current set
      setsWon: number,        // sets won overall
      hasOpenedScoring: boolean, // for Double In: true once first double hit
    }
  ],
  currentSet: number,
  currentLeg: number,
}
```

### Win / progression logic
- Leg win: player reaches 0 (respecting Double Out). Increment their `legsWon`. Check if they've won the set (`legsWon >= ceil(bestOfLegs/2)`). If yes: increment `setsWon`, reset `legsWon` for all players, start next set. If `setsWon >= ceil(bestOfSets/2)`: match over → show statistics screen.
- Between legs: reset all scores to `startingScore`, keep leg/set counters
- Between sets: reset scores and leg counters

### Localization additions (`counter.*`)
- `counter.setup.bestOfLegs`: "Best of Legs"
- `counter.setup.bestOfSets`: "Best of Sets"
- `counter.setup.doubleIn`: "Double In"
- `counter.setup.doubleOut`: "Double Out"
- `counter.game.set`: "Set {n}"
- `counter.game.leg`: "Leg {n}"

---

## Task 6 — Dart Counter: Numpad input + save/resume flow

### Goal
Replace the inline score text input with a dedicated numpad panel. Remove the "Reset game" button. Wire the back button to a "stop or save" modal. Persist game state so the user can resume later.

### Numpad layout

The numpad replaces the score input field. It is rendered below the player cards as a fixed-bottom panel (or a sticky section). Layout is a 5-column grid:

```
[ Undo ]  [ --- input display --- ]  [ Rest ]
[  26  ]  [  1  ]  [  2  ]  [  3  ]  [  60  ]
[  41  ]  [  4  ]  [  5  ]  [  6  ]  [  85  ]
[  45  ]  [  7  ]  [  8  ]  [  9  ]  [ 100  ]
[ CLR  ]  [     0     ]  [ No Score ]
```

- **Left column (shortcuts — amber/neutral style):** 26, 41, 45
- **Right column (shortcuts — amber/neutral style):** 60, 85, 100
- **Center 3×3 (digit keys):** 1–9
- **Bottom row:** CLR (red, clears input), 0 (digit), No Score (green — records a 0-score turn, advances to next player)
- **Top row:** Undo (reverts last throw), input display (shows digits typed so far), Rest (see below)

**Input display behavior**
- Typing digits builds a number left-to-right: pressing 7 then 3 shows "73" in the display
- Pressing a shortcut key (26, 41, 60, etc.) immediately submits that score (no confirm needed)
- Pressing a digit key updates the display; the score is submitted when the user presses the input display itself (or via an implicit "submit on 3 digits" rule). Alternatively: submit is triggered by pressing the display area / a dedicated Submit button if needed — keep UX simple.
- Max value: 180. If the typed number would exceed 180, ignore further digit input.
- CLR clears the current input without submitting

**Rest button**
- Calculates `currentPlayerRemainingScore - currentInputValue` and submits that calculated value as the score.
- Example: remaining = 83, input shows "21" → pressing Rest submits 62 (83 − 21 = 62).
- If the result is negative or 0 (checkout), apply normal bust / win logic.

**Undo button (in numpad top row)**
- Same behavior as the removed standalone "Undo last throw" button — reverts the last submitted score.
- The standalone undo button elsewhere in the UI is removed.

### Back button / stop-or-save flow

- Remove the "Reset game" button from the game screen entirely.
- When the back button (global header) is pressed while a game is in progress, show a modal:
  - Title: "Leave game?"
  - Description: "Do you want to stop the game or save your progress to continue later?"
  - Button 1: "Stop game" (destructive / red) — clears storage and navigates home
  - Button 2: "Save & exit" (primary / cyan) — persists current game state to localStorage and navigates home
- If no game is in progress (setup screen), back button navigates home without a modal.

### Resume flow

- On load of `DartCounterPage`, check localStorage for a saved game.
- If one exists and it has `inProgress: true`, show a modal (or inline prompt) before the setup screen:
  - Title: "Continue game?"
  - Description: "You have a saved game in progress."
  - Button 1: "Continue" — restore that game state
  - Button 2: "New game" — clear storage and show setup
- Storage key: `"darts-counter-gamestate"` (same as before, now includes `inProgress` flag)

### Localization additions
- `counter.game.rest`: "Rest"
- `counter.game.noScore`: "No Score"
- `counter.game.clear`: "CLR"
- `counter.leave.title`: "Leave game?"
- `counter.leave.description`: "Do you want to stop the game or save your progress to continue later?"
- `counter.leave.stop`: "Stop game"
- `counter.leave.save`: "Save & exit"
- `counter.resume.title`: "Continue game?"
- `counter.resume.description`: "You have a saved game in progress."
- `counter.resume.continue`: "Continue"
- `counter.resume.newGame`: "New game"

---

## Task 7 — Dart Counter: In-game statistics and post-game statistics screen

### Goal
Show live statistics inside player cards during the game. Allow tapping a player to see their score history. After a match ends, show a full statistics screen instead of going directly to a win overlay.

### Live statistics in player cards

Add three small stat fields below each player's remaining score (visible during the game):

| Stat | Label | Value |
|------|-------|-------|
| Average | Avg | 3-dart average for current leg / overall average (e.g. "45.2 / 38.7") |
| Double % | D% | Doubles attempted vs hit, shown as percentage (e.g. "33%") — only meaningful with Double Out on |
| Darts thrown | Darts | Total darts thrown this leg, shown as multiples of 3 (e.g. "9") |

- Show all three stats in a compact row below the score, muted text (`text-xs text-slate-400`)
- Store the data needed to compute these in each player's game state (see state shape in Task 4)

### Score history popup

- Tapping / clicking a player card (anywhere on the card) opens a modal showing that player's score history for the current leg, most recent at the top
- Each entry: score value (bust entries shown in amber as "Bust (n)"), darts thrown cumulative after that throw
- Dismiss by tapping outside or a close button
- Localization: `counter.history.title`: "{name}'s scores", `counter.history.empty`: "No scores yet"

### Data to track per throw (extend history entries)

```js
{
  value: number,       // score entered (0 for no-score)
  bust: boolean,
  noScore: boolean,    // true if "No Score" button was pressed
  dartsThrown: number, // cumulative darts at end of this throw (always increments by 3)
  remainingAfter: number,
  doubleAttempted: boolean,  // true if Double Out and this was a checkout attempt
  doubleHit: boolean,        // true if the checkout succeeded with a double
}
```

### Post-game statistics screen

When the match is won, navigate to a statistics screen (a new page state / route, not an overlay) instead of showing just a win banner. The screen shows stats for the whole game and per leg/set.

**Header / navigation**
- Title: "Statistics"
- Tabs across the top: "Game" (overall), then one tab per leg labeled "S{set} L{leg}" (e.g. "S1 L1", "S1 L2") — if only 1 set, just "L1", "L2", etc.
- Back button returns to home (match is over)

**Statistics sections and fields**

Each tab (Game / per leg) shows all sections. Values are computed for the selected scope.

*Section: Summary*
| Field | Description |
|-------|-------------|
| #Legs | Total legs played |
| #Darts | Total darts thrown |

*Section: 3-Dart Average*
| Field | Description |
|-------|-------------|
| Overall | Average score per 3 darts across all visits |
| First 9 darts | Average of the first 3 visits (9 darts) |
| First 12 darts | Average of the first 4 visits |
| First 15 darts | Average of the first 5 visits |
| Avg until 100 left | Average over visits while remaining score was > 100 |
| Avg until 170 left | Average over visits while remaining score was > 170 |

*Section: Checkout*
| Field | Description |
|-------|-------------|
| CO Avg | Average checkout score on winning throws |
| Highest CO | Highest single checkout score |
| Doubles hit / attempted | e.g. "3/7" |
| Double % | doubles hit / attempted × 100 |

*Section: Best leg*
| Field | Description |
|-------|-------------|
| Best leg (darts) | Fewest darts thrown to win a leg |
| Best leg avg | 3-dart average in that leg |
| Highscore | Highest single-visit score across all legs |

*Section: Visit breakdown (Aufnahmen)*
| Bucket | Condition |
|--------|-----------|
| No Score | visit score = 0 (no-score button) |
| 1–19 | 1 ≤ score ≤ 19 |
| 20+ | 20 ≤ score ≤ 39 |
| 40+ | 40 ≤ score ≤ 59 |
| 60+ | 60 ≤ score ≤ 79 |
| 80+ | 80 ≤ score ≤ 99 |
| 100+ | 100 ≤ score ≤ 119 |
| 120+ | 120 ≤ score ≤ 139 |
| 140+ | 140 ≤ score ≤ 159 |
| 160+ | 160 ≤ score ≤ 179 |
| 180 | score = 180 |

**Per-player columns**
- Each section shows one column per player side-by-side (green highlight on winning player's column)
- Section headers use the green row style (`bg-green-900/40 text-green-400 font-semibold`)
- Data rows alternate slightly lighter/darker for readability

**Visual design**
- Same dark background (`bg-slate-950`)
- Tabs: active tab underlined or pill-highlighted in cyan
- Section header rows: `bg-emerald-900/30 text-emerald-400 text-xs font-semibold uppercase tracking-wide`
- Data value cells: `text-cyan-400` (highlighted stats), `text-slate-300` (neutral)
- Table-like layout with player names as column headers

**Localization additions**
- `counter.stats.title`: "Statistics"
- `counter.stats.game`: "Game"
- `counter.stats.leg`: "L{n}"
- `counter.stats.set`: "S{n}"
- `counter.stats.legs`: "#Legs"
- `counter.stats.darts`: "#Darts"
- `counter.stats.avg3dart`: "3-Dart Average"
- `counter.stats.avgOverall`: "Overall"
- `counter.stats.avgFirst9`: "First 9 darts"
- `counter.stats.avgFirst12`: "First 12 darts"
- `counter.stats.avgFirst15`: "First 15 darts"
- `counter.stats.avgUntil100`: "Avg until 100 left"
- `counter.stats.avgUntil170`: "Avg until 170 left"
- `counter.stats.checkout`: "Checkout"
- `counter.stats.coAvg`: "CO Avg"
- `counter.stats.highestCO`: "Highest CO"
- `counter.stats.doubles`: "Doubles"
- `counter.stats.doublePercent`: "Double %"
- `counter.stats.best`: "Best"
- `counter.stats.bestLeg`: "Best leg (darts)"
- `counter.stats.bestLegAvg`: "Best leg avg"
- `counter.stats.highscore`: "Highscore"
- `counter.stats.visits`: "Visits"
- `counter.stats.noScore`: "No Score"

---

## Task 8 — Dart Counter: Bull-off to determine starting player

### Goal
Before the first throw of a match (and again after "Play again"), show a modal asking which player won the bull. The bull winner throws first in leg 1. Starting player rotates through all players in order for each subsequent leg.

### Flow

- After "Start game" or "Play again": show a "Who won the bull?" modal over the game screen before any input is accepted
- Modal lists one button per player; tapping a player sets them as the first thrower
- No dismiss / skip option — a player must be selected to proceed
- The modal is also shown when resuming a saved game that was interrupted before the bull was decided

### Leg rotation

- Leg 1 starts with the bull winner (index `B`)
- Leg 2 starts with player `(B + 1) % numPlayers`
- Leg N starts with player `(B + N - 1) % numPlayers`
- Rotation applies across sets as well (no reset per set)

### State

Add `legStartPlayerIndex: number | null` to `CounterGame`:
- `null` = bull not yet decided → show modal
- `number` = index of the player who started the current leg

On leg transition (`handleNextLeg`): `legStartPlayerIndex = (legStartPlayerIndex + 1) % numPlayers`, and `currentPlayerIndex` is set to match.

Old saved games without the field default to `currentPlayerIndex` (no bull popup on resume).

### Localization additions
- `counter.bull.title`: "Who won the bull?"
- `counter.bull.description`: "The player closest to the bull throws first."
