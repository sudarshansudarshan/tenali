# Sequences & Series — Formal Specification

## Overview
Arithmetic and geometric sequences and series quiz. Four difficulty levels covering nth term and sum formulas for both types. Algorithmic generation with unlimited unique problems.

## Difficulty Levels
| Level | Type | Formula | Example |
|-------|------|---------|---------|
| Easy | Arithmetic nth term | a + (n-1)d | 3, 7, 11, 15, ... Find 10th term → 39 |
| Medium | Arithmetic sum | n/2 × (2a + (n-1)d) | 3, 7, 11, 15, ... Sum of first 10 → 210 |
| Hard | Geometric nth term | ar^(n-1) | 2, 6, 18, ... Find 5th term → 162 |
| ExtraHard | Geometric sum | a(r^n - 1)/(r - 1) | 2, 6, 18, ... Sum of first 5 → 242 |

## API
- `GET /sequences-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /sequences-api/check` — body includes question fields + `answer` string

## Answer Format
- Arithmetic: integer (e.g. "39", "210")
- Geometric: integer or fraction (e.g. "162", "3/4")

## Registration
allApps key: `sequences`, modeMap: `SequencesApp`, CUSTOM_PUZZLES: `Sequences`
