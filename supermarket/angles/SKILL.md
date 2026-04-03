# Angles — Formal Specification

## Overview
Fundamental angle facts: angles on a straight line, at a point, vertically opposite, and parallel line angle relationships. Class 5–7 level.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Angles on a straight line (sum 180°) | 115° + x° = 180° → x = 65 |
| Medium | Angles at a point (sum 360°) | Four angles, find the missing one |
| Hard | Vertically opposite / adjacent | Two lines cross, one angle given |
| ExtraHard | Parallel lines (alternate, corresponding, co-interior) | Transversal through parallel lines |

## API
- `GET /angles-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /angles-api/check`

## Answer Format
- Number in degrees (e.g. `65`). Degree symbol stripped automatically.

## Registration
allApps key: `angles`, modeMap: `AnglesApp`, CUSTOM_PUZZLES: `Angles`
