# Variation — Formal Specification

## Overview
Direct and inverse variation quiz. Given initial conditions, find the constant of proportionality and calculate unknowns.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Direct (y ∝ x) | y=12 when x=3, find y when x=5 → 20 |
| Medium | Inverse (y ∝ 1/x) | y=6 when x=4, find y when x=3 → 8 |
| Hard | Direct square (y ∝ x²) | y=20 when x=2, find y when x=3 → 45 |
| ExtraHard | Inverse root (y ∝ 1/√x) | y=6 when x=4, find y when x=9 → 4 |

## API
- `GET /variation-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /variation-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- Number (e.g. `20`, `45`)

## Registration
allApps key: `variation`, modeMap: `VariationApp`, CUSTOM_PUZZLES: `Variation`
