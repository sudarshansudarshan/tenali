# Quadratic — Formal Specification

## 1. Purpose

A quiz with configurable question count (default 20) on evaluating quadratic expressions by substitution. The player selects a difficulty level (Easy, Medium, Hard), then computes y = ax² + bx + c for given values of a, b, c, and x. All values are single-digit integers — difficulty controls the range. After each answer, a full step-by-step substitution chain is displayed. Features an on-screen NumPad, auto-advance after 1.5s, and a running results table shown during gameplay.

## 2. Constants

```javascript
const DEFAULT_TOTAL = 20  // default number of questions per quiz (shared across quizzes)
const AUTO_ADVANCE_MS = 1500  // auto-advance delay in milliseconds
```

## 3. Difficulty Levels

| Level | Range min | Range max | Typical max product |
|-------|-----------|-----------|-------------------|
| Easy | -3 | 3 | 27 (3 × 3²) |
| Medium | -6 | 6 | 216 (6 × 6²) |
| Hard | -9 | 9 | 729 (9 × 9²) |

**Important constraint:** No coefficient (a, b, c) or x value ever exceeds a single digit in magnitude (0–9). Difficulty comes from the size within that range.

**Server-side implementation:**
```javascript
function quadraticRange(difficulty) {
  if (difficulty === 'easy') return { min: -3, max: 3 };
  if (difficulty === 'medium') return { min: -6, max: 6 };
  return { min: -9, max: 9 };
}
```

All four values (a, b, c, x) are generated independently within the same range.

**Important constraint on `a`:** The coefficient `a` must never be zero (otherwise the equation degenerates to linear). The server uses a `while (a === 0)` loop to ensure this.

## 4. API Specification

### 4.1 GET /quadratic-api/question

**Query parameters:**
- `difficulty` (string, optional): "easy", "medium", or "hard". Default: "hard".

**Response (200):**
```json
{
  "id": "quadratic-1775067701647-0.857",
  "a": 7,
  "b": 3,
  "c": -4,
  "x": -3,
  "prompt": "If x = -3, find y for y = 7x² + 3x - 4",
  "answer": 50
}
```

**Server-side prompt formatting:**

The `prompt` field is built using `formatSignedTerm(value, variablePart, isFirst)`:
- First term shows its natural sign: `-8x²` or `7x²`
- Subsequent terms show operator: `+ 3x` or `- 4`
- Zero values are shown as `+ 0x` or `+ 0`

**Answer computation:** `a * x * x + b * x + c` (integer arithmetic, no floating point)

### 4.2 POST /quadratic-api/check

**Request body:**
```json
{ "a": 7, "b": 3, "c": -4, "x": -3, "answer": 50 }
```

**Response (200):**
```json
{
  "correct": true,
  "correctAnswer": 50,
  "message": "Correct"
}
```

**Validation:** Server recomputes `a*x*x + b*x + c` from the provided values. Does not trust any client-sent answer.

## 5. Frontend Component Specification

### 5.1 Component: QuadraticApp

**Props:** `onBack` (function)

**State:**

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| difficulty | string | 'easy' | 'easy'/'medium'/'hard' |
| started | boolean | false | Quiz has begun |
| finished | boolean | false | All questions done |
| question | object/null | null | `{ a, b, c, x, prompt, answer }` |
| answer | string | '' | Player's typed answer |
| score | number | 0 | Correct answers count |
| questionNumber | number | 0 | Current question number |
| numQuestions | string | '20' | Configurable question count input |
| totalQ | number | 20 | Computed total questions |
| feedback | string | '' | Multi-line feedback with reasoning |
| loading | boolean | false | Fetching question |
| revealed | boolean | false | Answer shown |
| results | array | [] | Result objects |

**advanceRef:** `useRef(() => {})` — updated every render with current advance logic, used by `useAutoAdvance` hook.

### 5.2 Question Display

