# PROGRESS.md — Courier UI and Architecture Progress

This document tracks high‑level progress and completed milestones to help new contributors ramp quickly.

## Recently Completed
- Courier UI redesign (Quiet Light theme, themed scrollbars, dark skeletons)
- Chat floating composer and improved streaming display
- Inbox: sidebar “Show more”, tooltip help, min‑height/scroll containment
- Widgets: contrast fixes; Training Examples header actions simplified
- Lint fixes in touched UI; follow‑up plan documented

## In Flight
- Test suite implementation (see TEST_PLAN.md)
- Lint/TS re‑enable after cleanup (see ISSUES.md)

## Notes
- Use design tokens in UI; avoid raw color literals
- Prefer typed DTOs and a single mapping layer for API responses
