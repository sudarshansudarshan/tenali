# Quadratic

A 20-question quiz on evaluating quadratic expressions by substitution, with three difficulty levels.

## Overview

The Quadratic app tests mental arithmetic by asking the player to substitute a given value of x into a quadratic expression y = ax² + bx + c and compute y. All coefficients (a, b, c) and x are single-digit integers — difficulty controls the range within that single digit. After every answer, the full step-by-step substitution is shown.

## User Flow

1. Player enters the Quadratic app from the home menu
2. Three difficulty radio pills are shown: "Easy", "Medium", "Hard"
3. Player selects a difficulty (default: Easy)
4. Player clicks "Start Quiz"
5. Progress pill shows "Question 1/20"
6. The question is displayed in two parts:
   - Line 1: "x = -3" (the given value)
   - Line 2: "y = 7x² + 3x − 4" (the expression to evaluate)
7. Player types their answer in the input field (placeholder: "y = ?")
8. Player clicks "Submit" (or presses Enter)
9. Step-by-step feedback appears:
   ```
   Correct!
   y = 7(-3)² + 3(-3) − 4
   = 7(9) − 9 − 4
   = 63 − 9 − 4
   = 50
   ```
10. Button changes to "Next Question" (or "Finish Quiz" on question 20)
11. After question 20, final score screen with "Play Again" option

## Component: QuadraticApp

**File**: `client/src/App.jsx`

**Constants:**
- `TOTAL_QUADRATIC = 20` — fixed number of questions per quiz

**State variables:**
- `difficulty` (string) — 'easy', 'medium', or 'hard'
- `started` (boolean) — whether the quiz has begun
- `finished` (boolean) — whether all 20 questions are done
- `question` (object | null) — current question data from API `{ a, b, c, x, prompt, answer }`
- `answer` (string) — player's typed answer
- `score` (number) — cumulative correct answers
- `questionNumber` (number) — current question index (1-20)
- `feedback` (string) — feedback text with step-by-step reasoning (uses \n for line breaks)
- `loading` (boolean) — whether a question is being fetched
- `revealed` (boolean) — whether the answer has been revealed

**Behavior:**
- Difficulty selector is locked once the quiz starts
- `fetchQuestion(selectedDifficulty)` passes difficulty as a query parameter
- Question display splits into two styled spans: `.given` for x value, `.equation` for the expression
- Sign formatting in the display: uses ternary to show `+` or `−` with `Math.abs()` for the coefficient
- Step-by-step reasoning is computed entirely client-side after receiving the server's `correctAnswer`

## Difficulty Levels

| Level | Coefficient Range | x Range | Mental Difficulty |
|-------|------------------|---------|-------------------|
| Easy | -3 to 3 | -3 to 3 | Simple products, small sums |
| Medium | -6 to 6 | -6 to 6 | Moderate products, requires careful tracking |
| Hard | -9 to 9 | -9 to 9 | Large products (up to 729), challenging mental math |

**Important**: No coefficient or x value ever exceeds a single digit (magnitude 0-9). Difficulty comes from the size within that range.

**Server-side range function:**
```javascript
function quadraticRange(difficulty) {
  if (difficulty === 'easy') return { min: -3, max: 3 };
  if (difficulty === 'medium') return { min: -6, max: 6 };
  return { min: -9, max: 9 };
}
```

## Step-by-Step Feedback

The reasoning chain is computed client-side with this logic:

```javascript
const { a, b, c, x } = question
const xSq = x * x              // x squared
const termA = a * xSq           // a * x²
const termB = b * x             // b * x
const sign = (v) => v >= 0 ? `+ ${v}` : `− ${Math.abs(v)}`

// Line 1: Substitute x into expression
// Line 2: Compute x²
// Line 3: Multiply coefficients
// Line 4: Final sum
```

**Example** (a=7, b=3, c=-4, x=-3):
```
y = 7(-3)² + 3(-3) − 4
= 7(9) − 9 − 4
= 63 − 9 − 4
= 50
```

The feedback box uses `white-space: pre-line` CSS to render the `\n` characters as line breaks.

## API Endpoints

### GET /quadratic-api/question?difficulty=D

Generates a random quadratic substitution problem.

**Query parameters:**
- `difficulty` (string, optional) — 'easy', 'medium', or 'hard'. Defaults to 'hard'.

**Response:**
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

**Notes:**
- The `prompt` field is formatted server-side using `buildQuadraticPrompt()` with proper sign handling via `formatSignedTerm()`
- The `answer` is computed as `a * x * x + b * x + c`
- All values are integers

### POST /quadratic-api/check

Verifies the player's answer.

**Request body:**
```json
{
  "a": 7,
  "b": 3,
  "c": -4,
  "x": -3,
  "answer": 50
}
```

**Response:**
```json
{
  "correct": true,
  "correctAnswer": 50,
  "message": "Correct"
}
```

**Notes:**
- The server recomputes the answer from a, b, c, x (does not trust any client-sent answer)
- Comparison is strict numeric equality

## Question Display

The question is rendered in a structured layout rather than a single text line:

```jsx
<span className="given">x = {question.x}</span>
<span className="equation">
  y = {question.a}x² {question.b >= 0 ? '+' : '−'} {Math.abs(question.b)}x
  {question.c >= 0 ? '+' : '−'} {Math.abs(question.c)}
</span>
```

- `.given` — same font size and weight as the equation
- `.equation` — slightly larger with `font-weight: 600`

## Server-Side Prompt Formatting

The server formats the expression using two helper functions:

**`formatSignedTerm(value, variablePart, isFirst)`**:
- Handles sign display (+ or -) for each term
- First term shows its natural sign; subsequent terms show operator before the absolute value
- Handles zero values

**`buildQuadraticPrompt(a, b, c, x)`**:
- Combines all three terms into a readable expression
- Returns the full prompt string: "If x = {x}, find y for y = {expression}"
