# Square Root — Formal Specification

## 1. Purpose

A continuous drill for estimating square roots to the nearest integer. The player is given a number and must provide an integer estimate. Both the floor and ceiling of the true square root are accepted as correct. There is no fixed question limit — the drill continues until the player navigates away. Difficulty increases automatically based on the question number. Features an on-screen NumPad, auto-advance after 1.5s, and a running results table with per-question timing displayed below the quiz.

## 2. Progressive Difficulty

Difficulty scales automatically based on the question number (`step`):

| Step range | Number range (q) | Approximate √ range |
|-----------|-----------------|---------------------|
| 1–10 | 2 to 50 | 1.4 to 7.1 |
| 11–20 | 51 to 150 | 7.1 to 12.2 |
| 21–35 | 151 to 350 | 12.3 to 18.7 |
| 36–60 | 351 to 700 | 18.7 to 26.5 |
| 61+ | 701 to 999 | 26.5 to 31.6 |

**Server-side implementation:**
```javascript
function bandForStep(step) {
  if (step <= 10) return { min: 2, max: 50 };
  if (step <= 20) return { min: 51, max: 150 };
  if (step <= 35) return { min: 151, max: 350 };
  if (step <= 60) return { min: 351, max: 700 };
  return { min: 701, max: 999 };
}
```

The number `q` is generated using `randomInt(band.min, band.max)`.

## 3. Answer Acceptance Logic

Both floor and ceiling of the true square root are accepted:

```javascript
const sqrt = Math.sqrt(Number(q));
const floorAnswer = Math.floor(sqrt);
const ceilAnswer = Math.ceil(sqrt);
const correct = (numericAnswer === floorAnswer) || (numericAnswer === ceilAnswer);
```

**Examples:**
- √47 = 6.856 → accept 6 or 7
- √49 = 7.000 → accept 7 only (floor === ceiling)
- √2 = 1.414 → accept 1 or 2

## 4. API Specification

### 4.1 GET /sqrt-api/question

**Query parameters:**
- `step` (integer, optional): question number, determines difficulty band. Default: 1. Minimum: 1.

**Response (200):**
```json
{
  "id": "5-1775067701647-0.857",
  "q": 47,
  "step": 5,
  "prompt": "√47",
  "floorAnswer": 6,
  "ceilAnswer": 7,
  "sqrtRounded": "6.86"
}
```

**Notes:**
- `sqrtRounded` is `Math.sqrt(q).toFixed(2)` — a string with 2 decimal places
- Both `floorAnswer` and `ceilAnswer` are returned for client-side feedback

### 4.2 POST /sqrt-api/check

**Request body:**
```json
{ "q": 47, "answer": 7 }
```

**Response (200):**
```json
{
  "correct": true,
  "floorAnswer": 6,
  "ceilAnswer": 7,
  "sqrtRounded": "6.86",
  "message": "Correct"
}
```

**Note:** Server recomputes sqrt, floor, and ceiling from `q`. Does not trust client values.

## 5. Frontend Component Specification

### 5.1 Component: SqrtApp

**Props:** `onBack` (function)

**State:**

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| numQuestions | string | '' | Optional question limit (empty = unlimited) |
| started | boolean | false | Drill has begun |
| finished | boolean | false | Drill complete (if limit set) |
| question | object/null | null | `{ q, step, prompt, floorAnswer, ceilAnswer, sqrtRounded }` |
| answer | string | '' | Player's typed answer |
| score | number | 0 | Correct answers count |
| questionNumber | number | 0 | Current question count |
| totalQ | number | Infinity | Total questions (Infinity if no limit set) |
| feedback | string | '' | Multi-line feedback |
| loading | boolean | false | Fetching question |
| revealed | boolean | false | Answer shown |
| results | array | [] | Result objects |

**Key differences from other quizzes:** No difficulty selector. Optional question limit (can run indefinitely). Has `numQuestions` input but defaults to unlimited.

**advanceRef:** `useRef(() => {})` — updated every render, used by `useAutoAdvance` hook.

### 5.2 User Flow

