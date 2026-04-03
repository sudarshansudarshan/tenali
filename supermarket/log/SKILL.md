# Logarithms — Formal Specification

## Overview
Logarithms covers logarithmic notation, properties of logs (product, quotient, power rules), and solving exponential and logarithmic equations. Students convert between exponential and logarithmic form.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Evaluate log | log₂(8) = 3 |
| Medium | Laws of logs | log(a) + log(b) = log(ab), k·log(x) |
| Hard | Exponential equation | Solve 2^x = 16 (answer: x = 4) |
| ExtraHard | Logarithmic equation | Solve log₃(x) + log₃(2) = 2 |

## API
- GET `/log-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/log-api/check` with `{"answer": 3}` or `{"answer": 4.5}`

## Answer Format
Numerical to 2 decimal places.

## Registration
allApps key: `log`, modeMap: `Log`, CUSTOM_PUZZLES: `Logarithms`
