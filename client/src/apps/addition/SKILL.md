# Addition

A timed 20-question addition practice quiz with three difficulty levels.

## How it works

- The player chooses a difficulty level: 1-digit, 2-digit, or 3-digit numbers
- 20 addition problems are generated dynamically (random numbers within the selected range)
- After each answer, the full working is shown (e.g., "47 + 83 = 130")
- At the end of 20 questions, the final score is displayed
- Press Enter to submit or advance to the next question

## Difficulty levels

- **1-digit**: numbers from 0 to 9
- **2-digit**: numbers from 10 to 99
- **3-digit**: numbers from 100 to 999

## API endpoints

- `GET /addition-api/question?digits=N` — returns two random numbers and the prompt (N = 1, 2, or 3)
- `POST /addition-api/check` — accepts `{ a, b, answer }` and returns correctness + correct answer
