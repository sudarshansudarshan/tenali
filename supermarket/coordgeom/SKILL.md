# Coordinate Geometry — Formal Specification

## Overview
Coordinate geometry covers calculating distances, midpoints, and gradients between points in the Cartesian plane. Students work with straight lines, perpendicular bisectors, and properties of parallel and perpendicular lines.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Midpoint | Find midpoint of (2, 4) and (8, 10) (answer: (5, 7)) |
| Medium | Distance | Find distance between (0, 0) and (3, 4) (answer: 5.0) |
| Hard | Gradient | Find gradient of line through (1, 2) and (4, 8) (answer: 2.0) |
| ExtraHard | Perpendicular bisector | Find gradient of perpendicular bisector given two points |

## API
- GET `/coordgeom-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/coordgeom-api/check` with `{"answer": 5.0}` or `{"answer": "(5, 7)"}`

## Answer Format
Numerical to 1 decimal place, or coordinates as (x, y).

## Registration
allApps key: `coordgeom`, modeMap: `CoordGeom`, CUSTOM_PUZZLES: `Coordinate Geometry`
