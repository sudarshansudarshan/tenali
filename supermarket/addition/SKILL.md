# Addition — Formal Specification

## 1. Purpose

An addition quiz with configurable question count (default 20) where the player selects a difficulty level (1-digit, 2-digit, or 3-digit numbers), then solves randomly generated addition problems. Features an on-screen NumPad, auto-advance after 1.5s, and a running results table shown during gameplay.

## 2. Constants

```javascript
const DEFAULT_TOTAL = 20  // default number of questions per quiz (shared across quizzes)
const AUTO_ADVANCE_MS = 1500  // auto-advance delay in milliseconds
```

## 3. Difficulty Levels

| Level | digits param | Range min | Range max | Example |
|-------|-------------|-----------|-----------|---------|
| One digit | 1 | 0 | 9 | 3 + 7 |
| Two digits | 2 | 10 | 99 | 47 + 83 |
| Three digits | 3 | 100 | 999 | 456 + 278 |

**Server-side implementation:**
```javascript
function digitRange(digits) {
  if (digits === 1) return { min: 0, max: 9 };
  if (digits === 2) return { min: 10, max: 99 };
  return { min: 100, max: 999 };
}
```

Both operands `a` and `b` are generated independently within the same range using `randomInt(range.min, range.max)`.

## 4. API Specification

### 4.1 GET /addition-api/question

**Query parameters:**
- `digits` (integer, optional): 1, 2, or 3. Default: 1. Invalid values fall back to 1.

**Response (200):**
```json
{
  "id": "2-1775067701647-0.857",
  "digits": 2,
  "a": 47,
  "b": 83,
  "prompt": "47 + 83",
  "answer": 130
}
```

### 4.2 POST /addition-api/check

**Request body:**
```json
{ "a": 47, "b": 83, "answer": 130 }
```

**Response (200):**
```json
{
  "correct": true,
  "correctAnswer": 130,
  "message": "Correct"
}
```

**Validation:** `Number(answer) === Number(a) + Number(b)` — server recomputes the sum.

## 5. Frontend Component Specification

### 5.1 Component: AdditionApp

**Props:** `onBack` (function)

**State:**

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| digits | number | 1 | Selected difficulty (1/2/3) |
| started | boolean | false | Quiz has begun |
| finished | boolean | false | All 20 questions done |
| question | object/null | null | Current question from API |
| answer | string | '' | Player's typed answer |
| score | number | 0 | Correct answers count |
| questionNumber | number | 0 | Current question number |
| numQuestions | string | '20' | Configurable question count input |
| totalQ | number | 20 | Computed total questions |
| feedback | string | '' | Feedback with reasoning |
| loading | boolean | false | Fetching question |
| revealed | boolean | false | Answer shown |
| results | array | [] | Result objects for each question |

**Timer:** `useTimer()` — starts on question load, stops on submit.

**advanceRef:** `useRef(() => {})` — updated every render with current advance logic, used by `useAutoAdvance` hook to avoid stale closures.

### 5.2 User Flow

```
[Show difficulty selector: One digit / Two digits / Three digits]
[Show "How many questions?" input (default 20)]
[Show "Start Quiz" button]
        ↓ (click Start)
[Lock difficulty selector, compute totalQ from input]
[Set started=true, questionNumber=1, score=0, results=[]]
[fetchQuestion(digits)]
        ↓
[Display: "Question N/totalQ", question prompt "47 + 83 = ?", input field, NumPad]
[Timer starts counting]
        ↓ (type answer via physical keyboard or NumPad, submit)
[POST /addition-api/check]
[Stop timer, record result]
[Show feedback: "Correct! 47 + 83 = 130" or "Incorrect. 47 + 83 = 130"]
[Auto-advance after 1.5s OR press Enter to skip wait]
        ↓
[If questionNumber < totalQ: increment, fetchQuestion]
[If questionNumber >= totalQ: set finished=true]
        ↓ (finished)
[Show: "Quiz complete.", "Final score: 15/20"]
[Show ResultsTable with all results]
[Show "Play Again" button → restarts quiz]
```

### 5.3 Feedback Format

