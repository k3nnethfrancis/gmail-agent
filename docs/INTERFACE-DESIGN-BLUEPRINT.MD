# Agent Workspace Interface Design Spec

*Last updated: 2025‑08‑17*

## Purpose

Define a cohesive UI/UX for a single **Agent Workspace** that unifies Chat, Inbox Concierge, and Calendar Assistant. The workspace supports progressive disclosure (peek → expanded → focused), agent‑generated artifacts (drafts/proposals), and rapid approve/send/schedule flows without context switching.

---

## Objectives & Non‑Goals

**Objectives**

* Centralize user interaction around **Chat** while enabling deep work in **Inbox** and **Calendar** via dockable widgets.
* Support LLM‑powered **classification** of last 200 threads with user‑defined buckets; instant re-run on bucket changes.
* Enable **agent‑generated email drafts** and **calendar proposals** as first‑class items ("artifacts") that the user can edit and approve inline.
* Maintain a clear approvals model: nothing is sent/scheduled without explicit approval unless user opts into trusted policies.

**Non‑Goals (MVP)**

* Full message reader view (thread detail); only list preview is required.
* Multi-account federation beyond account switcher.
* Offline mode.

---

## Core Concept

**Agent Workspace** with **dockable widgets** and **three UI modes** per widget:

* **Peek**: compact status (badges, next items) → click/drag to expand.
* **Expanded**: panel with lists, filters, and quick actions.
* **Focused**: modal/sheet for deep flows (compose, approve, schedule, bucket design).

A bottom **Agent Queue** surfaces agent artifacts awaiting user action (drafts, proposals, bulk actions). Chat messages can pin artifacts into the Queue.

---

## Information Architecture

* **Left Rail**: App nav (Chat, Inbox, Calendar, Settings), quick filters (Today/This Week), account switcher.
* **Center (Primary)**: **Chat Surface** with inline artifact cards and pinned summaries.
* **Right Dock (Secondary)**: **Widget Switcher** (Inbox/Calendar). Each widget supports Peek → Expanded → Focused.
* **Bottom Bar**: **Agent Queue** (pending artifacts with approve/dismiss actions).

**Mobile (Expo parity)**

* Bottom tabs: Chat, Inbox, Calendar, Queue. Focused mode uses slide‑up sheets.

---

## Key User Flows

1. **"Block mornings + draft outreach"**

   * Chat request → Agent emits a **calendar proposal** artifact (AM focus blocks) + **email drafts** (one per recipient).
   * Queue shows 4 cards; Calendar (Expanded) overlays proposed blocks; drafts open in Focused composer → Approve & Send.

2. **Classification re-bucket**

   * Inbox (Expanded) → Create Bucket → Focused "Bucket Designer" with rules + LLM hint.
   * Dry‑run shows distribution deltas across buckets; Apply to reclassify all 200 threads.

3. **Time-in-meetings insight** (V2)

   * Chat: "How much time am I spending in meetings?" Agent posts **summary artifact** with metrics; open Focused analytics for suggestions and one‑click bulk actions (e.g., shorten recurring meetings, add focus blocks).

---

## Components

### Shell & Layout

* **Shell**: responsive grid (3 columns on desktop). Right dock width is resizable.
* **WidgetFrame** props: `title`, `mode: 'peek'|'expanded'|'focused'`, `onPeek`, `onExpand`, `onClose`.
* **WidgetSwitcher**: toggles Inbox/Calendar; persists last state per widget.
* **AgentQueue**: horizontal cards; supports bulk select + bulk approve.

### Chat Surface

* Rich Markdown, action chips (Shorten, Friendlier, Re‑generate), and **inline artifact cards**.
* Messages can **pin artifacts** to Queue; deep‑link into widgets (e.g., open Calendar in Focused mode with a specific proposal).

### Inbox Widget

**Peek**

* Unread badge, top 3 buckets, last 3 subjects.

**Expanded**

* Buckets list with counts (Important, Can Wait, Newsletters, Auto‑archive, ✚ Custom).
* Thread list (last 200): subject, snippet, from, date, bucket pill.
* Bulk actions: Archive, Mute, Move to bucket, Mark Important.
* Quick Reclassify: drag thread → bucket; or context menu.
* CTA: "Create Bucket" → Focused designer.

