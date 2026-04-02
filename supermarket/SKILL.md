# Tenali — The Supermarket of Mathematical Skills

## Formal Specification

### 1. Purpose

Tenali is a web-based learning platform that hosts a collection of interactive mathematical and knowledge quiz games. It is designed as a "supermarket" where each game occupies a slot in a grid, and new games can be added over time. The platform is aimed at students practicing mental arithmetic and general knowledge.

### 2. System Architecture

#### 2.1 Technology Requirements

- **Frontend**: React 19+, Vite 8+ (build tool)
- **Backend**: Node.js with Express 5+
- **Fonts**: DM Sans (body/UI) + Source Serif 4 (display headings), loaded from Google Fonts CDN
- **Styling**: Single CSS file with CSS custom properties
- **No external UI libraries** — all components are custom-built

#### 2.2 Project Structure

```
Tenali/
├── supermarket/              Formal specifications (this folder)
│   ├── SKILL.md              Master specification (this file)
│   ├── gk/SKILL.md           General Knowledge specification
│   ├── addition/SKILL.md     Addition specification
│   ├── quadratic/SKILL.md    Quadratic specification
│   ├── multiply/SKILL.md     Multiplication Tables specification
│   ├── vocab/SKILL.md        Vocab Builder specification
│   ├── twinhunt/SKILL.md       Twin Hunt specification
│   ├── sqrt/SKILL.md         Square Root specification
│   ├── polymul/SKILL.md      Polynomial Multiplication specification
│   ├── polyfactor/SKILL.md   Polynomial Factorization specification
│   ├── primefactor/SKILL.md  Prime Factorization specification
│   ├── qformula/SKILL.md     Quadratic Formula specification
│   ├── linear/SKILL.md       Linear Equations (2 variables) specification
│   ├── simul/SKILL.md        Simultaneous Equations (3 variables) specification
│   ├── funceval/SKILL.md     Function Evaluation specification
│   └── lineq/SKILL.md        Line Equation specification
├── client/                   React frontend
│   ├── src/
│   │   ├── App.jsx           All components in a single file
│   │   ├── App.css           All styles in a single file
│   │   └── index.css         Minimal CSS reset (4 lines)
│   ├── index.html            HTML shell — loads DM Sans + Source Serif 4 fonts, mounts React
│   ├── vite.config.js        Dev server config with API proxy rules
│   ├── .env                  Development: VITE_API_BASE=http://localhost:4000
│   └── .env.production       Production: VITE_API_BASE_URL= (empty, uses relative URLs)
├── server/
│   ├── index.js              Express server — all routes, all logic
│   └── package.json          Dependencies: express, cors
├── chitragupta/
│   └── questions/            991 JSON files (0001.json to 0991.json)
├── vocab/
│   └── questions/            75 JSON files (0001.json to 0075.json)
├── render.yaml               Render.com deployment config
└── .github/workflows/        GitHub Pages CI/CD
```

#### 2.3 Client-Server Communication

The frontend communicates with the backend via REST API calls using `fetch()`. The API base URL is determined by the environment variable `VITE_API_BASE_URL`. In production, this is empty (meaning relative URLs like `/addition-api/question`), so the Express server serves both the static frontend and the API from the same origin.

### 3. Frontend Specification

#### 3.1 App Shell

The root component renders a centered card on a cream-colored background. A `mode` state variable (initially `null`) determines which view is active:

- `null` → Home screen
- `'gk'` → General Knowledge quiz
- `'addition'` → Addition quiz
- `'quadratic'` → Quadratic quiz
- `'multiply'` → Multiplication Tables quiz
- `'vocab'` → Vocab Builder quiz
- `'spot'` → Twin Hunt game
- `'sqrt'` → Square Root drill
- `'polymul'` → Polynomial Multiplication quiz
- `'polyfactor'` → Polynomial Factorization quiz
- `'primefactor'` → Prime Factorization puzzle
- `'qformula'` → Quadratic Formula quiz
- `'linear'` → Linear Equations (2 variables) quiz
- `'simul'` → Simultaneous Equations (3 variables) quiz
- `'funceval'` → Function Evaluation quiz
- `'lineq'` → Line Equation quiz

Each quiz component receives an `onBack` callback that sets `mode` back to `null`.

#### 3.2 Home Screen

