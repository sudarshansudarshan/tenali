# Pythagoras' Theorem — Formal Specification

## Overview
Standalone Pythagorean theorem quiz: find hypotenuse, find shorter side, word problems, 3D space diagonal. Class 7–10 level.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Find hypotenuse | Legs 3,4 → hyp = 5 |
| Medium | Find shorter side | Hyp 13, leg 5 → other leg = 12 |
| Hard | Word problem (ladder) | 15m ladder, 9m from wall → 12m high |
| ExtraHard | 3D space diagonal | Cuboid 3×4×12 → diagonal = 13 |

## API
- `GET /pythag-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /pythag-api/check`

## Answer Format
- Number (e.g. `13`)

## Server Logic
- Uses Pythagorean triples array for clean integer answers
- 3D uses nested triples: floor diagonal forms first triple, space diagonal forms second

## Registration
allApps key: `pythag`, modeMap: `PythagApp`, CUSTOM_PUZZLES: `Pythagoras' Theorem`
