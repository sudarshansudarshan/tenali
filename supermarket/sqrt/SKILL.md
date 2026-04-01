# Square Root

A continuous drill for estimating square roots to the nearest integer, with progressive difficulty.

## Overview

The Square Root app presents a number and asks the player to estimate its square root. Both the floor and ceiling of the true square root are accepted as correct answers. There is no fixed question limit — the drill continues indefinitely until the player navigates back to the home menu. Difficulty increases progressively as the player advances through questions, with numbers growing larger over time.

## User Flow

1. Player enters the Square Root app from the home menu
2. Welcome message: "The square-root drill will keep going until you stop."
3. Player clicks "Start Drill"
4. Progress pill shows "Question 1" (no total, since it's unlimited)
5. The problem is displayed (e.g., "√47 = ?")
6. Player types their estimate in the input field
7. Player clicks "Submit" (or presses Enter)
8. Step-by-step feedback appears:
   ```
   Correct!
   √47 = 6.86
   ⌊6.86⌋ = 6, ⌈6.86⌉ = 7
   ```
   Or if incorrect:
   ```
   Incorrect.
   √47 = 6.86
   ⌊6.86⌋ = 6, ⌈6.86⌉ = 7
   Acceptable answers: 6 or 7
   ```
9. Button shows "Next Question" — player continues indefinitely
10. Player clicks "← Home" to exit at any time

## Component: SqrtApp

**File**: `client/src/App.jsx`

**State variables:**
- `started` (boolean) — whether the drill has begun
- `question` (object | null) — current question data from API `{ q, step, prompt, floorAnswer, ceilAnswer, sqrtRounded }`
- `answer` (string) — player's typed answer
- `score` (number) — cumulative correct answers
- `questionNumber` (number) — current question count (1, 2, 3, ...)
- `feedback` (string) — feedback text with reasoning (uses \n for line breaks)
- `loading` (boolean) — whether a question is being fetched
- `revealed` (boolean) — whether the answer has been revealed

**Behavior:**
- No `finished` state — the drill never ends
- `fetchQuestion(step)` passes the current question number as the step parameter
- The step controls difficulty via server-side `bandForStep()` function
- Score and question number only go up; there's no reset without going back to home and re-entering

**Key difference from other quizzes**: No difficulty selector (difficulty is automatic), no fixed question count, no finish screen.

## Progressive Difficulty

Difficulty scales automatically based on the question number (step):

| Questions | Number Range | Example | Typical √ Range |
|-----------|-------------|---------|-----------------|
| 1–10 | 2 to 50 | √37 | 1.4 to 7.1 |
| 11–20 | 51 to 150 | √89 | 7.1 to 12.2 |
| 21–35 | 151 to 350 | √247 | 12.3 to 18.7 |
| 36–60 | 351 to 700 | √512 | 18.7 to 26.5 |
| 61+ | 701 to 999 | √843 | 26.5 to 31.6 |

**Server-side band function:**
```javascript
function bandForStep(step) {
  if (step <= 10) return { min: 2, max: 50 };
  if (step <= 20) return { min: 51, max: 150 };
  if (step <= 35) return { min: 151, max: 350 };
  if (step <= 60) return { min: 351, max: 700 };
  return { min: 701, max: 999 };
}
```

## Answer Acceptance

Both the floor and ceiling of the true square root are accepted:

- √47 = 6.856... → accepted answers: **6** or **7**
- √49 = 7.000 → accepted answers: **7** (floor and ceiling are the same)
- √2 = 1.414... → accepted answers: **1** or **2**

**Server-side validation:**
```javascript
const sqrt = Math.sqrt(Number(q));
const floorAnswer = Math.floor(sqrt);
const ceilAnswer = Math.ceil(sqrt);
const correct = numericAnswer === floorAnswer || numericAnswer === ceilAnswer;
```

## Step-by-Step Feedback

The reasoning is computed client-side using values returned by the server:

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

Uses floor (⌊⌋) and ceiling (⌈⌉) mathematical notation to teach the concepts.

## API Endpoints

### GET /sqrt-api/question?step=N

Generates a random square root problem with difficulty based on the step.

**Query parameters:**
- `step` (number, optional) — the question number, used to determine difficulty band. Defaults to 1. Minimum is 1.

**Response:**
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
- `q` is the number to find the square root of
- `sqrtRounded` is the true square root rounded to 2 decimal places (string)
- `floorAnswer` and `ceilAnswer` are both returned for the client to use in feedback
- ID format: `{step}-{timestamp}-{random}`

### POST /sqrt-api/check

Verifies the player's answer.

**Request body:**
```json
{
  "q": 47,
  "answer": 7
}
```

**Response:**
```json
{
  "correct": true,
  "floorAnswer": 6,
  "ceilAnswer": 7,
  "sqrtRounded": "6.86",
  "message": "Correct"
}
```

**Notes:**
- The server recomputes sqrt, floor, and ceiling from `q` (does not trust client values)
- Answer is accepted if it matches either floor or ceiling
- All answer values returned regardless of correctness (for feedback display)
