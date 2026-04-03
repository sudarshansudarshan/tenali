# Statistics — Formal Specification

## Overview
Statistics covers measures of central tendency and spread: mean, median, mode, and range. Students calculate statistics from raw data lists and from frequency tables, and compare data sets using these measures.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Mean | Mean of [2, 3, 4, 5, 6] = 4 |
| Medium | Median | Median of [1, 3, 5, 7, 9] = 5 |
| Hard | Mode or range | Find mode or range of a data set |
| ExtraHard | Frequency table | Calculate mean from frequency distribution |

## API
- GET `/stats-api/question?difficulty=easy|medium|hard|extrahard`
- POST `/stats-api/check` with `{"answer": 4}`

## Answer Format
Numerical value (integer or 1 decimal place).

## Registration
allApps key: `stats`, modeMap: `Stats`, CUSTOM_PUZZLES: `Statistics`
