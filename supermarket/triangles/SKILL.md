# Triangles — Formal Specification

## Overview
Triangle properties: angle sum (180°), isosceles/equilateral properties, exterior angle theorem. Class 6–8 level.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Angle sum property | 50° + 70° + x° = 180° → x = 60 |
| Medium | Isosceles triangle | Apex 40° → each base angle = 70° |
| Hard | Exterior angle theorem | Remote interior 35° + 55° → exterior = 90° |
| ExtraHard | Multi-step with equilateral | Equilateral sharing side, find angle |

## API
- `GET /triangles-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /triangles-api/check`

## Answer Format
- Number in degrees (e.g. `70`)

## Registration
allApps key: `triangles`, modeMap: `TrianglesApp`, CUSTOM_PUZZLES: `Triangles`