**Focused**

* **Composer**: displays agent‑generated draft; editable **markdown editor** with tone chips (Shorten/Lengthen/More Formal/Warmer), insert variables, preview.
* **Bucket Designer**: form fields for rules + LLM hint; Dry‑run results: counts per bucket, before/after; Apply.

### Calendar Widget

**Peek**

* Next 3 items + mini free/busy bar.

**Expanded**

* Week view; overlay for **focus blocks**; **density meter** (meeting hrs %).
* Quick actions: Add Focus Block, Suggest Earlier/Later.

**Focused**

* **Smart Scheduling** flow: attendees, duration, constraints (earliest/latest, avoid blocks), candidate slots with scores/reasons; select → Schedule or Draft emails.
* **Event editor**: title, attendees, conferencing, notes.

### Artifact Cards (Queue & Inline)

* Types: `email_draft`, `calendar_proposal`, `summary`, `bulk_action`.
* Status: `pending | approved | sent | scheduled | dismissed | failed`.
* Buttons: Approve, Dismiss, Open (Focused), More (tone, regenerate, edit constraints).

---

## Data & State Model

```ts
// Buckets
export type BucketId = string;
export interface Bucket {
  id: BucketId;
  name: string; // "Important", "Can wait", etc.
  description?: string;
  icon?: string;
  rule?: { query?: string; fromDomains?: string[]; mustInclude?: string[]; mustNotInclude?: string[] };
  llmHint?: string; // guidance for LLM classification
  action?: 'none' | 'auto_archive' | 'star' | 'label';
  priority: number;
}

// Artifacts (agent outputs)
export type ArtifactKind = 'email_draft' | 'calendar_proposal' | 'summary' | 'bulk_action';
export type ArtifactStatus = 'pending' | 'approved' | 'sent' | 'scheduled' | 'dismissed' | 'failed';
export interface AgentArtifact<TPayload = any> {
  id: string;
  kind: ArtifactKind;
  title: string;
  preview?: string;
  createdAt: string;
  status: ArtifactStatus;
  sourceMessageId?: string; // originating chat message
  payload: TPayload;
}

// Email draft payload
export interface EmailDraftPayload {
  to: Array<{ name?: string; email: string }>;
  subject: string;
  body_md: string;
  suggestions?: string[]; // optional alt tones
}

// Calendar proposal payload
export interface CalendarProposalPayload {
  attendees: Array<{ name?: string; email: string }>;
  constraints: { timezone: string; durationMin: number; earliest: string; latest: string; avoidBlocks?: string[] };
  candidateSlots: Array<{ start: string; end: string; score: number; reason?: string }>;
  followupEmails?: EmailDraftPayload[];
}
```

Widget view state is local (`mode: 'peek'|'expanded'|'focused'`) and persisted per user.

---

## API Contracts (front‑end‑first)

**Auth**

* `POST /auth/google` → `{ url }` (OAuth URL)
* `GET /auth/session` → `{ user, accounts: [...], activeAccountId }`

**Inbox**

* `GET /inbox/threads?limit=200` → `{ threads: { id, subject, snippet, from, to, date, bucketId }[] }`
* `GET /inbox/buckets` → `Bucket[]`
* `POST /inbox/buckets` (body: `Bucket`) → `Bucket`
* `POST /inbox/reclassify` (body: `{ bucketId, threadIds: string[] }`) → `{ updated: number }`
* `POST /inbox/classify/rebuild` (body: `{ dryRun?: boolean }`) → `{ summary, deltas }`

**Compose**

* `POST /compose/draft` (body: `{ prompt | structured_input }`) → `AgentArtifact<EmailDraftPayload>`
* `POST /compose/send` (body: `{ artifactId } | EmailDraftPayload`) → `{ status: 'sent', messageId }`

**Calendar**

* `GET /calendar/events?range=ISO..ISO` → `{ events: [...] }`
* `POST /calendar/proposals` (body: `{ attendees, constraints }`) → `AgentArtifact<CalendarProposalPayload>`
* `POST /calendar/schedule` (body: `{ artifactId, chosenSlot }`) → `{ status: 'scheduled', eventId }`

