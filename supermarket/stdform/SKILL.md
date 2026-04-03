# Standard Form — Formal Specification

## Overview
Scientific notation (standard form) quiz covering conversion, multiplication, division, and addition of numbers in standard form.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Convert number to standard form | 34000 → 3.4 × 10^4 |
| Medium | Multiply two standard form numbers | (2.5 × 10^3) × (3.0 × 10^2) |
| Hard | Divide two standard form numbers | (8.0 × 10^7) ÷ (2.5 × 10^3) |
| ExtraHard | Add two standard form numbers | (3.5 × 10^4) + (2.1 × 10^4) |

## API
- `GET /stdform-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /stdform-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- Standard form notation: `a × 10^n` (e.g. `3.4 × 10^4`)
- Normalized during comparison (× and * and x all accepted)

## Registration
allApps key: `stdform`, modeMap: `StdFormApp`, CUSTOM_PUZZLES: `Standard Form`
