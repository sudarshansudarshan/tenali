# Rounding — Formal Specification

## Overview
Rounding quiz covering decimal places, significant figures, truncation, and estimation by rounding.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Round to N decimal places | 3.4567 to 2 dp → 3.46 |
| Medium | Round to N significant figures | 4567 to 2 sf → 4600 |
| Hard | Truncate to N decimal places | 3.4567 truncated to 2 dp → 3.45 |
| ExtraHard | Estimate by rounding to 1 sf | 37 × 42 ≈ 40 × 40 = 1600 |

## API
- `GET /rounding-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /rounding-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- Number (e.g. `3.46`, `4600`, `1600`)

## Registration
allApps key: `rounding`, modeMap: `RoundingApp`, CUSTOM_PUZZLES: `Rounding`
