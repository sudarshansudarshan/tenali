# Speed, Distance, Time — Formal Specification

## Overview
Rate problems quiz covering the S=D/T formula, average speed for multi-leg journeys, and unit conversions.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Find distance (S×T) | 60 km/h for 3 hours → 180 km |
| Medium | Find time (D/S) | 240 km at 60 km/h → 4 hours |
| Hard | Average speed for 2-leg journey | Two legs with different speeds |
| ExtraHard | Convert m/s to km/h | 15 m/s → 54 km/h |

## API
- `GET /sdt-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /sdt-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- Number (e.g. `180`, `4`, `54`)
- Units stripped automatically

## Registration
allApps key: `sdt`, modeMap: `SDTApp`, CUSTOM_PUZZLES: `Speed, Distance, Time`
