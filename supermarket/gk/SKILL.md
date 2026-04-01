# General Knowledge (Chitragupta)

A multiple-choice general knowledge quiz that draws from a curated bank of 991 questions across various genres.

## Overview

The GK app presents one random question at a time with four answer options (A, B, C, D). The player selects an option and submits. Feedback is shown immediately, always revealing the correct answer with its full text. There is no fixed question limit — the player can keep going indefinitely. Score accumulates across the session.

## User Flow

1. Player enters the GK app from the home menu
2. A random question loads automatically (no start button needed)
3. The question text is displayed in the question box
4. Four option cards appear below (A, B, C, D) — each is a clickable label
5. Player clicks an option to select it (highlighted with amber accent)
6. Player clicks "Submit" (or presses Enter)
7. Feedback appears:
   - Correct: "Correct! The answer is B) Photosynthesis" (green background)
   - Incorrect: "Incorrect. The correct answer is B) Photosynthesis" (red background)
8. Button changes to "Next Question"
9. Player clicks "Next Question" (or presses Enter) to load a new question
10. Repeat from step 3

## Component: GKApp

**File**: `client/src/App.jsx`

**State variables:**
- `question` (object | null) — current question data from API
- `selected` (string) — currently selected option letter ('A', 'B', 'C', 'D', or '')
- `feedback` (string) — feedback text to display
- `isCorrect` (boolean | null) — whether the last answer was correct
- `loading` (boolean) — whether a question is being fetched
- `score` (number) — cumulative score for this session
- `revealed` (boolean) — whether the answer has been revealed

**Behavior:**
- On mount, `loadQuestion()` is called via `useEffect`
- `handleSubmitOrNext()` handles both submit and next actions based on `revealed` state
- Options are disabled after submission (`revealed === true`)
- Global `keydown` listener triggers `handleSubmitOrNext()` on Enter key

## API Endpoints

### GET /gk-api/question

Returns a random question from the bank.

**Response:**
```json
{
  "id": 42,
  "question": "What is the chemical symbol for gold?",
  "options": ["Ag", "Au", "Fe", "Cu"],
  "genre": "science"
}
```

**Notes:**
- Questions are loaded from JSON files in `chitragupta/questions/` at server startup
- Selection is random (`Math.random()` index into the array)
- Returns 500 if no questions are loaded

### POST /gk-api/check

Verifies the player's answer.

**Request body:**
```json
{
  "id": 42,
  "answerOption": "B"
}
```

**Response:**
```json
{
  "correct": true,
  "correctAnswer": "B",
  "correctAnswerText": "Au",
  "message": "Correct! 🎉"
}
```

**Notes:**
- Comparison is case-insensitive (both sides converted to uppercase)
- Returns 404 if question ID is not found
- `correctAnswer` is the option letter, `correctAnswerText` is the full text

## Data Source

Questions are stored as individual JSON files in `/chitragupta/questions/`, numbered `0001.json` through `0991.json`.

**Question file format:**
```json
{
  "id": 1,
  "question": "What is the largest planet in our solar system?",
  "options": ["Mars", "Jupiter", "Saturn", "Neptune"],
  "answerOption": "B",
  "answerText": "Jupiter",
  "genre": "science"
}
```

**Fields:**
- `id` (number) — unique identifier
- `question` (string) — the question text
- `options` (string[]) — array of exactly 4 options, corresponding to A, B, C, D
- `answerOption` (string) — the correct option letter
- `answerText` (string) — the text of the correct answer
- `genre` (string) — category of the question (e.g., "science", "history", "geography", "mixed")

## Feedback Format

The feedback always reveals the correct answer regardless of whether the player was right or wrong:

- **Correct**: `Correct! The answer is B) Jupiter`
- **Incorrect**: `Incorrect. The correct answer is B) Jupiter`

## Styling

- Options use `.option-card` class with `.selected` modifier for the chosen option
- Feedback uses `.feedback.correct` (green) or `.feedback.wrong` (red)
- Score displayed in a `.score-pill` in the top-right corner
- Question text in `.question-box` (lighter weight than math quizzes)
