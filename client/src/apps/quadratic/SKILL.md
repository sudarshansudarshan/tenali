# Quadratic

A 20-question quiz on evaluating quadratic expressions by substitution with three difficulty levels.

## How it works

- The player selects a difficulty level (Easy, Medium, or Hard) before starting
- They are given a quadratic expression y = ax² + bx + c and a value of x
- They must compute y by substituting x into the expression
- All coefficients and x are single-digit integers; difficulty controls the range
- After each answer, the full step-by-step substitution is shown as reasoning
- Final score displayed after all 20 questions

## Difficulty levels

- **Easy**: coefficients and x range from -3 to 3
- **Medium**: coefficients and x range from -6 to 6
- **Hard**: coefficients and x range from -9 to 9

## Step-by-step feedback example

For y = 7x² + 3x − 4, x = -3:

```
y = 7(-3)² + 3(-3) − 4
= 7(9) − 9 − 4
= 63 − 9 − 4
= 50
```

## API endpoints

- `GET /quadratic-api/question?difficulty=easy|medium|hard` — returns a, b, c, x, formatted prompt, and answer
- `POST /quadratic-api/check` — accepts `{ a, b, c, x, answer }` and returns correctness + correct answer
