# Basic Arithmetic — Formal Specification

## 1. Purpose

A basic arithmetic quiz involving addition, subtraction, and multiplication of positive and negative numbers. The operation is randomly chosen each question. Difficulty controls the number of digits. Features an on-screen NumPad, configurable question count (default 20), and a running results table during gameplay.

## 2. Constants

```javascript
const DEFAULT_TOTAL = 20  // default number of questions per quiz
const AUTO_ADVANCE_MS = 1500  // auto-advance delay in milliseconds
```

## 3. Difficulty Levels

| Level | Digits | Number Range | Example |
|-------|--------|-------------|---------|
| Easy | 1 digit | 1–9 (with random negation) | −7 + 6, 3 × (−4) |
| Medium | 2 digits | 10–99 (with random negation) | −45 + 32, 67 − (−12) |
| Hard | 3 digits | 100–999 (with random negation) | 345 × (−2), −501 + 299 |

Each operand has a 40% chance of being negated. Operations are chosen randomly and uniformly from +, −, ×.

**Server-side implementation:**
```javascript
function arithRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 9 };
  if (difficulty === 'medium') return { min: 10, max: 99 };
  return { min: 100, max: 999 };
}
```

## 4. API Specification

### 4.1 GET /basicarith-api/question

**Query parameters:**
- `difficulty` (string, optional): 'easy', 'medium', or 'hard'. Default: 'easy'.

**Response (200):**
```json
{
  "id": "arith-1775067701647-0.857",
  "a": -7,
  "b": 6,
  "op": "+",
  "prompt": "−7 + 6",
  "answer": -1
}
```

Operations: `+`, `−`, `×`. The `prompt` field has readable formatting with parentheses around negative numbers where needed for clarity (e.g., `(−7) × (6)`).

### 4.2 POST /basicarith-api/check

**Request body:**
```json
{
  "a": -7,
  "b": 6,
  "op": "+",
  "answer": -1
}
```

**Response (200):**
```json
{
  "correct": true,
  "correctAnswer": -1,
  "message": "Correct"
}
```

## 5. Frontend Component Specification

### 5.1 Component: BasicArithApp

**Props:** `onBack` (function)

**State:**

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| difficulty | string | 'easy' | Selected difficulty |
| started | boolean | false | Quiz has begun |
| finished | boolean | false | All questions done |
| question | object/null | null | Current question from API |
| answer | string | '' | Player's typed answer |
| score | number | 0 | Correct answers count |
| questionNumber | number | 0 | Current question number |
| numQuestions | string | '20' | Configurable question count |
| totalQ | number | 20 | Computed total questions |
| feedback | string | '' | Feedback message |
| isCorrect | boolean/null | null | Whether last answer was correct |
| loading | boolean | false | Fetching question |
| revealed | boolean | false | Answer shown |
| results | array | [] | Result objects for each question |

**Timer:** `useTimer()` — starts on question load, stops on submit.

### 5.2 User Flow

```
[Show difficulty selector: 1 digit / 2 digits / 3 digits]
[Show "How many questions?" input (default 20)]
[Show "Start Quiz" button]
        ↓ (click Start)
[Lock difficulty selector, compute totalQ]
[fetchQuestion(difficulty)]
        ↓
[Display: "Question N/totalQ"]
[Display: "−7 + 6 = ?"]
[Show answer input + NumPad]
[Timer starts counting]
        ↓ (type answer, press Enter or Submit)
[POST /basicarith-api/check]
[Stop timer, record result]
[Show feedback: "Correct! −7 + 6 = −1" or "Incorrect. −7 + 6 = −1"]
[Auto-advance after 1.5s if correct; click Next if wrong]
        ↓
[If questionNumber < totalQ: increment, fetchQuestion]
[If questionNumber >= totalQ: set finished=true]
        ↓ (finished)
[Show: "Quiz complete.", "Final score: 15/20"]
[Show ResultsTable with all results]
[Show "Play Again" button → restarts quiz]
```

### 5.3 Input

- Single `<input type="text">` with regex validation: `/^-?\d+$/`
- On-screen `NumPad` component for touch/mobile use
- Physical keyboard Enter key triggers submit or next

### 5.4 Auto-Advance

Uses `useAutoAdvance(revealed, advanceRef, isCorrect)` — only auto-advances on correct answers. On wrong answers, the player must click Next manually.

### 5.5 Results Record

After each answer, append to `results`:
```javascript
{
  question: question.prompt,      // e.g. "−7 + 6"
  userAnswer: answer,             // e.g. "-1"
  correctAnswer: String(data.correctAnswer),
  correct: data.correct,
  time: timeTaken
}
```

## 6. Implementation Notes

- Difficulty radio buttons show "1 digit", "2 digits", "3 digits"
- Uses DM Sans (body/UI) and Source Serif 4 (heading) fonts
- Input validates negative numbers (allows leading `-`)
- Multiplication uses `×` symbol in prompts, stored as `×` in the `op` field
- Subtraction uses `−` (minus sign, U+2212) in the `op` field