The Home screen displays:
1. Title "Tenali" in the heading
2. Subtitle "Choose a learning game to begin"
3. A **responsive CSS grid** with **16 slots total** using `auto-fill` (columns auto-adjust from 2 on mobile to 5–6 on wide screens):
   - First 7 slots: active app cards (clickable buttons)
   - Remaining 9 slots: placeholder cards with dashed borders and "Coming soon" text
4. A **grid dimension indicator** below the grid showing current rows × columns (e.g., "4 × 4"), styled subtly

**Grid dimension indicator implementation:** A `useRef` on the grid element reads `getComputedStyle().gridTemplateColumns` on mount and window resize to compute the current column count. Rows are derived from `Math.ceil(totalSlots / cols)`. Displayed as "rows × cols" in a subtle, low-opacity label below the grid.

Each active card shows a title, subtitle, and has a color class (`purple`, `blue`, `green`) that controls a small colored dot on hover.

**App registry** (hardcoded array):
| Key | Name | Subtitle | Color |
|-----|------|----------|-------|
| gk | General Knowledge | Chitragupta quiz | purple |
| addition | Addition | 20-question addition practice | blue |
| quadratic | Quadratic | Find y for y = ax² + bx + c | blue |
| multiply | Multiplication | Practice any times table (1–10) | green |
| vocab | Vocab Builder | Match words to definitions | blue |
| spot | Twin Hunt | Find the common object | purple |
| sqrt | Square Root | Nearest-integer square root drill | green |
| polymul | Polynomial Multiplication | Multiply polynomials and enter coefficients | blue |
| polyfactor | Polynomial Factorization | Factor ax² + bx + c into (px + q)(rx + s) | blue |
| primefactor | Prime Factorization | Find prime factors one at a time | green |
| qformula | Quadratic Formula | Find roots of ax² + bx + c = 0 | blue |
| linear | Linear Equations (2 vars) | Solve ax + by = c systems | green |
| simul | Simultaneous Equations (3 vars) | Solve ax + by + cz = d systems | green |
| funceval | Function Evaluation | Evaluate linear functions at points | blue |
| lineq | Line Equation | Find m and c from two points | purple |

#### 3.3 Shared Quiz Components

**QuizLayout**: Wrapper that renders a "← Home" back button, an `<h1>` title, a `<p>` subtitle, and then the quiz children.

**ResultsTable**: Receives an array of result objects and renders:
- An HTML `<table>` with columns: #, Question, Your Answer, Result, Time
- Rows are styled with green text for correct, red for incorrect
- A summary line below: "Total time: Ns · Average: Ns per question"
- Displayed both during gameplay (below the active quiz) and on the finish screen

**useTimer hook**: Custom hook that provides:
- `elapsed` (number): seconds since last `start()`, updated every 250ms
- `start()`: resets and begins counting
- `stop()`: stops counting, returns seconds elapsed
- `reset()`: stops counting, sets elapsed to 0

**useAutoAdvance hook**: Auto-advances to the next question 1.5 seconds after an answer is revealed. Uses `useRef` pattern to avoid stale closure issues. Players can still press Enter to skip the wait.
```javascript
const AUTO_ADVANCE_MS = 1500
function useAutoAdvance(revealed, advanceFnRef) {
  useEffect(() => {
    if (!revealed) return
    const id = setTimeout(() => advanceFnRef.current(), AUTO_ADVANCE_MS)
    return () => clearTimeout(id)
  }, [revealed])
}
```

**NumPad component**: An on-screen numeric keypad displayed across all math quizzes (Addition, Quadratic, Multiplication, Square Root). Features digits 0–9, a ± toggle, and a ⌫ backspace key. Physical keyboard input works alongside the on-screen keypad. All numeric inputs use `type="text"` with regex validation: `/^-?\d+$/.test(v)`.

**Configurable question count**: All fixed-length quizzes (Addition, Quadratic, Multiplication, Vocab) show a "How many questions?" input before starting. Defaults to 20 (`DEFAULT_TOTAL`). Square Root and GK remain unlimited.

#### 3.4 Per-Question Timer

Every quiz displays a timer pill in the top-right corner (next to the score pill). The timer:
- Starts when a new question loads
- Displays elapsed seconds in real-time (e.g., "12s")
- Stops when the player submits an answer
- Is hidden after submission (while feedback is shown)
- The time taken is recorded in the results array

#### 3.5 Results Tracking

Every quiz maintains a `results` state array. After each answer, a result object is appended:
```
{
  question: string,      // short description of the question
  userAnswer: string,    // what the player typed/selected
  correctAnswer: string, // the correct answer
  correct: boolean,      // whether the player was right
  time: number           // seconds taken for this question
}
```

