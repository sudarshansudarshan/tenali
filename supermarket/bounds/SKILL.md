# Bounds — Formal Specification

## Overview
Upper and lower bounds quiz covering error intervals from rounding, and bounds of calculations.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Lower bound of rounded value (1 dp) | 4.3 rounded to 1 dp → lower bound 4.25 |
| Medium | Upper bound rounded to nearest 10 | 80 cm to nearest 10 → upper bound 85 |
| Hard | Upper bound of a + b (both 1 dp) | a=3.4, b=2.7 → upper bound 6.2 |
| ExtraHard | Upper bound of a ÷ b (both 1 dp) | a=5.3, b=2.1 → upper bound to 3 dp |

## API
- `GET /bounds-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /bounds-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- Number (e.g. `4.25`, `85`, `6.2`)
- Tolerance of 0.005 for comparison

## Registration
allApps key: `bounds`, modeMap: `BoundsApp`, CUSTOM_PUZZLES: `Bounds`
