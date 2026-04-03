# HCF & LCM — Formal Specification

## Overview
Highest Common Factor and Lowest Common Multiple quiz covering pairs, triples, and word problems.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | HCF of two numbers | HCF(24, 36) → 12 |
| Medium | LCM of two numbers | LCM(8, 12) → 24 |
| Hard | LCM of three numbers | LCM(4, 6, 10) → 60 |
| ExtraHard | Word problem (bus intervals) | Buses every 12 and 18 min → next together in 36 min |

## API
- `GET /hcflcm-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /hcflcm-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- Integer (e.g. `12`, `24`, `60`)

## Server Logic
- Uses `gcd(a,b)` and `lcm(a,b) = |a*b|/gcd(a,b)`
- LCM of 3: `lcm(lcm(a,b), c)`

## Registration
allApps key: `hcflcm`, modeMap: `HcfLcmApp`, CUSTOM_PUZZLES: `HCF & LCM`
