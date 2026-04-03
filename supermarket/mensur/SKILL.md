# Mensuration — Formal Specification

## Overview
Mensuration covers areas of 2D shapes (rectangle, triangle, parallelogram, circle) and volumes and surface areas of 3D solids (cylinder, cone, sphere). Students apply formulas and work with composite shapes.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Rectangle/triangle area | Area of rectangle 5 × 8 = 40 |
| Medium | Circle area & circumference | πr² and 2πr |
| Hard | 3D volume | Volume of cylinder or cone |
| ExtraHard | Surface area | Total surface area of cylinder or sphere |

## API
- GET `/mensur-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/mensur-api/check` with `{"answer": 40.25}`

## Answer Format
Numerical to 2 decimal places.

## Registration
allApps key: `mensur`, modeMap: `Mensur`, CUSTOM_PUZZLES: `Mensuration`
