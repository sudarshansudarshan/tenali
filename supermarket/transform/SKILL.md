# Transformations — Formal Specification

## Overview
Transformations covers rigid and non-rigid transformations of 2D shapes: reflections, translations, rotations, and enlargements. Students identify transformation types and calculate image coordinates.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Reflection | Reflect (3, 2) in x-axis or y-axis |
| Medium | Translation | Translate point by vector (2, −3) |
| Hard | Rotation | Rotate 90°, 180°, or 270° about origin |
| ExtraHard | Enlargement | Enlarge from origin with scale factor k |

## API
- GET `/transform-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/transform-api/check` with `{"answer": "(3, -2)"}`

## Answer Format
Coordinates as (x, y) for transformed point.

## Registration
allApps key: `transform`, modeMap: `Transform`, CUSTOM_PUZZLES: `Transformations`