The question is rendered as two styled lines (NOT the server's `prompt` string):

```jsx
<span className="given">x = {question.x}</span>
<span className="equation">
  y = {formatCoeff(question.a)}x² {sign} {formatCoeff(Math.abs(question.b))}x {sign} {Math.abs(question.c)}
</span>
```

**Coefficient display rules:**
- If coefficient is 1: show just `x²` (not `1x²`)
- If coefficient is -1: show `−x²` (not `-1x²`)
- Otherwise: show the number (e.g., `7x²`, `−3x`)
- Signs between terms: `+` for positive, `−` for negative

### 5.3 Step-by-Step Feedback

Computed entirely client-side after receiving `data.correctAnswer`:

```javascript
const { a, b, c, x } = question
const xSq = x * x              // x squared
const termA = a * xSq           // a * x²
const termB = b * x             // b * x
const sign = (v) => v >= 0 ? `+ ${v}` : `− ${Math.abs(v)}`

const reasoning = [
  `y = ${a}(${x})² ${sign(b)}(${x}) ${sign(c)}`,
  `= ${a}(${xSq}) ${sign(termB)} ${sign(c)}`,
  `= ${termA} ${sign(termB)} ${sign(c)}`,
  `= ${data.correctAnswer}`
].join('\n')
```

**Example output** (a=7, b=3, c=-4, x=-3):
```
Correct!
y = 7(-3)² + 3(-3) − 4
= 7(9) − 9 − 4
= 63 − 9 − 4
= 50
```

The feedback div uses `white-space: pre-line` to render `\n` as line breaks.

### 5.4 Results Record

```javascript
{
  question: `y = ${a}x² ${b >= 0 ? '+' : '−'} ${Math.abs(b)}x ${c >= 0 ? '+' : '−'} ${Math.abs(c)}, x=${x}`,
  userAnswer: answer,
  correctAnswer: data.correctAnswer,
  correct: data.correct,
  time: timeTaken
}
```

### 5.5 User Flow

```
[Show difficulty selector: Easy / Medium / Hard]
[Show "How many questions?" input (default 20)]
[Show "Start Quiz" button]
        ↓ (click Start)
[Lock difficulty, compute totalQ, started=true, results=[]]
[fetchQuestion(difficulty)]
        ↓
[Display: "Question N/totalQ"]
[Display: "x = -3" (given line)]
[Display: "y = 7x² + 3x − 4" (equation line)]
[Input placeholder: "y = ?", NumPad below]
[Timer counting]
        ↓ (submit via physical keyboard or NumPad)
[POST /quadratic-api/check]
[Stop timer, compute reasoning, record result]
[Show multi-line feedback]
[Auto-advance after 1.5s if correct; click Next if wrong]
        ↓
[If < totalQ: next question]
[If = totalQ: show finish screen with ResultsTable]
```

### 5.6 NumPad

An on-screen numeric keypad is rendered below the input field via the shared `NumPad` component. It features digits 0–9, ± toggle, and ⌫ backspace. Physical keyboard input works alongside (input is `type="text"` with regex validation `/^-?\d+$/`).

### 5.7 Auto-Advance

Uses the shared `useAutoAdvance(revealed, advanceRef, isCorrect)` hook. After a correct answer is revealed, automatically advances to the next question after 1.5 seconds. On wrong answers, the player must click Next manually. The player can press Enter to skip the wait on correct answers.

### 5.8 Running Results Table

The results table is displayed both during gameplay and on the finish screen.

### 5.9 Keyboard Support

Enter key listener with dependencies: `[started, finished, question, answer, revealed, questionNumber, loading, totalQ]`. Active when `started && !finished`.

## 6. Implementation Notes

- The input placeholder is "y = ?" (not "Type your answer") to match the mathematical context
- Difficulty selector uses the `.radio-pill` CSS pattern (shared with Addition app)
- The `fetchQuestion()` call passes the current difficulty as a query parameter
- `startQuiz()` resets: started=true, finished=false, score=0, questionNumber=1, results=[]
- Configurable question count defaults to 20 via `DEFAULT_TOTAL`
- Input uses `type="text"` (not `type="number"`) to support NumPad and minus sign on all devices
- Coefficient `a` is guaranteed non-zero by server-side `while (a === 0)` loop
- Uses DM Sans (body/UI) and Source Serif 4 (heading) fonts from Google Fonts
