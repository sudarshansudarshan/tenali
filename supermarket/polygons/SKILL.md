# Polygons — Formal Specification

## Overview
Polygon angle properties: interior angle sum, individual angles of regular polygons, exterior angles, number of diagonals. Class 8–9 level.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Interior angle sum = (n−2)×180 | Hexagon → 720° |
| Medium | Each interior angle of regular polygon | Regular octagon → 135° |
| Hard | Find number of sides from exterior angle | Ext = 36° → 10 sides |
| ExtraHard | Number of diagonals = n(n−3)/2 | Heptagon → 14 diagonals |

## API
- `GET /polygons-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /polygons-api/check`

## Answer Format
- Number (e.g. `720`, `135`, `10`, `14`)

## Registration
allApps key: `polygons`, modeMap: `PolygonsApp`, CUSTOM_PUZZLES: `Polygons`
