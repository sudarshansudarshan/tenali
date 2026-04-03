# Profit & Loss — Formal Specification

## Overview
Commercial arithmetic quiz covering profit, loss, profit percentage, discounts, and successive discounts.

## Difficulty Levels
| Level | Type | Example |
|-------|------|---------|
| Easy | Find profit (SP − CP) | Bought $100, sold $130 → profit $30 |
| Medium | Find profit percentage | CP=$200, SP=$250 → 25% |
| Hard | Discount: find selling price | Marked $500, 20% off → $400 |
| ExtraHard | Successive discounts | $1000, 20% then 10% off → $720 |

## API
- `GET /profitloss-api/question?difficulty=easy|medium|hard|extrahard`
- `POST /profitloss-api/check` — body includes question fields + `userAnswer` string

## Answer Format
- Number (e.g. `30`, `25`, `400`)
- Dollar signs and % symbols stripped automatically

## Registration
allApps key: `profitloss`, modeMap: `ProfitLossApp`, CUSTOM_PUZZLES: `Profit & Loss`
