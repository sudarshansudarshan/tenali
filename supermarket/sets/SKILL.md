# Sets — Formal Specification

## Overview
Sets and Venn diagrams quiz covering the IGCSE syllabus. Four difficulty levels from listing elements of set operations to solving 3-set Venn diagram problems using inclusion-exclusion.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | List elements of A∪B, A∩B, A−B, A' | U={1..12}, A={2,4,6}, B={3,4,5}. Find A∩B → {4} |
| Medium | Cardinality (inclusion-exclusion) | n(A)=15, n(B)=20, n(A∩B)=8. Find n(A∪B) → 27 |
| Hard | 2-set Venn diagram regions | Group of 50: n(A only)=12, n(A∩B)=8, n(B only)=15. Neither? → 15 |
| ExtraHard | 3-set Venn diagram | Full inclusion-exclusion with 3 sets, find a specific region |

## API
- `GET /sets-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /sets-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- List questions: `{1, 3, 5}` or `1, 3, 5` or `empty` for empty set
- Cardinality/Venn: plain number (e.g. `27`)

## Server Logic
- `randomSubset(universe, k)`: generates k random elements from universe
- `setUnion`, `setIntersect`, `setDiff`: standard set operations on sorted arrays
- Easy: generates U (10-15 elements), A and B (3-6 elements each), picks random operation
- Medium: generates n(A), n(B), n(A∩B), asks for one of: n(A∪B), n(A∩B), or n(A only)
- Hard: generates all 4 regions of 2-set Venn, hides one, asks student to find it
- ExtraHard: generates all 8 regions of 3-set Venn (7 regions + neither), uses inclusion-exclusion

## Registration
allApps key: `sets`, modeMap: `SetsApp`, CUSTOM_PUZZLES: `Sets`