All quizzes display the results table both during gameplay (growing as the player progresses) and on the finish screen.

### 4. Backend Specification

#### 4.1 Server Setup

- Express app with CORS enabled and JSON body parsing
- Serves static files from `client/dist/`
- Catch-all `GET /*` serves `index.html` (SPA fallback)
- Listens on `0.0.0.0:${PORT}` where PORT defaults to 4000

#### 4.2 API Endpoints

| Method | Path | Query Params | Request Body | Response |
|--------|------|-------------|-------------|----------|
| GET | `/api/health` | — | — | `{ ok: true, questions: N }` |
| GET | `/gk-api/question` | — | — | `{ id, question, options[], genre }` |
| POST | `/gk-api/check` | — | `{ id, answerOption }` | `{ correct, correctAnswer, correctAnswerText, message }` |
| GET | `/addition-api/question` | `digits` (1/2/3) | — | `{ id, digits, a, b, prompt, answer }` |
| POST | `/addition-api/check` | — | `{ a, b, answer }` | `{ correct, correctAnswer, message }` |
| GET | `/quadratic-api/question` | `difficulty` (easy/medium/hard) | — | `{ id, a, b, c, x, prompt, answer }` |
| POST | `/quadratic-api/check` | — | `{ a, b, c, x, answer }` | `{ correct, correctAnswer, message }` |
| GET | `/sqrt-api/question` | `step` (number) | — | `{ id, q, step, prompt, floorAnswer, ceilAnswer, sqrtRounded }` |
| POST | `/sqrt-api/check` | — | `{ q, answer }` | `{ correct, floorAnswer, ceilAnswer, sqrtRounded, message }` |
| GET | `/multiply-api/question` | `table` (number) | — | `{ id, table, multiplier, prompt, answer }` |
| POST | `/multiply-api/check` | — | `{ table, multiplier, answer }` | `{ correct, correctAnswer, message }` |
| GET | `/vocab-api/question` | `difficulty` | — | `{ id, question (word), options[] (definitions), difficulty }` |
| POST | `/vocab-api/check` | — | `{ id, answerOption }` | `{ correct, correctAnswer, correctAnswerText, message }` |
| GET | `/polymul-api/question` | `difficulty` (easy/medium/hard) | — | `{ id, difficulty, poly1, poly2, poly1Str, poly2Str, prompt, resultDegree, correctCoeffs }` |
| POST | `/polymul-api/check` | — | `{ poly1, poly2, coeffs }` | `{ correct, correctCoeffs, message }` |
| GET | `/polyfactor-api/question` | `difficulty` (easy/medium/hard) | — | `{ id, difficulty, a, b, c, prompt, p, q, r, s }` |
| POST | `/polyfactor-api/check` | — | `{ a, b, c, p, q, r, s }` | `{ correct, message }` |
| GET | `/primefactor-api/question` | `difficulty` (easy/medium/hard) | — | `{ id, difficulty, originalNumber, allFactors[], remaining, factorsFound[], prompt }` |
| POST | `/primefactor-api/check` | — | `{ originalNumber, factor, currentRemaining }` | `{ correct, nextRemaining, factorsFound[], allFactorsList[], isComplete, message }` |
| GET | `/qformula-api/question` | `difficulty` (easy/medium/hard) | — | `{ id, difficulty, a, b, c, prompt, discriminant, rootType, root1, root2, root1Real, root1Imag, root2Real, root2Imag }` |
| POST | `/qformula-api/check` | — | `{ a, b, c, root1, root2, root, root1Real, root1Imag, root2Real, root2Imag, rootType }` | `{ correct, correctRoot1, correctRoot2, message }` |
| GET | `/linear-api/question` | `difficulty` (easy/medium/hard) | — | `{ id, difficulty, a, b, c, d, e, f, prompt, x, y }` |
| POST | `/linear-api/check` | — | `{ a, b, c, d, e, f, x, y }` | `{ correct, correctX, correctY, message }` |
| GET | `/simul-api/question` | `difficulty` (easy/medium/hard) | — | `{ id, difficulty, a, b, c, d, e, f, g, h, i, j, k, l, prompt, x, y, z }` |
| POST | `/simul-api/check` | — | `{ a, b, c, d, e, f, g, h, i, j, k, l, x, y, z }` | `{ correct, correctX, correctY, correctZ, message }` |
| GET | `/funceval-api/question` | `difficulty` (easy/medium/hard) | — | `{ id, difficulty, functionType, a, b, c, d, x, y, z, prompt, answer }` |
| POST | `/funceval-api/check` | — | `{ a, b, c, d, x, y, z, answer }` | `{ correct, correctAnswer, message }` |
| GET | `/lineq-api/question` | `difficulty` (easy/medium/hard) | — | `{ id, difficulty, x1, y1, x2, y2, prompt, m, c }` |
| POST | `/lineq-api/check` | — | `{ x1, y1, x2, y2, m, c }` | `{ correct, correctM, correctC, message }` |

