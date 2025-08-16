# Calendar Assistant + Inbox Concierge - Unified Plan

## Project Overview

Building a unified Next.js web application that combines calendar management and email management through a single chat interface, powered by Claude Code SDK with direct tool function integration.

## Simplified Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Next.js Application                     │
│                                                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Chat UI       │ │  Calendar View  │ │   Email View    ││
│  │   (React)       │ │   (React)       │ │   (React)       ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│                                                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Claude Code SDK │ │  Tool Functions │ │  API Routes     ││
│  │ (Chat Agent)    │ │ (Direct Import) │ │ (OAuth & State) ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────────────┐
                    │  Google APIs    │
                    │ - Calendar API  │
                    │ - Gmail API     │
                    └─────────────────┘
```

## Key Components

### 1. Tool Functions (src/tools/)
Direct JavaScript functions that Claude SDK imports and calls:

```typescript
// src/tools/calendar.ts
export async function listEvents(auth, startDate, endDate) { ... }
export async function createEvent(auth, eventData) { ... }

// src/tools/gmail.ts  
export async function listEmails(auth, maxResults) { ... }
export async function classifyEmails(auth, threads) { ... }
```

### 2. Next.js API Routes (src/app/api/)
Handle OAuth flow and token management:

```
/api/auth/google/login    - Initiate OAuth
/api/auth/google/callback - Handle OAuth callback
/api/auth/google/refresh  - Refresh tokens
```

### 3. Claude Code SDK Integration (src/app/api/chat/)
Server-side Claude agent that imports tool functions and handles chat:

```typescript
// src/app/api/chat/route.ts
import { createAgent } from '@anthropic-ai/sdk';
import * as calendarTools from '@/tools/calendar';
import * as gmailTools from '@/tools/gmail';
import { getTokensFromCookies } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { message } = await request.json();
  const tokens = getTokensFromCookies(request);
  
  const agent = createAgent({
    tools: {
      ...calendarTools,
      ...gmailTools,
    },
    context: { tokens }
  });
  
  return agent.streamResponse(message);
}
```

## Example User Interactions

```
User: "I have three meetings I need to schedule with Joe, Dan, and Sally. 
       I really want to block my mornings off to work out, so can you 
       write me an email draft I can share with each of them?"

Agent: *Calls listEvents() to check calendar availability*
       *Calls createEvent() for morning workout blocks*
       *Generates personalized email drafts with available afternoon slots*

User: "How much of my time am I spending in meetings? How would you 
       recommend I decrease that?"

Agent: *Calls listEvents() for last 30 days*
       *Analyzes meeting patterns and duration*
       *Provides insights and actionable recommendations*
