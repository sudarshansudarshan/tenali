# Binomial Theorem — Formal Specification

## Overview
Binomial expansion quiz covering nCr evaluation, coefficient extraction from (1+x)^n and (a+bx)^n, and specific term finding.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Evaluate nCr | 7C3 → 35 |
| Medium | Coefficient of x^r in (1+x)^n | x^3 in (1+x)^8 → 56 |
| Hard | Coefficient of x^r in (a+bx)^n | x^2 in (2+3x)^5 → 720 |
| ExtraHard | Specific term in (1+x)^n | 4th term in (1+x)^9 → coefficient 84 |

## API
- `GET /binomial-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /binomial-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- Integer (e.g. `35`, `56`, `720`)

## Server Logic
- `nCr(n, r)` function using iterative multiplication

## Registration
allApps key: `binomial`, modeMap: `BinomialApp`, CUSTOM_PUZZLES: `Binomial Theorem`
