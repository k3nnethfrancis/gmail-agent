# AGENTS.md — Orientation for Assistants

This short guide tells an agent where to look, what to read first, and the current priorities.

## Read This First
- docs/ACTIVE_ISSUES.md — Up‑to‑date, prioritized work list (short). Start here.
- docs/TEST_PLAN.md — The comprehensive test strategy and target coverage.
- docs/PROGRESS.md — What’s already done (high level), to avoid re‑doing work.
- docs/ENGINEERING.md — Standards for code, error handling, API patterns.
- docs/SYSTEM_ARCHITECTURE.md and docs/AI_ARCHITECTURE.md — Overall app/agent design.

## Working Directives
- Branching: create feature branches off `dev`. PR into `dev`, then merge dev→main.
- Lint/TS: Temporary build ignores are in `next.config.ts` while we clean debt. See `docs/ISSUES.md` follow‑up to re‑enable.
- UI Tokens: Use theme tokens only (no raw colors) and follow the new Courier theme.
- API Response: Prefer explicit HTTP status codes with clear `{ error }` on failure, `{ data }` or `{ success: true }` on success.

## Current Priorities (Fast Glance)
1. Test suite implementation (unit/integration/component/E2E) — see docs/TEST_PLAN.md.
2. Lint/TS cleanup and re‑enable strict checks — see docs/ISSUES.md follow‑up.
3. Consistency audit: DTO mapping, error contracts, fetch wrappers (add tests as contracts).

## Useful Paths
- UI: src/components/**, src/components/widgets/**
- API: src/app/api/**
- Data/logic: src/lib/**
- Store: src/store/**
- Utils: src/utils/**

## Quick Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Lint (scoped): `npx eslint src/components/ChatInterface.tsx`
- Commit workflow: feature → PR to `dev` → merge dev→main

Tip: When resuming work, skim ACTIVE_ISSUES.md then the top of PROGRESS.md to get context in 2–3 minutes.
