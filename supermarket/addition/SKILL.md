# Addition — Formal Specification

## 1. Purpose

A 20-question addition quiz where the player selects a difficulty level (1-digit, 2-digit, or 3-digit numbers), then solves randomly generated addition problems. Each answer shows the complete working. A results table with per-question timing is displayed at the end.

## 2. Constants

```javascript
const TOTAL_ADDITION = 20  // fixed number of questions per quiz
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
| questionNumber | number | 0 | Current question (1-20) |
| feedback | string | '' | Feedback with reasoning |
| loading | boolean | false | Fetching question |
| revealed | boolean | false | Answer shown |
| results | array | [] | Result objects for each question |

**Timer:** `useTimer()` — starts on question load, stops on submit.

### 5.2 User Flow

```
[Show difficulty selector: One digit / Two digits / Three digits]
[Show "Start Quiz" button]
        ↓ (click Start)
[Lock difficulty selector]
[Set started=true, questionNumber=1, score=0, results=[]]
[fetchQuestion(digits)]
        ↓
[Display: "Question N/20", question prompt "47 + 83 = ?", input field]
[Timer starts counting]
        ↓ (type answer, submit)
[POST /addition-api/check]
[Stop timer, record result]
[Show feedback: "Correct! 47 + 83 = 130" or "Incorrect. 47 + 83 = 130"]
        ↓ (click Next / press Enter)
[If questionNumber < 20: increment, fetchQuestion]
[If questionNumber >= 20: set finished=true]
        ↓ (finished)
[Show: "Quiz complete.", "Final score: 15/20"]
[Show ResultsTable with all 20 results]
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
│  Choose a level and solve 20    │
│       addition questions         │
│                    [8s] [Score]  │
│  [One digit] [Two digits] [Three digits]  │
│                                  │
│       Question 7/20              │
│       47 + 83 = ?                │
│       ┌──────────────┐           │
│       │  Type answer  │           │
│       └──────────────┘           │
│          [Submit]                │
│ ┌─ Correct! 47 + 83 = 130 ────┐ │
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

## 6. Implementation Notes

- Difficulty selector is disabled while quiz is in progress (`disabled={started && !finished}`)
- The `answer` field from the GET response is included but not used client-side for verification — the POST endpoint recomputes it
- Input uses `type="number"` with `inputMode="numeric"` for mobile keyboard optimization
- Results array is reset on "Play Again" (`setResults([])`)
- Finish screen spacing: results summary has `margin-bottom: 32px` before the Play Again button for visual breathing room
- Uses DM Sans (body/UI) and Source Serif 4 (heading) fonts from Google Fonts