```

## Google API Scopes Required

- `https://www.googleapis.com/auth/calendar` - Full calendar access
- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/gmail.modify` - Modify labels/archive

## Tool Functions Specification

### Calendar Tools (src/tools/calendar.ts)
- `listEvents(auth, startDate, endDate, calendarId?)`
- `createEvent(auth, summary, startTime, endTime, attendees?, description?)`
- `updateEvent(auth, eventId, updates)`
- `deleteEvent(auth, eventId)`
- `getFreeBusy(auth, calendars, startTime, endTime)`
- `createTimeBlock(auth, startTime, endTime, title)`

### Gmail Tools (src/tools/gmail.ts)
- `listThreads(auth, maxResults?, labelIds?, query?)`
- `getThread(auth, threadId)`
- `sendEmail(auth, to, subject, body, html?)`
- `classifyEmails(auth, threadIds, categories)`
- `createLabel(auth, name)`
- `addLabel(auth, threadId, labelId)`
- `archiveThread(auth, threadId)`

## Development Milestones

### Week 1: Foundation ✅
- ✅ Architecture design (simplified from MCP to direct functions)
- ✅ Next.js project setup with Tailwind CSS
- ✅ Google OAuth implementation (login/callback/refresh)
- ✅ Calendar and Gmail tool functions
- ✅ Google Cloud Console setup and API enablement
- ✅ Working test interface with real Google API calls
- ✅ Secure token management with HTTP-only cookies

### Week 2: Claude SDK Integration
**Phase 2A: Basic Chat Setup**
- 📋 Install Claude SDK and set up /api/chat route
- 📋 Create ChatInterface component with message handling
- 📋 Test basic chat with tool function calls
- 📋 Add streaming response support

**Phase 2B: Enhanced Chat Experience**
- 📋 Add tool execution visibility (show when Claude calls APIs)
- 📋 Handle authentication state in chat context
- 📋 Error handling for tool failures
- 📋 Message history and conversation management

### Week 3: UI Feature Development
**Phase 3A: Calendar Assistant Interface**
- 📋 CalendarWidget component showing listEvents() data
- 📋 Visual calendar grid with events from Google Calendar
- 📋 Quick action buttons (create meeting, block time)
- 📋 Integration with chat for natural language calendar ops

**Phase 3B: Inbox Concierge Interface**
- 📋 EmailBuckets component showing classified emails
- 📋 Auto-run classifyEmails() on page load
- 📋 Custom bucket creation and email re-classification
- 📋 Email preview and action buttons (archive, label)

### Week 4: Advanced Intelligence Features
**Phase 4A: Complex Calendar Operations**
- 📋 Multi-person meeting scheduling with conflict detection
- 📋 Meeting analytics and time-spending insights
- 📋 Smart time blocking and workout schedule integration
- 📋 Email draft generation for meeting requests

**Phase 4B: Smart Email Management**
- 📋 Advanced email classification with user learning
- 📋 Automated email responses and templates
- 📋 Newsletter and marketing email handling
- 📋 Cross-domain insights (email mentions → calendar events)

### Week 5: Polish & Production Ready
- 📋 Mobile responsive design
- 📋 Performance optimization and caching
- 📋 Comprehensive error handling and edge cases
- 📋 Security review and token management audit
- 📋 User onboarding and help documentation

## Success Metrics

1. **Functional Requirements**
   - ✅ Single OAuth for both Gmail + Calendar
   - ✅ Email classification with 90%+ accuracy
   - ✅ Natural language calendar scheduling
   - ✅ Meeting time analysis and recommendations

2. **User Experience**
   - ✅ Sub-3 second response times for common queries
   - ✅ Intuitive chat interface
   - ✅ Mobile-responsive design
   - ✅ Accessibility compliance

3. **Technical Performance**
   - ✅ Robust error handling for API failures
   - ✅ Secure token management
   - ✅ Efficient API usage within Google limits
   - ✅ Maintainable, well-documented code

## Implementation Details

### File Structure for Phase 2
```
src/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts              # Claude SDK integration
│   │   ├── auth/google/              # OAuth (existing)
│   │   └── data/
│   │       ├── calendar/route.ts     # Calendar data for UI
│   │       └── emails/route.ts       # Email data for UI
│   ├── page.tsx                      # Main app interface
│   └── layout.tsx
├── components/
│   ├── ChatInterface.tsx             # Chat UI component
│   ├── MessageList.tsx               # Chat message display
│   ├── CalendarWidget.tsx            # Calendar visualization
│   ├── EmailBuckets.tsx              # Email classification UI
│   └── AuthGuard.tsx                 # Authentication wrapper
├── tools/                            # Google API functions (existing)
│   ├── calendar.ts
│   └── gmail.ts
└── lib/
    ├── auth.ts                       # OAuth utilities (existing)
    └── claude.ts                     # Claude SDK configuration
```

### Phase 2A Implementation Steps

**Step 1: Install Claude SDK**
```bash
npm install @anthropic-ai/sdk
```

**Step 2: Create Chat API Route**
- Handle POST requests with user messages
- Import all tool functions from calendar.ts and gmail.ts
- Extract authentication tokens from cookies
- Pass tokens as context to Claude agent
- Return streaming chat responses

**Step 3: Build ChatInterface Component**
- Text input for user messages
- Message list showing conversation history
- Send messages to /api/chat endpoint
- Handle streaming responses for real-time feel
- Show typing indicators and tool execution status

**Step 4: Update Main Page Layout**
```typescript
// src/app/page.tsx structure
<AuthGuard>
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2">
      <ChatInterface />
    </div>
    <div className="space-y-6">
      <CalendarWidget />
      <EmailBuckets />
    </div>
  </div>
</AuthGuard>
```

**Step 5: Test End-to-End Flow**
- User types: "What meetings do I have today?"
- Claude calls listEvents() with today's date range
- Returns formatted response with actual calendar data
- User types: "Classify my recent emails"
- Claude calls classifyEmails() with recent thread IDs
- Returns classification results

### Tool Function Integration Pattern

Each tool function will be enhanced to work seamlessly with Claude:

```typescript
// Enhanced tool function signature
export async function listEvents(
  accessToken: string,
  options: ListEventsOptions = {},
  refreshToken?: string
): Promise<{ success: boolean; events?: any[]; error?: string }> {
  // Existing implementation with enhanced error handling
  // for Claude agent consumption
}
```

### User Experience Flow

**Calendar Assistant Workflow:**
1. User: "Schedule a meeting with John tomorrow at 2pm"
2. Claude: Calls listEvents() to check availability
3. Claude: Calls createEvent() with meeting details
4. Claude: Responds with confirmation and calendar link
5. UI: CalendarWidget automatically refreshes to show new event

**Inbox Concierge Workflow:**
1. Page Load: Auto-calls classifyEmails() with recent threads
2. UI: Shows emails sorted into buckets (Important, Can Wait, etc.)
3. User: "Create a new category for newsletters"
4. Claude: Calls createLabel() with category name
5. Claude: Re-classifies emails with new category
6. UI: EmailBuckets updates with new classification

-- Claude | 2025-08-16 (Updated: Added detailed Phase 2 implementation plan)