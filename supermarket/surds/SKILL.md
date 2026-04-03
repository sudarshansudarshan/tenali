# Surds — Formal Specification

## 1. Overview

A surds quiz covering the IGCSE syllabus with four difficulty levels. The player works with square roots (surds), simplifying, adding/subtracting like surds, multiplying, and rationalising denominators. Uses algorithmic on-the-fly question generation providing unlimited unique problems. User types answers as text using √ symbol (or "sqrt" shorthand). Features auto-advance on correct answers (1.5s), Enter key to advance after wrong answers, and a running results table.

## 2. Component Specification

**Component:** `SurdsApp` (located in `App.jsx` monolith)

**Props:**
- `onBack` (function) — Callback invoked when user navigates away

**Files:**
- Component: `App.jsx` (monolith, `SurdsApp` function)
- CSS: `App.css` (reuses standard quiz classes)
- Server: `/surds-api/` routes in `server/index.js`
- Vite proxy: `/surds-api` entry in `vite.config.js`

## 3. State Variables

| Variable | Type | Initial | Purpose |
|----------|------|---------|---------|
| `difficulty` | string | 'easy' | Selected difficulty: 'easy', 'medium', 'hard', or 'extrahard' |
| `numQuestions` | string | '20' | User input for total question count |
| `started` | boolean | false | True after quiz start button clicked |
| `finished` | boolean | false | True after last question answered |
| `question` | object\|null | null | Current question from API (see §4.1 for shapes) |
| `answer` | string | '' | User's text answer input |
| `score` | number | 0 | Count of correct answers |
| `questionNumber` | number | 0 | Current question index (1-based in display) |
| `totalQ` | number | 20 | Parsed and validated total question count |
| `feedback` | string | '' | Feedback message displayed after submission |
| `isCorrect` | boolean\|null | null | Whether last answer was correct (null before submission) |
| `loading` | boolean | false | True while fetching next question |
| `revealed` | boolean | false | True after answer submitted and checked |
| `results` | array | [] | Array of result objects for ResultsTable |

**Timer:** Uses shared `useTimer()` hook.

**AutoAdvance:** Uses `useRef(() => {})` and shared `useAutoAdvance(revealed, advanceFnRef, isCorrect)` hook. Only fires when `isCorrect === true`.

**Enter key after wrong:** A `useEffect` adds a global `keydown` listener for Enter when `revealed && !isCorrect`, calling `advance()`.

## 4. API Endpoints

### 4.1 GET /surds-api/question

**Purpose:** Generate a random surds question at the specified difficulty.

**Query Parameters:**
- `difficulty` (string, optional): 'easy', 'medium', 'hard', or 'extrahard'. Defaults to 'easy'.

**Response (Easy — simplify √n):**
```json
{ "id": 1712345678000, "difficulty": "easy", "type": "simplify", "n": 72 }
```
- `n = a² × b` where `b` is square-free
- `a` ranges 2–9, `b` drawn from SQUARE_FREE list

**Response (Medium — add/subtract like surds):**
```json
{ "id": 1712345678001, "difficulty": "medium", "type": "addsub", "a": 3, "b": 2, "r": 5, "op": "+" }
```
- `a`, `b` range 1–9; for subtraction, `a > b` guaranteed
- `r` is a square-free radicand
- `op` is '+' or '-'

**Response (Hard — multiply surds):**
```json
{ "id": 1712345678002, "difficulty": "hard", "type": "multiply", "c1": 2, "r1": 6, "c2": 3, "r2": 10 }
```
- Represents `(c1√r1) × (c2√r2)`
- `c1`, `c2` range 1–5; `r1`, `r2` square-free

**Response (ExtraHard — rationalise, simple):**
```json
{ "id": 1712345678003, "difficulty": "extrahard", "type": "rationalise", "subtype": "simple", "a": 6, "b": 1, "r": 3 }
```
- Represents `a / (b√r)`

**Response (ExtraHard — rationalise, conjugate):**
```json
{ "id": 1712345678004, "difficulty": "extrahard", "type": "rationalise", "subtype": "conjugate", "a": 5, "p": 2, "q": 1, "r": 3 }
```
- Represents `a / (p + q√r)`

### 4.2 POST /surds-api/check

**Purpose:** Validate the user's surd answer against the correct simplified result.

**Request Body:** Question fields plus `answer` (string, e.g. "6√2", "5√5", "2√3/3", "10-5√3")

**Response:**
```json
{ "correct": true, "display": "6√2", "message": "Correct!" }
```

**Server-side Algorithm:**

