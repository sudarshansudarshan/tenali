# Addition

A 20-question addition practice quiz with three difficulty levels based on the number of digits.

## Overview

The Addition app generates random addition problems. The player selects a difficulty (1-digit, 2-digit, or 3-digit numbers), then solves 20 problems in sequence. After each answer, the full working is shown (e.g., "47 + 83 = 130"). A final score is displayed at the end.

## User Flow

1. Player enters the Addition app from the home menu
2. Three difficulty radio pills are shown: "One digit", "Two digits", "Three digits"
3. Player selects a difficulty (default: One digit)
4. Player clicks "Start Quiz"
5. Progress pill shows "Question 1/20"
6. The addition problem is displayed (e.g., "47 + 83 = ?")
7. Player types their answer in the input field
8. Player clicks "Submit" (or presses Enter)
9. Feedback appears:
   - Correct: "Correct! 47 + 83 = 130" (green background)
   - Incorrect: "Incorrect. 47 + 83 = 130" (red background)
10. Button changes to "Next Question" (or "Finish Quiz" on question 20)
11. After question 20, final score screen: "Quiz complete. Final score: 15/20"
12. Player can click "Play Again" to restart with the same or different difficulty

## Component: AdditionApp

**File**: `client/src/App.jsx`

**Constants:**
- `TOTAL_ADDITION = 20` — fixed number of questions per quiz

**State variables:**
- `digits` (number) — selected difficulty level (1, 2, or 3)
- `started` (boolean) — whether the quiz has begun
- `finished` (boolean) — whether all 20 questions are done
- `question` (object | null) — current question data from API
- `answer` (string) — player's typed answer
- `score` (number) — cumulative correct answers
- `questionNumber` (number) — current question index (1-20)
- `feedback` (string) — feedback text to display
- `loading` (boolean) — whether a question is being fetched
- `revealed` (boolean) — whether the answer has been revealed

**Behavior:**
- Difficulty selector is locked once the quiz starts (`disabled={started && !finished}`)
- `fetchQuestion(selectedDigits)` fetches a new question with the given digit count
- `handleSubmitOrNext()` manages the submit → reveal → next → finish flow
- After question 20, sets `finished = true` and shows the final score screen
- Enter key triggers submit/next throughout

## Difficulty Levels

| Level | Label | Number Range | Example Problem |
|-------|-------|-------------|-----------------|
| 1 | One digit | 0 to 9 | 3 + 7 = ? |
| 2 | Two digits | 10 to 99 | 47 + 83 = ? |
| 3 | Three digits | 100 to 999 | 456 + 278 = ? |

**Server-side range function:**
```javascript
function digitRange(digits) {
  if (digits === 1) return { min: 0, max: 9 };
  if (digits === 2) return { min: 10, max: 99 };
  return { min: 100, max: 999 };
}
```

## API Endpoints

### GET /addition-api/question?digits=N

Generates a random addition problem.

**Query parameters:**
- `digits` (number, optional) — 1, 2, or 3. Defaults to 1. Invalid values fall back to 1.

**Response:**
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

**Notes:**
- Both `a` and `b` are generated within the same digit range
- The `answer` field is included in the response (used for server-side verification too)
- ID format: `{digits}-{timestamp}-{random}`

### POST /addition-api/check

Verifies the player's answer.

**Request body:**
```json
{
  "a": 47,
  "b": 83,
  "answer": 130
}
```

**Response:**
```json
{
  "correct": true,
  "correctAnswer": 130,
  "message": "Correct"
}
```

## Feedback Format

The feedback always shows the complete working:

- **Correct**: `Correct! 47 + 83 = 130`
- **Incorrect**: `Incorrect. 47 + 83 = 130`

The reasoning is computed client-side using the question's `a` and `b` values and the server's `correctAnswer`.

## Styling

- Difficulty selector uses `.radio-group` with `.radio-pill` buttons (`.active` for selected)
- Progress shown in `.progress-pill.center`
- Question displayed in `.question-box`
- Input uses `.answer-input` with `inputMode="numeric"`
- Feedback uses `.feedback.correct` or `.feedback.wrong`
