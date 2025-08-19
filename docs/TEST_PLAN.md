# TEST_PLAN.md — Comprehensive Test Strategy

## Goals
- Codify design decisions via tests (contracts) while improving confidence.
- Cover critical paths: data flows, API responses, UI states, and agent workflows.

## Stack
- Unit/Integration: Jest + ts-jest + React Testing Library + MSW
- E2E: Playwright (headed in dev, CI in headless, traces on failure)

## Coverage Targets
- Libraries/services: ≥ 85% lines/branches
- Components: ≥ 80%
- Critical flows (E2E): happy paths and one failure path each

## Conventions (Contracts)
- API responses: explicit HTTP status; body `{ error }` on failure, `{ data }` or `{ success: true }` on success.
- DTO mapping: centralized; server returns camelCase only.
- UI loading: skeletons first, then content; errors surface via `ErrorDisplay`.
- Tokens: only theme tokens; no raw color literals in components.

## Test Suites

### 1) Unit — Libraries and Utils
- `src/lib/emailClassifier.ts`: rule evaluation, training example application, confidence ranges
- `src/lib/emailSync.ts`: label parsing, unread mapping, thread normalization
- `src/utils/emailFormatters.ts`: date/sender formatting edge cases
- `src/store/chatStore.ts`: state transitions (append, clear, loading)

### 2) Integration — API Routes (MSW/node mocks)
- `/api/emails`: list, paging, error shape; mapping applied
- `/api/tags`: stats inclusion, empty states
- `/api/classify` + `/api/classify/status`: background classification trigger and status
- `/api/calendar/events`: auth required, query range, mapping to DTO
- `/api/training-examples`: no data, some data, error flow

### 3) Component — React Testing Library
- `InboxView`: skeleton → data; category filter; bulk toolbar; tag editing popover; tooltip visible
- `EmailList`: unread emphasis, pagination controls, selection and clear
- `CategorySidebar`: Show more/less behavior; sticky header
- `TrainingExamplesWidget`: contrast; header controls; empty state
- `CalendarWidget`: peek content (today count, upcoming list); expanded week nav
- `ChatInterface`: floating composer, timestamp gutter, “Thinking…” indicator

### 4) E2E — Playwright
- Auth happy‑path (mock OAuth/cookies); initial inbox loading
- Run classification, verify category counts update
- Sidebar Show more, select category, verify list filtered
- Chat: ask a question, see agent response stubbed; ensure composer works
- Calendar: open widget, verify peek and expanded data

## CI
- Scripts: `test`, `test:coverage`, `e2e`
- Artifacts: Playwright traces on failure; coverage uploaded

## Roadmap
1. Add tooling and base configs
2. Implement unit tests for utils/libs
3. Add API integration tests
4. Add component tests for Inbox and Widgets
5. Add E2E happy paths
6. Raise coverage gates; remove temporary lint/TS build ignores
