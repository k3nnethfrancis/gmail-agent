## Design Patterns and Code Quality Guide

This document defines practical patterns and conventions for building and maintaining our Calendar + Gmail assistant in Next.js. The goals are to:

- Ensure strong type safety and avoid `any`
- Keep module boundaries clean and testable
- Make LLM tool-calling robust, predictable, and easy to extend
- Standardize error handling, logging, and request validation

### Directory and Module Boundaries

- **`src/app/api/*`**: Route handlers only. No Google API calls or business logic inline.
  - Validate input, orchestrate use-cases, compose tools, and return HTTP responses.
- **`src/tools/*`**: Tool adapters for external services (Google Calendar/Gmail).
  - One file per service; no HTTP/Next.js concerns here.
- **`src/lib/*`**: Cross-cutting infra (auth clients, env validation, logging, telemetry).
- **`src/types/*`**: Shared types/interfaces used across modules (LLM messages, tool schemas, domain models).
- **`src/utils/*`**: Small, pure helpers with no side effects.

Keep files focused. If a file grows beyond ~300 lines or has multiple responsibilities, split it.

## Type Safety and Function Signatures

### Never use `any`

- Prefer concrete types, discriminated unions, or generics. In catch blocks, use `unknown` and narrow.

```ts
try {
  // ...
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  // handle
}
```

### Options Object Pattern (fixes default-param-last)

- Do not place defaulted params before optional tail params. Use an options object with defaults.

```ts
type CreateEventOptions = { calendarId?: string; refreshToken?: string };

export async function createEvent(
  accessToken: string,
  eventData: CalendarEvent,
  options: CreateEventOptions = {}
) {
  const { calendarId = 'primary', refreshToken } = options;
  // ...
}
```

### Input/Output Contracts

- Define explicit input and output interfaces for each tool and handler. Avoid returning raw SDK responses directly.

```ts
export interface ListEventsResult {
  success: true;
  events: CalendarEvent[];
  nextPageToken?: string;
}

export interface FailureResult {
  success: false;
  error: string;
}

export type ToolResult<TSuccess> = TSuccess | FailureResult;
```

## Request Validation in Route Handlers

- Validate request bodies with a schema (e.g., `zod`) before using them.

```ts
import { z } from 'zod';

const ChatBodySchema = z.object({
  message: z.string().min(1),
  conversation: z
    .array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string() }))
    .optional(),
});

const body = ChatBodySchema.parse(await request.json());
```

- Never trust client-provided arrays and union types without validation.

## Tool Adapter Pattern

- Each external capability (Calendar/Gmail) is exposed via a thin, typed adapter. Characteristics:
  - Pure, side-effect-limited functions: accept tokens, options; return typed results
  - No Next.js or HTTP specifics
  - Encapsulate SDK client creation
  - Handle pagination consistently

```ts
export async function listThreads(
  accessToken: string,
  options: ListThreadsOptions = {},
  refreshToken?: string
): Promise<ToolResult<ListThreadsResult>> {
  try {
    // ... create client, call SDK
    return { success: true, threads, nextPageToken };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list threads';
    return { success: false, error: message };
  }
}
```

## Tool Registry Pattern (LLM tool-calls without giant switch)

- Replace large `switch` blocks in routes with a typed registry mapping tool names to handlers.

```ts
type ToolInvoke = (args: unknown, ctx: { accessToken: string; refreshToken?: string }) => Promise<unknown>;

const toolRegistry: Record<string, ToolInvoke> = {
  list_events: async (input, { accessToken, refreshToken }) => {
    const { options = {} } = (input as { options?: object }) ?? {};
    return calendarTools.listEvents(accessToken, options as ListEventsOptions, refreshToken);
  },
  // add other tools here
};

async function invokeTool(name: string, input: unknown, ctx: { accessToken: string; refreshToken?: string }) {
  const tool = toolRegistry[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool(input, ctx);
}
```

## LLM Integration Guidelines (Anthropic)

