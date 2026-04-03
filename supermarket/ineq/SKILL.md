# Inequalities — Formal Specification

## Overview
Inequalities covers solving linear and quadratic inequalities, representing solutions on a number line, and counting integers within given ranges. Students manipulate inequalities with reversing rules and solve compound double inequalities.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Linear inequality | Solve 2x + 3 > 7 (answer: x > 2) |
| Medium | Double inequality | List integers where 1 < x ≤ 5 (answer: 2, 3, 4, 5) |
| Hard | Quadratic inequality | Solve x² − 3x + 2 > 0 |
| ExtraHard | Compound inequality | Count integers satisfying −2 < 2x + 1 ≤ 5 |

## API
- GET `/ineq-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/ineq-api/check` with `{"answer": "x > 2"}` or `{"answer": [2, 3, 4, 5]}`

## Answer Format
String: inequality notation ("x > 3", "x ≤ −1") or array of integers.

## Registration
allApps key: `ineq`, modeMap: `Ineq`, CUSTOM_PUZZLES: `Inequalities`
