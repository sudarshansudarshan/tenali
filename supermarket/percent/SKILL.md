# Percentages — Formal Specification

## Overview
Percentages quiz covering basic percentage calculations, increase/decrease, reverse percentages, and compound interest. Algorithmic generation with clean numeric answers.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Find X% of N | 20% of 150 → 30 |
| Medium | Increase/decrease by X% | Increase 80 by 15% → 92 |
| Hard | Reverse percentage | After 20% increase, price is $60. Original? → $50 |
| ExtraHard | Compound interest | $1000 at 10% for 3 years → $1331 |

## API
- `GET /percent-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /percent-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- Number (e.g. "30", "92", "50", "1331")
- Dollar signs and commas stripped automatically
- Compound answers rounded to nearest whole or 2 decimal places

## Registration
allApps key: `percent`, modeMap: `PercentApp`, CUSTOM_PUZZLES: `Percentages`
