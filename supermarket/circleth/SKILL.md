# Circle Theorems — Formal Specification

## Overview
Circle theorems covers fundamental properties of circles and angles: angles in semicircles, angles at the centre and circumference, cyclic quadrilaterals, and tangent properties. Students prove and apply these theorems.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Angle in semicircle | Angle ACB in semicircle = 90° |
| Medium | Angle at centre rule | Angle at centre = 2 × angle at circumference |
| Hard | Cyclic quadrilateral | Opposite angles in cyclic quad = 180° |
| ExtraHard | Tangent/alternate segment | Angle between tangent and chord |

## API
- GET `/circle-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/circle-api/check` with `{"answer": 90}` or `{"answer": 35.5}`

## Answer Format
Numerical (angle in degrees) to 1 decimal place.

## Registration
allApps key: `circleth`, modeMap: `CircleTh`, CUSTOM_PUZZLES: `Circle Theorems`
