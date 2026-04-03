# Number Bases — Formal Specification

## Overview
Number bases covers conversion between decimal, binary, and hexadecimal. Students understand place value in different bases and perform arithmetic operations in non-decimal bases.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Decimal to binary | 10₁₀ = 1010₂ |
| Medium | Binary to decimal | 1101₂ = 13₁₀ |
| Hard | Decimal to hex | 255₁₀ = FF₁₆ |
| ExtraHard | Binary addition or hex to binary | 101₂ + 11₂ or FF₁₆ to binary |

## API
- GET `/bases-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/bases-api/check` with `{"answer": "1010"}` or `{"answer": "FF"}` or `{"answer": 13}`

## Answer Format
String (binary with ₂ or hex with ₁₆) or decimal number.

## Registration
allApps key: `bases`, modeMap: `Bases`, CUSTOM_PUZZLES: `Number Bases`