### Message Composition

- Construct `system` content with current date/time and capability hints.
- Keep conversation history concise; consider truncation strategies.

### Tool Schemas

- Define minimal, stable JSON schemas for each tool. Prefer small, composable input objects over many top-level fields.
- Validate/guard inputs again on the server before calling adapters.

### Content Typing

- Define discriminated unions for content blocks to avoid `any`.

```ts
type TextBlock = { type: 'text'; text: string };
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: unknown };
type OtherBlock = { type: string; [k: string]: unknown };
type ContentBlock = TextBlock | ToolUseBlock | OtherBlock;

const content = response.content as ContentBlock[];
```

### Tool Results Roundtrip

- When sending tool results back, wrap them with the original `tool_use_id` and keep payloads small (summaries, not raw pages of items).

## Error Handling and Result Envelope

- Use a consistent envelope for tool adapters: `success: boolean` with either data or an error string.
- In route handlers, map adapter failures to appropriate HTTP status codes (4xx for validation/auth, 5xx for upstream failures).
- Avoid leaking sensitive upstream messages to clients; replace with friendly errors and log details internally.

## Logging and Observability

- Use structured logs; never log full tokens or PII. If needed, log stable hashes or redacted prefixes only in non-prod.

```ts
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  console.log('Auth', { hasAccessToken: Boolean(tokens.accessToken) });
}
```

- Include a request `timestamp` and correlation ID for multi-step flows.
- Prefer `console.warn/error` for exceptional paths; keep info logs terse.

## Auth and Secrets

- Read tokens from `cookies()` in server routes; do not accept tokens from the client body.
- Never echo tokens back to the client or logs.
- Encapsulate OAuth client creation in `src/lib/auth.ts` and type it with `OAuth2Client`.

## Environment Configuration

- Validate required env vars at boot with a schema.

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
});

export const ENV = EnvSchema.parse(process.env);
```

## Pagination and Large Results

- Calendar/Gmail list APIs can return many items. Adapters should expose `nextPageToken` and accept `maxResults/pageToken`.
- Route handlers should summarize results for LLM consumption; avoid returning entire message bodies.

## Testing and Dependency Injection

- Make adapters accept already-constructed clients optionally for tests.

```ts
export function createCalendarAdapter(calendar = google.calendar({ version: 'v3', auth: createAuthenticatedClient(tokens) })) {
  return {
    async listEvents(/* ... */) { /* ... */ },
  };
}
```

- Unit-test pure transforms and classification logic without network calls.

## Performance and Reliability

- Add reasonable timeouts where supported by SDKs, and handle retries judiciously (avoid indefinite retries).
- Fail fast on missing auth; do not attempt calls without tokens.
- Consider rate limit handling/backoff where the Google SDK surfaces it.

## Code Style and Linting

- Follow ESLint `next/core-web-vitals` and TypeScript rules; fix:
  - Unused variables/params
  - `no-explicit-any`
  - `default-param-last`
  - Prefer `unknown` in catches with proper narrowing
- Keep imports ordered and named exports preferred over default exports for utilities.

## Common Pitfalls Checklist

- [ ] Catch blocks use `unknown` and narrow to `Error`
- [ ] No `any` in signatures or bodies
- [ ] Options object used instead of non-last default parameters
- [ ] Request bodies validated (e.g., `zod`)
- [ ] No token/PII in logs; logging gated in prod
- [ ] Tool schemas minimal and validated before calling adapters
- [ ] Route handlers thin; business logic in `src/tools/*`
- [ ] Consistent result envelope with `success`
- [ ] Pagination supported and summarized for LLM

### Extending with New Tools (Playbook)

1. Add typed function in `src/tools/<service>.ts` using options object and result envelope.
2. Export input/output types via `src/types/*` if shared.
3. Register a new tool in the route’s tool registry with minimal input schema and validation.
4. Add small, structured logs; avoid secrets.
5. Add tests for the adapter and any pure transforms.