```
[Show "The square-root drill will keep going until you stop."]
[Show "Start Drill" button]
        ↓ (click Start)
[started=true, score=0, questionNumber=1, results=[]]
[fetchQuestion(1)]
        ↓
[Display: "Question N" (no total)]
[Display: "√47 = ?", NumPad below input]
[Timer counting]
        ↓ (submit via physical keyboard or NumPad)
[POST /sqrt-api/check]
[Stop timer, record result]
[Show feedback with reasoning]
[Auto-advance after 1.5s if correct; click Next if wrong]
        ↓
[questionNumber++, fetchQuestion(next)]
[Loop until limit reached or user exits]

[User clicks "← Home" to exit at any time]
```

### 5.3 Step-by-Step Feedback

```javascript
const reasoning = `√${question.q} = ${data.sqrtRounded}\n⌊${data.sqrtRounded}⌋ = ${data.floorAnswer}, ⌈${data.sqrtRounded}⌉ = ${data.ceilAnswer}`
```

**Correct example:**
```
Correct!
√47 = 6.86
⌊6.86⌋ = 6, ⌈6.86⌉ = 7
```

**Incorrect example:**
```
Incorrect.
√47 = 6.86
⌊6.86⌋ = 6, ⌈6.86⌉ = 7
Acceptable answers: 6 or 7
```

Uses mathematical floor (⌊⌋) and ceiling (⌈⌉) notation.

### 5.4 Results Record

```javascript
{
  question: `√${question.q}`,           // e.g., "√47"
  userAnswer: answer,                    // e.g., "7"
  correctAnswer: `${data.floorAnswer} or ${data.ceilAnswer}`,  // e.g., "6 or 7"
  correct: data.correct,
  time: timeTaken
}
```

### 5.5 Results Display

Unlike fixed-length quizzes, the results table is displayed **below the quiz area** at all times (not on a finish screen). It grows with each answered question, showing the full history of the session.

### 5.6 UI Layout

```
┌─────────────────────────────────┐
│ [← Home]                        │
│          Square Root             │
│    Floor or ceiling is accepted  │
│                    [5s] [Score]  │
│                                  │
│         Question 14              │
│          √247 = ?                │
│       ┌──────────────┐           │
│       │  Type answer  │           │
│       └──────────────┘           │
│                                  │
│ ┌─ Correct!                    ─┐│
│ │ √247 = 15.72                  ││
│ │ ⌊15.72⌋ = 15, ⌈15.72⌉ = 16   ││
│ └────────────────────────────────┘│
│        [Next Question]           │
│                                  │
│ ┌── Results Table ─────────────┐ │
│ │ # │ Question │ Ans │ ✓/✗ │ t │ │
│ │ 1 │ √37      │  6  │  ✓  │3s│ │
│ │...│ ...      │ ... │ ... │..│ │
│ │14 │ √247     │ 16  │  ✓  │5s│ │
│ └──────────────────────────────┘ │
│ Total: 87s · Avg: 6.2s          │
└─────────────────────────────────┘
```

### 5.7 NumPad

An on-screen numeric keypad is rendered below the input field via the shared `NumPad` component. Features digits 0–9, ± toggle, and ⌫ backspace. Physical keyboard input works alongside (input is `type="text"` with regex validation).

### 5.8 Auto-Advance

Uses the shared `useAutoAdvance(revealed, advanceRef, isCorrect)` hook. After a correct answer is revealed, automatically advances to the next question after 1.5 seconds. On wrong answers, the player must click Next manually. The player can press Enter to skip the wait on correct answers.

### 5.9 Keyboard Support

Enter key listener active when `started && !finished`.

## 6. Implementation Notes

- `fetchQuestion(step)` uses the current `questionNumber + 1` as the step for the next question
- The question number is incremented BEFORE fetching the next question
- `startQuiz()` resets all state and fetches with step=1
- Optional "How many questions?" input — if left empty, drill runs indefinitely
- Input uses `type="text"` (not `type="number"`) to support NumPad and minus sign
- The timer pill is visible whenever `started && !revealed`
- Uses DM Sans (body/UI) and Source Serif 4 (heading) fonts from Google Fonts
