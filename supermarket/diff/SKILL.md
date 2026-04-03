# Differentiation — Formal Specification

## Overview
Differentiation covers calculus derivatives: power rule, chain rule, and applications to optimization. Students find gradients at points, identify turning points, and determine maximum/minimum values.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Power rule | f(x) = x³, find f'(2) |
| Medium | Polynomial derivative | f(x) = 2x² + 3x + 1, find f'(x) at x = 1 |
| Hard | Turning point | Find x where f'(x) = 0 |
| ExtraHard | Min/max value | Find minimum or maximum value of f(x) |

## API
- GET `/diff-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/diff-api/check` with `{"answer": 12}` or `{"answer": 2.5}`

## Answer Format
Numerical to 1 decimal place.

## Registration
allApps key: `diff`, modeMap: `Diff`, CUSTOM_PUZZLES: `Differentiation`
