# Complex Numbers — Formal Specification

## Overview
Complex numbers quiz covering addition, multiplication, modulus, and squaring of complex numbers.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Add z₁ + z₂ | (3+2i) + (1−4i) → 4−2i |
| Medium | Multiply z₁ × z₂ | (2+3i)(1−i) → 5+i |
| Hard | Find |z| (modulus) | |3+4i| → 5 |
| ExtraHard | Find z² | (2+3i)² → −5+12i |

## API
- `GET /complex-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /complex-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- Modulus: plain number (e.g. `5`)
- Complex: `a,b` for a + bi (e.g. `4,-2`)

## Server Logic
- Uses Pythagorean triples for clean modulus answers
- `fmtComplex(re, im)` for display formatting

## Registration
allApps key: `complex`, modeMap: `ComplexApp`, CUSTOM_PUZZLES: `Complex Numbers`
