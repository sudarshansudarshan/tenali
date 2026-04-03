# Bearings — Formal Specification

## Overview
Bearings covers three-figure bearing notation, compass directions, back bearings, and calculating bearings from coordinates. Students use trigonometry to find distances and directions.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Compass to bearing | North = 000°, East = 090° |
| Medium | Back bearing | If bearing is 045°, back bearing is 225° |
| Hard | Bearing from coordinates | Calculate bearing from point (x₁, y₁) to (x₂, y₂) |
| ExtraHard | Trigonometric bearing | Use trig to find distance component |

## API
- GET `/bearings-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/bearings-api/check` with `{"answer": "045"}` or `{"answer": 12.5}`

## Answer Format
Three-figure bearing (000–359) or distance to 1 decimal place.

## Registration
allApps key: `bearings`, modeMap: `Bearings`, CUSTOM_PUZZLES: `Bearings`
