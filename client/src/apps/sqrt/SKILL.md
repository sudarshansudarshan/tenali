# Square Root

A continuous drill for estimating square roots to the nearest integer.

## How it works

- The player is shown a number and must estimate its square root
- Both the floor and ceiling of the true square root are accepted as correct
- There is no fixed question limit — the drill continues until the player navigates away
- Difficulty increases progressively as the player advances through questions
- After each answer, the exact square root value is shown along with floor and ceiling values

## Step-by-step feedback example

For √47:

```
√47 = 6.86
⌊6.86⌋ = 6, ⌈6.86⌉ = 7
```

## Difficulty progression

| Questions | Number range |
|-----------|-------------|
| 1-10      | 2 to 50     |
| 11-20     | 51 to 150   |
| 21-35     | 151 to 350  |
| 36-60     | 351 to 700  |
| 61+       | 701 to 999  |

## API endpoints

- `GET /sqrt-api/question?step=N` — returns a number to find the square root of (difficulty based on step)
- `POST /sqrt-api/check` — accepts `{ q, answer }` and returns correctness, floor, ceiling, and rounded sqrt
