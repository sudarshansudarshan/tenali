# Matrices — Formal Specification

## Overview
Matrices covers basic operations on 2×2 matrices: addition, scalar multiplication, determinant, and matrix multiplication. Students manipulate matrices using row and column notation and interpret determinants.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Matrix addition | Add two 2×2 matrices element-wise |
| Medium | Scalar multiplication | Multiply matrix by a scalar k |
| Hard | Determinant | Calculate det(M) = ad − bc |
| ExtraHard | Matrix multiplication | Multiply two 2×2 matrices |

## API
- GET `/matrix-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/matrix-api/check` with `{"answer": "[1,2;3,4]"}` or `{"answer": 5}`

## Answer Format
Matrix as "[a,b;c,d]" or numerical scalar.

## Registration
allApps key: `matrix`, modeMap: `Matrix`, CUSTOM_PUZZLES: `Matrices`
