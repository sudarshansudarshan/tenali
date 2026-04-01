# General Knowledge (Chitragupta)

A multiple-choice quiz app that draws from a bank of ~991 curated general knowledge questions.

## How it works

- A random question is fetched from the server on each round
- The player selects one of four options (A, B, C, D)
- After submission, the correct answer is always shown with its full text
- Score accumulates across the session with no fixed end — play as many rounds as you like
- Press Enter to submit or advance to the next question

## Feedback example

Correct: "Correct! The answer is B) Photosynthesis"
Incorrect: "Incorrect. The correct answer is B) Photosynthesis"

## API endpoints

- `GET /gk-api/question` — returns a random question with id, text, options, and genre
- `POST /gk-api/check` — accepts `{ id, answerOption }` and returns correctness + correct answer

## Data source

Questions are stored as individual JSON files in `/chitragupta/questions/` (loaded by the server at startup). Each file contains: id, question, options array, answerOption, answerText, and genre.
