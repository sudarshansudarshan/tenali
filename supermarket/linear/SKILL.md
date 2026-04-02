# Linear Equations (2 Variables) — Formal Specification

## 1. Purpose

A linear equations quiz where the player solves a system of two linear equations with two unknowns (ax + by = c, dx + ey = f) to find x and y. Features configurable question count (default 20) and difficulty levels controlling coefficient ranges and solution types.

## 2. Constants

```javascript
const DEFAULT_TOTAL = 20  // default number of questions per quiz
const AUTO_ADVANCE_MS = 1500  // auto-advance delay in milliseconds
```

## 3. Difficulty Levels

| Level | Solution Type | Method | Example |
|-------|---------------|--------|---------|
| Easy | Integer solutions | Built from solution | x + y = 5, x - y = 1 → x = 3, y = 2 |
| Medium | Any real solutions | Any system | 2x + 3y = 7, x - y = 1 → x = 2, y = 1 |
| Hard | Any real solutions | Larger coefficients | 7x + 4y = 25, 3x - 2y = 1 → x = 1.5, y = 2.75 |

**Server-side implementation:**
- Easy: Generate from solution integers, then build equations to guarantee integer results
- Medium/Hard: Generate random linearly independent equations, compute solution

## 4. API Specification

### 4.1 GET /linear-api/question

**Query parameters:**
- `difficulty` (string, optional): 'easy', 'medium', or 'hard'. Default: 'easy'.

**Response (200):**
```json
{
  "id": "linear-1775067701647-0.857",
  "difficulty": "easy",
  "a": 1,
  "b": 1,
  "c": 5,
  "d": 1,
  "e": -1,
  "f": 1,
  "prompt": "Solve the system: x + y = 5, x - y = 1",
  "x": 3,
  "y": 2
}
```

Represents:
- Equation 1: ax + by = c → 1x + 1y = 5
- Equation 2: dx + ey = f → 1x + (-1)y = 1

### 4.2 POST /linear-api/check

**Request body:**
```json
{
  "a": 1,
  "b": 1,
  "c": 5,
  "d": 1,
  "e": -1,
  "f": 1,
  "x": 3,
  "y": 2
}
```

**Response (200):**
```json
{
  "correct": true,
  "correctX": 3,
  "correctY": 2,
  "message": "Correct"
}
```

**Validation:** Verify that both equations are satisfied: `a*x + b*y === c` and `d*x + e*y === f`, with floating-point tolerance (0.01).

## 5. Frontend Component Specification

### 5.1 Component: LinearApp

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
[Display system of equations in readable form:]
  [a]x + [b]y = [c]
  [d]x + [e]y = [f]
[Display: "Solve for x and y"]
[Show 2 input fields: x and y]
[Timer starts counting]
        ↓ (type solutions, submit)
[POST /linear-api/check]
[Stop timer, record result]
[Show feedback: "Correct! x = 3, y = 2" or "Incorrect. Correct: x = 3, y = 2"]
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

Format the system nicely:
```javascript
const eq1 = `${question.a}x ${question.b >= 0 ? '+' : ''} ${question.b}y = ${question.c}`;
const eq2 = `${question.d}x ${question.e >= 0 ? '+' : ''} ${question.e}y = ${question.f}`;
// Display as:
// 1x + 1y = 5
// 1x - 1y = 1
```

### 5.4 Feedback Format

Client-side construction:
```javascript
// Correct: "Correct! x = 3, y = 2"
// Incorrect: "Incorrect. Correct: x = 3, y = 2"
```

### 5.5 Results Record

After each answer, append to `results`:
```javascript
{
  question: `Solve: ${eq1}, ${eq2}`,
  userAnswer: `x = ${x}, y = ${y}`,
  correctAnswer: `x = ${data.correctX}, y = ${data.correctY}`,
  correct: data.correct,
  time: timeTaken
}
```

### 5.6 UI Layout

```
┌─────────────────────────────────┐
│ [← Home]                        │
│    Linear Equations (2 vars)    │
│   Solve ax + by = c and        │
│       dx + ey = f               │
│                    [8s] [Score]  │
│ [Easy] [Medium] [Hard]          │
│    How many questions? [20]     │
│                                 │
│       Question 7/20             │
│ Solve the system:              │
│  x + y = 5                      │
│  x - y = 1                      │
│                                 │
│  x = [__________]              │
│  y = [__________]              │
│          [Submit]               │
│┌─ Correct! x = 3, y = 2 ──────┐│
│  (auto-advances in 1.5s)       ││
│┌── Running Results Table ──────┐│
│ # │ Question │ Ans │ ✓/✗ │ t  ││
│└──────────────────────────────┘│
└─────────────────────────────────┘
```

### 5.7 Keyboard Support

Enter key listener activates submit or next when appropriate. Only active when `started && !finished`. Tab moves between x and y input fields.

### 5.8 Auto-Advance

Uses the shared `useAutoAdvance(revealed, advanceRef)` hook. After an answer is revealed, automatically advances to the next question after 1.5 seconds. The player can press Enter to skip the wait.

### 5.9 Running Results Table

The results table is displayed both during gameplay and on the finish screen.

## 6. Implementation Notes

- Difficulty selector is disabled while quiz is in progress
- Input fields validate: accept integers for easy, decimals for medium/hard
- Allow both integer and decimal formats (1, 1.5, -2.75, etc.)
- Server recomputes solution to prevent cheating
- Floating-point comparison tolerance: 0.01
- Configurable question count defaults to 20 via `DEFAULT_TOTAL`
- Results array is reset on "Play Again"
- Uses DM Sans (body/UI) and Source Serif 4 (heading) fonts from Google Fonts
