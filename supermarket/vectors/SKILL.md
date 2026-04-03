# Vectors — Formal Specification

## Overview
Vectors covers operations on 2D column vectors: addition, scalar multiplication, magnitude, and position vectors. Students work with vectors as displacements and use Pythagoras to find magnitudes.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Vector addition | Add two column vectors |
| Medium | Scalar multiplication | Multiply vector by scalar |
| Hard | Magnitude | Find |v| using Pythagorean triples |
| ExtraHard | Position vector | Vector between two points |

## API
- GET `/vectors-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/vectors-api/check` with `{"answer": "(3, 4)"}` or `{"answer": 5.0}`

## Answer Format
Vector as "(x, y)" or magnitude as number to 1 decimal place.

## Registration
allApps key: `vectors`, modeMap: `Vectors`, CUSTOM_PUZZLES: `Vectors`