Client-side construction:
```javascript
const reasoning = `${question.a} + ${question.b} = ${data.correctAnswer}`
// Correct: "Correct! 47 + 83 = 130"
// Incorrect: "Incorrect. 47 + 83 = 130"
```

### 5.4 Results Record

After each answer, append to `results`:
```javascript
{
  question: `${question.a} + ${question.b}`,  // e.g., "47 + 83"
  userAnswer: answer,                          // e.g., "130"
  correctAnswer: data.correctAnswer,           // e.g., 130
  correct: data.correct,                       // true/false
  time: timeTaken                              // seconds
}
```

### 5.5 UI Layout

```
┌─────────────────────────────────┐
│ [← Home]                        │
│            Addition              │
│  Choose a level and solve        │
│       addition questions         │
│                    [8s] [Score]  │
│  [One digit] [Two digits] [Three digits]  │
│     How many questions? [20]     │
│                                  │
│       Question 7/20              │
│       47 + 83 = ?                │
│       ┌──────────────┐           │
│       │  Type answer  │           │
│       └──────────────┘           │
│     [± ] [1] [2] [3]            │
│     [⌫ ] [4] [5] [6]            │
│     [   ] [7] [8] [9]           │
│     [       0       ]            │
│          [Submit]                │
│ ┌─ Correct! 47 + 83 = 130 ────┐ │
│   (auto-advances in 1.5s)       │
│ ┌── Running Results Table ─────┐ │
│ │ # │ Question  │ Ans │ ✓/✗ │t│ │
│ └──────────────────────────────┘ │
└─────────────────────────────────┘

FINISH SCREEN:
┌─────────────────────────────────┐
│       Quiz complete.             │
│    Final score: 15/20            │
│ ┌── Results Table ─────────────┐ │
│ │ # │ Question  │ Ans │ ✓/✗ │t│ │
│ │ 1 │ 47 + 83   │ 130 │  ✓  │4│ │
│ │ 2 │ 91 + 56   │ 145 │✗(147)│12│ │
│ └──────────────────────────────┘ │
│ Total: 180s · Avg: 9.0s         │
│         [Play Again]             │
└─────────────────────────────────┘
```

### 5.6 Keyboard Support

Enter key listener with dependencies: `[started, finished, question, answer, revealed, score, questionNumber, digits, loading]`. Only active when `started && !finished`.

### 5.6 NumPad

An on-screen numeric keypad is rendered below the input field via the shared `NumPad` component. It features:
- Digits 0–9 arranged in a calculator-style grid (3 columns + full-width 0)
- A ± key that toggles the sign of the current answer
- A ⌫ key that deletes the last character
- Physical keyboard input works alongside (input is `type="text"` with regex validation)

NumPad key handler:
```javascript
const handleNumPad = (key) => {
  if (revealed) return
  if (key === '±') setAnswer(prev => prev.startsWith('-') ? prev.slice(1) : prev ? '-' + prev : '-')
  else if (key === '⌫') setAnswer(prev => prev.slice(0, -1))
  else setAnswer(prev => prev + key)
}
```

Input validation (onChange): `if (v === '' || v === '-' || /^-?\d+$/.test(v)) setAnswer(v)`

### 5.7 Auto-Advance

Uses the shared `useAutoAdvance(revealed, advanceRef)` hook. After an answer is revealed, automatically advances to the next question after 1.5 seconds. The player can press Enter to skip the wait.

### 5.8 Running Results Table

The results table is displayed both during gameplay (`{results.length > 0 && <ResultsTable results={results} />}`) and on the finish screen.

## 6. Implementation Notes

- Difficulty selector is disabled while quiz is in progress (`disabled={started && !finished}`)
- The `answer` field from the GET response is included but not used client-side for verification — the POST endpoint recomputes it
- Input uses `type="text"` (not `type="number"`) to support the NumPad and minus sign on all devices
- Configurable question count defaults to 20 via `DEFAULT_TOTAL`
- Results array is reset on "Play Again" (`setResults([])`)
- Uses DM Sans (body/UI) and Source Serif 4 (heading) fonts from Google Fonts