#### 4.3 Data Loading

GK questions are loaded once at server startup from JSON files in `chitragupta/questions/`. Each file is parsed and stored in an in-memory array. Vocab questions are similarly loaded from `vocab/questions/` at startup.

### 5. Design Specification

#### 5.1 Color Palette

| Variable | Value | Usage |
|----------|-------|-------|
| `--clr-bg` | #f5f0eb | Page background |
| `--clr-card` | #fffdf9 | Card background |
| `--clr-text` | #2c2420 | Primary text |
| `--clr-text-soft` | #6b5e54 | Secondary text |
| `--clr-border` | rgba(60,45,30,0.12) | Borders |
| `--clr-accent` | #e07a3a | Buttons, active states, timer |
| `--clr-accent-soft` | rgba(224,122,58,0.10) | Accent backgrounds |
| `--clr-correct` | #3a8a5c | Correct feedback text |
| `--clr-correct-bg` | #eaf5ef | Correct feedback background |
| `--clr-wrong` | #c24b3a | Incorrect feedback text |
| `--clr-wrong-bg` | #fdf0ee | Incorrect feedback background |

#### 5.2 Typography

- **Display/Headings**: Source Serif 4, `clamp(2.4rem, 5vw, 3.2rem)`, weight 700, letter-spacing -0.02em
- **Body/UI**: DM Sans, 0.85rem–1.05rem, weight 400–600, letter-spacing 0.01em
- **Question display**: DM Sans, `clamp(1.4rem, 3.5vw, 1.8rem)`, weight 400
- Tabular numbers (`font-variant-numeric: tabular-nums`) for the timer
- Fallback stack: system-ui, -apple-system, 'Segoe UI', sans-serif

#### 5.3 Layout

- Card: max-width 900px, centered with flexbox, 24px border-radius, subtle shadow
- Grid: `repeat(auto-fill, minmax(180px, 1fr))` — auto-adjusts from 2 columns on mobile to 5–6 on wide screens
- Card padding: 48px 40px (desktop), 32px 24px (mobile)

#### 5.4 Interactive Elements

- **Buttons**: amber (#e07a3a) with white text, 10px border-radius, hover lifts 1px
- **Radio pills**: transparent with border, active state fills with accent color
- **Input fields**: white background, 1.5px border, amber focus ring (3px spread)
- **Option cards**: white with border, selected fills with accent soft color
- **Menu cards**: white with border, hover lifts 3px with amber border and colored dot

### 6. Deployment

#### 6.1 Render.com

```yaml
services:
  - type: web
    name: tenali
    env: node
    buildCommand: npm install && cd client && npm install && npm run build
    startCommand: node server/index.js
    healthCheckPath: /api/health
```

#### 6.2 Development

1. `cd server && node index.js` — starts Express on port 4000
2. `cd client && npm run dev` — starts Vite on port 5173 with proxy to 4000
3. Vite proxy forwards: `/api`, `/gk-api`, `/addition-api`, `/quadratic-api`, `/sqrt-api`, `/multiply-api`, `/vocab-api`, `/polymul-api`, `/polyfactor-api`, `/primefactor-api`, `/qformula-api`, `/linear-api`, `/simul-api`, `/funceval-api`, `/lineq-api`

### 7. Adding a New App

To add a new quiz app to the supermarket:

1. Add a new entry to the `apps` array in the `Home` component (the `totalSlots` constant automatically reduces placeholder count)
2. Add a new condition in the `App` component's mode switch
3. Create the quiz component following the shared pattern:
   - Use `QuizLayout` wrapper
   - Use `useTimer()` hook for per-question timing
   - Maintain a `results` state array
   - Include `ResultsTable` on the finish screen
   - Support Enter key for submit/next
4. Add API endpoints in `server/index.js` with GET for question generation and POST for answer checking
5. Add the proxy route in `client/vite.config.js`
6. Create a formal specification in `supermarket/{app-name}/SKILL.md`
