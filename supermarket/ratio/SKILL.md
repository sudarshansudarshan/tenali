# Ratio & Proportion — Formal Specification

## Overview
Ratio and proportion quiz covering simplification, dividing amounts, direct and inverse proportion. Algorithmic generation with unlimited unique problems.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Simplify a ratio | 12:8 → 3:2 |
| Medium | Divide amount in ratio | Divide 120 in ratio 3:2 → 72, 48 |
| Hard | Direct proportion | 5 items cost $20, how much do 8 cost? → $32 |
| ExtraHard | Inverse proportion | 4 workers take 6 days, how long for 3? → 8 |

## API
- `GET /ratio-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /ratio-api/check` — body includes question fields + `answer` string

## Answer Format
- Simplify: "3:2" (colon-separated)
- Divide: "72, 48" or "72, 48, 36" (comma-separated)
- Direct: number (e.g. "32")
- Inverse: number or fraction (e.g. "8" or "8/3")

## Registration
allApps key: `ratio`, modeMap: `RatioApp`, CUSTOM_PUZZLES: `Ratio`
