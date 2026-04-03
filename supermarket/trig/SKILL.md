# Trigonometry — Formal Specification

## Overview
Trigonometry covers right-angled triangles, sine/cosine/tangent ratios, and the sine and cosine rules for general triangles. Students solve for missing sides and angles using Pythagorean triples, SOH-CAH-TOA, and the extended laws of sines and cosines.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Pythagoras | Find hypotenuse given legs 3 and 4 (answer: 5) |
| Medium | SOH-CAH-TOA | Find angle given opposite=5, hypotenuse=10 (answer: 30°) |
| Hard | Sine rule | Find side given one side and two angles |
| ExtraHard | Cosine rule & area | Find side or area = ½ab·sinC given SAS |

## API
- GET `/trig-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/trig-api/check` with `{"answer": 5.2}`

## Answer Format
Numerical: degrees (0–360) or lengths to 1 decimal place.

## Registration
allApps key: `trig`, modeMap: `Trig`, CUSTOM_PUZZLES: `Trigonometry`