**Artifacts & Events**

* `GET /artifacts?status=pending` → `AgentArtifact[]`
* `POST /artifacts/:id/approve` → `{ status }`
* `POST /artifacts/:id/dismiss` → `{ status }`
* **WS `/events`**: `artifact.created | artifact.updated | artifact.deleted`

---

## Classification Pipeline (FE obligations)

* Provide bucket definitions (name, description, llmHint) to the server for LLM step.
* On Create Bucket, call `rebuild` with `dryRun=true`; display **diff UI**:

  * per‑bucket counts before/after
  * affected example subjects per bucket
* Only call `Apply` (dryRun=false) after user confirmation.

---

## Interactions & Micro‑UX

* **Universal Cmd‑K**: quick switch to Inbox/Calendar, open recent artifacts, run agent prompts.
* **Drag to Reclassify**: drag thread → bucket (Expanded Inbox).
* **Inline Approvals**: Approve directly from artifact card; modal opens only if edit is needed.
* **Tone Chips**: Shorten/Lengthen/Formal/Warmer → regenerates body preserving variables.
* **Error Banner**: shows when Gmail/Calendar scopes insufficient; 1‑click reauth.

---

## Visual & Responsive Guidelines

* **Design system**: Tailwind + shadcn/ui; 8pt spacing; 2xl rounded; subtle shadows.
* **Density**: compact list rows (44–48px), clear affordances.
* **Responsive**: Right dock collapses below 1200px; widgets become slide‑over on tablet; sheets on mobile.
* **Accessibility**:

  * Keyboard complete: Tab order, ESC to close Focused, Space/Enter on cards.
  * ARIA roles for modals/dialogs; announce status changes (approved/sent/scheduled).
  * High‑contrast mode and reduced motion preference respected.

---

## Telemetry & Observability

Track client events with privacy in mind (no PII payloads):

* `artifact.view/open/approve/dismiss/send/schedule`
* `bucket.create/dryrun.apply/reclassify`
* `calendar.overlay.toggle`, `focusblock.add`
* `chat.prompt.sent`, `agent.response.received`
* Latency metrics for draft generation and proposal fetch.

---

## Permissions & Guardrails

* Separate Gmail scopes: read, draft, send. Separate Calendar read/write.
* **Trusted senders/domains** (opt‑in): allow auto‑send without approval; default off.
* Banner shows active Google account; account switcher clears Queue to avoid cross‑account leaks.

---

## Implementation Plan (MVP → V2)

**MVP**

1. Shell + tri‑mode widgets + Queue
2. Inbox Expanded (buckets + 200‑thread list + drag‑reclassify)
3. Calendar Expanded (week view + density meter)
4. Focused modals: Composer, Scheduling Proposal
5. Artifacts WS + inline cards in Chat
6. Heuristic classification + manual reclassify; Bucket Designer UX with dry‑run stub

**V2**

* LLM refinement for classification + diff UI wired to real counts
* Smart Scheduling with scored reasons & email follow‑ups
* Bulk draft approval + tone transformations
* Analytics: time‑in‑meetings and suggestions panel

---

## Open Questions / Engineer Notes

* Do we persist widget `mode` per user per device? (Recommend yes via local storage + server sync.)
* What’s the maximum artifact retention window? (e.g., 14 days; archive older in a separate tab.)
* Do we allow inline thread preview hover for top‑line details without opening a full reader view? (Optional polish.)
* Accessibility QA budget (keyboard, screen reader paths) before V2?

---

## Appendix: Minimal React Scaffolding (conceptual)

```tsx
function useTriMode(initial: 'peek'|'expanded'|'focused' = 'peek') {
  const [mode, setMode] = useState(initial);
  return { mode, open: setMode };
}

function InboxWidget() {
  const { mode, open } = useTriMode('peek');
  return (
    <WidgetFrame title="Inbox" mode={mode}
      onPeek={() => open('expanded')}
      onExpand={() => open('focused')}
      onClose={() => open('peek')}
    >
      {mode === 'peek' && <InboxPeek/>}
      {mode === 'expanded' && <InboxExpanded/>}
      {mode === 'focused' && <InboxFocused/>}
    </WidgetFrame>
  );
}
```