1. **Simplify (easy):** Factor out largest perfect square from n → `outer√inner`
2. **Add/subtract (medium):** `a ± b` gives coefficient, radicand unchanged
3. **Multiply (hard):** `c1*c2 × √(r1*r2)`, then simplify √(r1*r2) via `simpleSurd()`
4. **Rationalise simple:** `a/(b√r) = a√r/(b*r)`, simplify fraction
5. **Rationalise conjugate:** `a/(p+q√r) × (p-q√r)/(p-q√r) = a(p-q√r)/(p²-q²r)`

**Answer parsing:** `parseSurd(s)` regex extracts `{ rational, coeff, radicand }` from strings like "6√2", "5", "10-5√3". User answers are normalized (√radicand simplified to square-free) before comparison.

**Utility Functions (server):**
- `isPerfectSquare(n)`: Check if n is a perfect square
- `simpleSurd(n)`: Factor out largest perfect square → `{ outer, inner }`
- `SQUARE_FREE`: Array of square-free numbers [2,3,5,6,7,10,11,13,14,15,17,19,21,22,23,26,29,30]
- `randInt(lo, hi)`: Random integer in [lo, hi]
- `pick(arr)`: Random element from array
- `gcd(a, b)`: Euclidean GCD (reused from fractions)
- `simplifyFraction(num, den)`: Reduce fraction (reused from fractions)

## 5. Difficulty Levels

| Level | Type | Description | Example |
|-------|------|-------------|---------|
| Easy | simplify | Simplify √n to a√b | √72 = 6√2 |
| Medium | addsub | Add/subtract like surds | 3√5 + 2√5 = 5√5 |
| Hard | multiply | Multiply and simplify | 2√6 × 3√10 = 6·2√15 = 12√15 |
| ExtraHard | rationalise | Rationalise denominators | 6/√3 = 2√3, 5/(2+√3) = 10-5√3 |

## 6. UI Layout

### 6.1 Setup Phase
Standard welcome box with:
- Description text
- Tip: "type √ using 'sqrt' or copy-paste √"
- Difficulty pills: Easy — Simplify / Medium — Add/Sub / Hard — Multiply / Extra Hard — Rationalise
- Questions number input (1–100, default 20)
- Start Quiz button

### 6.2 Playing Phase
- Progress pill: "Question N/T"
- Question prompt in large text (1.6rem)
- Single text input (placeholder "e.g. 6√2")
- Input normalization: "sqrt" → √ on submit
- Feedback div (correct/wrong)
- Submit / Next Question / Finish Quiz buttons
- Running ResultsTable

### 6.3 Finished Phase
Standard welcome box with score and ResultsTable.

## 7. Answer Format

Users type answers as text strings:
- Simple surd: `6√2`, `√3`, `5`
- Mixed: `10-5√3`, `10+5√3`
- Fractional: `2√3/3`, `(10-5√3)/7`
- Shorthand: `sqrt` is auto-replaced with `√`

## 8. Registration Points

1. **Home `allApps` array:** `{ key: 'surds', name: 'Surds', subtitle: 'Simplify, add, multiply, rationalise', color: 'green' }`
2. **Home `modeMap` object:** `surds: SurdsApp`
3. **`CUSTOM_PUZZLES` array:** `{ key: 'surds', name: 'Surds' }`
4. **`fetchQuestionForType` URL map:** `surds: '${API}/surds-api/question?difficulty=${difficulty}'`
5. **`getPromptForType` switch:** Returns appropriate prompt for each surd type
6. **CustomApp `handleSubmit` switch:** POSTs to `/surds-api/check` with answer string
7. **CustomApp `renderInputs` switch:** Text input with "e.g. 6√2" placeholder
8. **Vite proxy:** `/surds-api` → `http://127.0.0.1:4000`

## 9. State Machine

```
setup ──[Start Quiz]──→ playing ──[Last Q answered]──→ finished
                           │                              │
                           │ ←──[loadQuestion on qNum change]──┘ (Play Again resets to setup)
```

## 10. Generation Guarantees

All questions are generated algorithmically on-the-fly:
- **Easy:** 8 square-free bases × 8 multipliers = 64+ unique radicands; effectively unlimited
- **Medium:** 18 radicands × 9 × 9 × 2 ops = 2916+ unique problems
- **Hard:** 18 × 5 × 18 × 5 = 8100+ unique products
- **ExtraHard simple:** 18 × 4 × 12 = 864+ unique problems
- **ExtraHard conjugate:** 18 × 5 × 6 × 10 = 5400+ unique problems
