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

### 3. Claude Code SDK Integration
```typescript
import { listEvents, createEvent } from '../tools/calendar';
import { listEmails, classifyEmails } from '../tools/gmail';

// Claude SDK directly calls these functions
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
- ✅ Next.js project setup
- 📋 Google OAuth implementation
- 📋 Basic tool functions structure

### Week 2: Core Integration
- 📋 Calendar tool functions with googleapis
- 📋 Gmail tool functions with googleapis  
- 📋 Claude Code SDK integration
- 📋 Basic React UI components

### Week 3: Feature Development
- 📋 Calendar display and management
- 📋 Email classification system
- 📋 Chat interface with Claude SDK

### Week 4: Intelligence Layer
- 📋 Natural language calendar operations
- 📋 Email analytics and suggestions
- 📋 Cross-domain insights

### Week 5: Polish & Testing
- 📋 UI/UX improvements
- 📋 Error handling and edge cases
- 📋 Performance optimization
- 📋 Security review

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

-- Claude | 2025-08-16 (Updated: Simplified from MCP to direct function approach)