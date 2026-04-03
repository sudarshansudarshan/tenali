# Integration — Formal Specification

## Overview
Integration quiz covering reverse differentiation and definite integrals. Four difficulty levels from basic power rule to area under curve problems.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Integrate ax^n — find coefficient | ∫3x² dx → coefficient of x³ is 1 |
| Medium | Definite integral of polynomial | ∫₀^2 (2x²+3x+1) dx → 14/3 |
| Hard | Substitution-style (ax+b)^n | ∫₀^1 (2x+1)³ dx |
| ExtraHard | Area between curve and x-axis | Area under y=x²−4x between roots |

## API
- `GET /integ-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /integ-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- Number or fraction (e.g. `3/4`, `27`)
- Fractions compared both symbolically and numerically

## Registration
allApps key: `integ`, modeMap: `IntegApp`, CUSTOM_PUZZLES: `Integration`
