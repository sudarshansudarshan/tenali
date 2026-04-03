# Congruence — Formal Specification

## Overview
Congruent triangles: identify congruence conditions (SSS, SAS, ASA, RHS), find missing sides and angles. Class 7–9 level.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Find missing side from congruent pair | △ABC ≅ △PQR, PQ=7 → AB=7 |
| Medium | Find missing angle from congruent pair | Angle P = 55° → Angle A = 55° |
| Hard | Identify congruence condition | Given info → SSS/SAS/ASA/RHS |
| ExtraHard | Find side in a figure using congruence | Shared-side figure |

## API
- `GET /congruence-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /congruence-api/check`

## Answer Format
- Number (sides/angles) or text (SSS, SAS, ASA, RHS). Case-insensitive.

## Registration
allApps key: `congruence`, modeMap: `CongruenceApp`, CUSTOM_PUZZLES: `Congruence`
