# Similarity — Formal Specification

## Overview
Similar figures: find missing sides via scale factor, area ratio = k², volume ratio = k³. Class 9–10 CBSE level.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Find missing side (integer scale factor) | k=3, side 4 → 12 |
| Medium | Scale factor with division | Sides 6 and 18 (k=3), find other side |
| Hard | Area ratio = k² | k=1:4, area 8 → 128 |
| ExtraHard | Volume ratio = k³ | k=1:3, vol 10 → 270 |

## API
- `GET /similarity-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /similarity-api/check`

## Answer Format
- Number (e.g. `12`, `128`, `270`)

## Registration
allApps key: `similarity`, modeMap: `SimilarityApp`, CUSTOM_PUZZLES: `Similarity`
