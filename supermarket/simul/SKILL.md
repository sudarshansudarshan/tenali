# Simultaneous Equations (3 Variables) — Formal Specification

## 1. Purpose

A simultaneous equations quiz where the player solves a system of three linear equations with three unknowns (ax + by + cz = d, ex + fy + gz = h, ix + jy + kz = l) to find x, y, and z. Features configurable question count (default 20) and difficulty levels controlling coefficient ranges.

## 2. Constants

```javascript
const DEFAULT_TOTAL = 20  // default number of questions per quiz
const AUTO_ADVANCE_MS = 1500  // auto-advance delay in milliseconds
```

## 3. Difficulty Levels

| Level | Solution Type | Coeff Range | Example |
|-------|---------------|-------------|---------|
| Easy | Small integer solutions | Small coefficients (1–10) | x + y + z = 6, x - y + z = 2, x + y - z = 0 → x = 2, y = 2, z = 2 |
| Medium | Integer or decimal solutions | Medium coefficients (1–20) | 2x + y + z = 9, x + 2y + z = 8, x + y + 2z = 7 → x = 3, y = 1, z = 2 |
| Hard | Any real solutions | Larger coefficients (1–30) | Complex systems with non-integer solutions |

**Server-side implementation:**
The server generates three linearly independent equations. For easy difficulty, equations are built from integer solutions. For medium/hard, random coefficients are used and the solution is computed via Gaussian elimination or similar method.

## 4. API Specification

### 4.1 GET /simul-api/question

**Query parameters:**
- `difficulty` (string, optional): 'easy', 'medium', or 'hard'. Default: 'easy'.

**Response (200):**
```json
{
  "id": "simul-1775067701647-0.857",
  "difficulty": "easy",
  "a": 1,
  "b": 1,
  "c": 1,
  "d": 6,
  "e": 1,
  "f": -1,
  "g": 1,
  "h": 2,
  "i": 1,
  "j": 1,
  "k": -1,
  "l": 0,
  "prompt": "Solve the system: x + y + z = 6, x - y + z = 2, x + y - z = 0",
  "x": 2,
  "y": 2,
  "z": 2
}
```

Represents:
- Equation 1: ax + by + cz = d → 1x + 1y + 1z = 6
- Equation 2: ex + fy + gz = h → 1x + (-1)y + 1z = 2
- Equation 3: ix + jy + kz = l → 1x + 1y + (-1)z = 0

### 4.2 POST /simul-api/check

**Request body:**
```json
{
  "a": 1,
  "b": 1,
  "c": 1,
  "d": 6,
  "e": 1,
  "f": -1,
  "g": 1,
  "h": 2,
  "i": 1,
  "j": 1,
  "k": -1,
  "l": 0,
  "x": 2,
  "y": 2,
  "z": 2
}
```

**Response (200):**
```json
{
  "correct": true,
  "correctX": 2,
  "correctY": 2,
  "correctZ": 2,
  "message": "Correct"
}
```

**Validation:** Verify that all three equations are satisfied: `a*x + b*y + c*z === d`, `e*x + f*y + g*z === h`, and `i*x + j*y + k*z === l`, with floating-point tolerance (0.01).

## 5. Frontend Component Specification

### 5.1 Component: SimulApp

**Props:** `onBack` (function)

**State:**

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| difficulty | string | 'easy' | Selected difficulty |
| started | boolean | false | Quiz has begun |
| finished | boolean | false | All questions done |
| question | object/null | null | Current question from API |
| x | string | '' | Player's x value |
| y | string | '' | Player's y value |
| z | string | '' | Player's z value |
| score | number | 0 | Correct answers count |
| questionNumber | number | 0 | Current question number |
| numQuestions | string | '20' | Configurable question count |
| totalQ | number | 20 | Computed total questions |
| feedback | string | '' | Feedback with reasoning |
| loading | boolean | false | Fetching question |
| revealed | boolean | false | Answer shown |
| results | array | [] | Result objects for each question |

**Timer:** `useTimer()` — starts on question load, stops on submit.

**advanceRef:** `useRef(() => {})` — updated every render with current advance logic.

### 5.2 User Flow

