# Probability — Formal Specification

## Overview
Probability covers single events, independent and dependent events, and the addition and multiplication rules. Students calculate probabilities using tree diagrams, sample spaces, and conditional probability with and without replacement.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Single event | P(red marble from bag) = 3/10 |
| Medium | Independent events | P(A and B) = P(A) × P(B) |
| Hard | OR rule | P(A or B) using inclusion-exclusion |
| ExtraHard | Without replacement | Tree diagram with dependent events |

## API
- GET `/prob-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/prob-api/check` with `{"answer": "3/10"}` or `{"answer": 0.3}`

## Answer Format
Fraction as "a/b" or decimal to 2 places.

## Registration
allApps key: `prob`, modeMap: `Prob`, CUSTOM_PUZZLES: `Probability`