```
[Show difficulty selector: Easy / Medium / Hard]
[Show "How many questions?" input (default 20)]
[Show "Start Quiz" button]
        ↓ (click Start)
[Lock difficulty selector, compute totalQ]
[Set started=true, questionNumber=1, score=0, results=[]]
[fetchQuestion(difficulty)]
        ↓
[Display: "Question N/totalQ"]
[Display system of three equations in readable form:]
  [a]x + [b]y + [c]z = [d]
  [e]x + [f]y + [g]z = [h]
  [i]x + [j]y + [k]z = [l]
[Display: "Solve for x, y, and z"]
[Show 3 input fields: x, y, and z]
[Timer starts counting]
        ↓ (type solutions, submit)
[POST /simul-api/check]
[Stop timer, record result]
[Show feedback: "Correct! x = 2, y = 2, z = 2" or "Incorrect. Correct: x = 2, y = 2, z = 2"]
[Auto-advance after 1.5s OR press Enter to skip wait]
        ↓
[If questionNumber < totalQ: increment, fetchQuestion]
[If questionNumber >= totalQ: set finished=true]
        ↓ (finished)
[Show: "Quiz complete.", "Final score: 15/20"]
[Show ResultsTable with all results]
[Show "Play Again" button → restarts quiz]
```

### 5.3 Equation Display

Format the system nicely with proper sign handling:
```javascript
const formatCoeff = (coeff, isFirst = false) => {
  if (coeff === 0) return '';
  if (isFirst) return `${coeff === 1 ? '' : coeff === -1 ? '-' : coeff}`;
  return coeff > 0 ? `+ ${coeff === 1 ? '' : coeff}` : `- ${Math.abs(coeff) === 1 ? '' : Math.abs(coeff)}`;
};
// Example:
// x + y + z = 6
// x - y + z = 2
// x + y - z = 0
```

### 5.4 Feedback Format

Client-side construction:
```javascript
// Correct: "Correct! x = 2, y = 2, z = 2"
// Incorrect: "Incorrect. Correct: x = 2, y = 2, z = 2"
```

### 5.5 Results Record

After each answer, append to `results`:
```javascript
{
  question: `Solve: ${eq1}, ${eq2}, ${eq3}`,
  userAnswer: `x = ${x}, y = ${y}, z = ${z}`,
  correctAnswer: `x = ${data.correctX}, y = ${data.correctY}, z = ${data.correctZ}`,
  correct: data.correct,
  time: timeTaken
}
```

### 5.6 UI Layout

```
┌─────────────────────────────────┐
│ [← Home]                        │
│   Simultaneous Equations (3v)   │
│   Solve ax + by + cz = d and   │
│  similar for three equations    │
│                    [8s] [Score]  │
│ [Easy] [Medium] [Hard]          │
│    How many questions? [20]     │
│                                 │
│       Question 7/20             │
│ Solve the system:              │
│  x + y + z = 6                  │
│  x - y + z = 2                  │
│  x + y - z = 0                  │
│                                 │
│  x = [__________]              │
│  y = [__________]              │
│  z = [__________]              │
│          [Submit]               │
│┌─ Correct! x=2, y=2, z=2 ─────┐│
│  (auto-advances in 1.5s)       ││
│┌── Running Results Table ──────┐│
│ # │ Question │ Ans │ ✓/✗ │ t  ││
│└──────────────────────────────┘│
└─────────────────────────────────┘
```

### 5.7 Keyboard Support

Enter key listener activates submit or next when appropriate. Only active when `started && !finished`. Tab moves between x, y, and z input fields.

### 5.8 Auto-Advance

Uses the shared `useAutoAdvance(revealed, advanceRef)` hook. After an answer is revealed, automatically advances to the next question after 1.5 seconds. The player can press Enter to skip the wait.

### 5.9 Running Results Table

The results table is displayed both during gameplay and on the finish screen.

## 6. Implementation Notes

- Difficulty selector is disabled while quiz is in progress
- Input fields validate: accept integers for easy, decimals for medium/hard
- Allow both integer and decimal formats (2, 2.5, -1.75, etc.)
- Server generates linearly independent equations to ensure unique solutions
- Server recomputes solution to prevent cheating
- Floating-point comparison tolerance: 0.01
- Configurable question count defaults to 20 via `DEFAULT_TOTAL`
- Results array is reset on "Play Again"
- Uses DM Sans (body/UI) and Source Serif 4 (heading) fonts from Google Fonts
