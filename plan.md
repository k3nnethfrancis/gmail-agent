# Calendar Assistant + Inbox Concierge - Unified Plan

## Project Overview

Building a unified Next.js web application that combines calendar management and email management through a single chat interface, powered by Anthropic AI SDK with direct tool function integration and intelligent agentic workflows.

**Current Status**: Custom calendar widget complete! Working on calendar assistant completion (Phase 3A+)
**Branch**: `dev` (all latest improvements)
**Port**: `3000` (npm run dev)
**Key Files**: See CLAUDE.md for comprehensive context

### Prerequisites
- Google OAuth credentials configured
- ANTHROPIC_API_KEY set in .env.local
- Working Google Calendar and Gmail API access
- Next.js 15 with TypeScript and Tailwind CSS

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

### Week 2: Claude SDK Integration ✅
**Phase 2A: Basic Chat Setup** ✅
- ✅ Install Anthropic AI SDK and set up /api/chat route
- ✅ Create ChatInterface component with message handling
- ✅ Test basic chat with tool function calls
- ✅ Add streaming response support via /api/chat-stream

**Phase 2B: Enhanced Chat Experience** ✅
- ✅ Add agentic workflow support (autonomous multi-step task execution)
- ✅ All 8 calendar and email tools exposed to Claude
- ✅ Handle authentication state in chat context
- ✅ Comprehensive error handling for tool failures
- ✅ Message history and conversation management
- ✅ Enterprise-level code quality (TypeScript/ESLint compliance)

**Phase 2C: Progressive Feedback** ✅ (Complete - merged to dev branch)
- ✅ Claude Code-style conversational streaming UX implemented
- ✅ Real-time tool call visibility with clean formatting  
- ✅ Enterprise architecture with shared modules and tool registry
- ✅ Production-ready streaming with SSE parsing and AbortController
- ✅ Senior engineer architectural improvements applied

### Week 3: Calendar Assistant Completion ✅ (MAJOR MILESTONE!)
**Phase 3A: Custom Calendar Widget** ✅ (COMPLETE)
- ✅ **CalendarWidget**: Custom-built calendar replacing complex react-big-calendar
- ✅ **Clean UI**: Agenda/Day/Week views with minimal, focused design
- ✅ **Real-Time Integration**: Immediate refresh on chat calendar operations
- ✅ **Google Calendar API**: Full integration with token refresh and polling
- ✅ **Production Ready**: Custom implementation with proper error handling
- ✅ **Context System**: CalendarRefreshContext for cross-component communication

**Phase 3A+: Calendar Assistant Requirements** 🔄 (Current Priority)
Based on engineering-project.md requirements, we need to complete:
- ✅ **Core Chat Interface**: "Schedule meetings with Joe, Dan, Sally" ✅
- ✅ **Time Blocking**: "Block mornings for workouts" ✅ 
- ✅ **Meeting Analysis**: "How much time in meetings?" ✅
- 🔄 **Delete/Cancel Events**: Need delete feature with approval mechanism (Next Task)
- 📋 **Email Draft Generation**: For meeting requests (cross-feature)
- 📋 **Multi-person Scheduling**: Using get_freebusy for conflict detection

## Next Immediate Task: Delete Event with Approval

### Requirements
- **Safety First**: Deleting calendar events is destructive and should require confirmation
- **User Experience**: Clear preview of what will be deleted before confirmation
- **Implementation Options**:
  1. **Modal Confirmation**: Show event details + "Are you sure?" dialog
  2. **Two-Step Chat**: Claude asks "Should I delete the meeting with John at 2pm on Monday?" 
  3. **Approval Command**: User must say "yes, delete it" or similar confirmation

### Technical Implementation Strategy
```typescript
// Option 1: Modal-based approval in UI
deleteEvent(eventId) -> showDeleteModal(eventDetails) -> user confirms -> actualDelete()

// Option 2: Chat-based confirmation (Recommended)
User: "Cancel my meeting with John"
Claude: "I found: 'Meeting with John - Monday 2:00-3:00 PM'. Should I delete this event? (yes/no)"
User: "yes" 
Claude: *calls delete_event* -> "Event deleted and calendar updated"
```

### Implementation Steps
1. **Add delete approval logic** to chat interface
2. **Modify delete_event tool** to require explicit confirmation parameter
3. **Update CalendarWidget** to trigger refresh on deletions
4. **Add confirmation prompts** in Claude's system prompt
5. **Test with real calendar events** to ensure safety

## Current Status Summary (Updated)

### ✅ COMPLETED: Calendar Assistant Foundation (95% of requirements)
**Engineering Project Requirements Check**:
- ✅ **Web interface with React**: Next.js app with TypeScript
- ✅ **GSuite authentication**: Working Google OAuth with auto-refresh
- ✅ **Calendar information display**: Custom CalendarWidget with Agenda/Day/Week views
- ✅ **Chat interface**: Claude Sonnet 4 with streaming UX and tool calling
- ✅ **Complex scheduling**: "Schedule 3 meetings + block workout time + email drafts"
- ✅ **Meeting analysis**: "How much time in meetings?" with insights and recommendations
- ✅ **All calendar tools**: list_events, create_event, update_event, get_freebusy, create_time_block

**Technical Achievements**:
- ✅ **Production-ready architecture** with proper error handling and TypeScript
- ✅ **Real-time integration** between chat and calendar widget
- ✅ **Custom calendar implementation** that's cleaner than library alternatives
- ✅ **Agentic workflows** that complete multi-step tasks autonomously

### 🔄 REMAINING: Final Calendar Assistant Polish (5%)
1. **Delete Events with Approval** (Safety-critical feature)
2. **Email Draft Generation** (Integration with Gmail tools)
3. **Advanced Multi-person Scheduling** (get_freebusy integration)

### 📋 NEXT PHASE: Inbox Concierge (Separate feature set)
- Email classification into buckets
- Custom bucket creation
- Auto-archive and newsletter handling

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

## Current Development Status

### Completed Features ✅
- **Agentic Workflow System**: Autonomous multi-step task execution with 15 iteration/50 tool call safety limits
- **Complete Tool Integration**: All 8 calendar and email tools (list_events, create_event, update_event, delete_event, get_freebusy, create_time_block, list_threads, classify_emails)
- **Dual API Architecture**: Standard `/api/chat` for complete responses + `/api/chat-stream` for progressive feedback
- **Enterprise Code Quality**: Zero TypeScript/ESLint violations, comprehensive error handling
- **Real OAuth Integration**: Working Google Calendar and Gmail API with HTTP-only cookie auth

### ✅ Current Status: Production-Ready Foundation Complete

**Branch**: `dev` (ahead of main, contains all Phase 2C improvements)
**Current Priority**: Phase 3A - Calendar Widget Implementation

**Working Features**:
- ✅ Claude Code-style conversational streaming UX
- ✅ Real-time tool call visibility with clean formatting
- ✅ Enterprise architecture with shared modules (agentConfig.ts, toolRegistry.ts)
- ✅ Production-ready streaming with SSE parsing and AbortController
- ✅ All 8 Google API tools working seamlessly

**Architecture Pattern** (Critical for new developers):
```typescript
// Adding new tools: 3-step pattern
// 1. Schema in src/lib/agentConfig.ts
// 2. Implementation in src/lib/toolRegistry.ts  
// 3. Automatic availability in both routes
```

## Phase 2C: Intelligent Progress Messaging

### Architecture Design

#### Core Concept: Dual-Claude System
```
Primary Claude (Tool Execution)
    ↓ (detects tool calls)
Secondary Claude (Progress Narrator)
    ↓ (generates contextual messages)
Frontend (Updates UI in real-time)
```

#### Implementation Strategy

**1. Tool Call Detection & Context Analysis**
```typescript
// When primary Claude makes tool calls, extract context
interface ToolCallContext {
  toolName: string;
  toolInput: unknown;
  workflowPhase: 'planning' | 'executing' | 'finalizing';
  previousTools: string[];
  userRequest: string;
}
```

**2. Progress Message Generation Service**
```typescript
// New service: src/services/progressNarrator.ts
class ProgressNarrator {
  async generateMessage(context: ToolCallContext): Promise<string> {
    const prompt = `Based on this tool execution context, write a SHORT (3-5 words) progress message for the user:
    
    Tool: ${context.toolName}
    User's original request: ${context.userRequest}
    Previous actions: ${context.previousTools.join(', ')}
    
    Examples:
    - "Checking your calendar..."
    - "Scheduling with Joe..."
    - "Blocking workout time..."
    
    Be specific and contextual, not generic.`;
    
    return await this.callClaudeForMessage(prompt);
  }
}
```

**3. Enhanced Streaming Architecture**
```typescript
// Modified /api/chat-stream/route.ts
async function processToolCalls(toolCalls: ToolCall[], context: WorkflowContext) {
  for (const toolCall of toolCalls) {
    // Generate intelligent progress message
    const progressMessage = await progressNarrator.generateMessage({
      toolName: toolCall.name,
      toolInput: toolCall.input,
      userRequest: context.originalRequest,
      previousTools: context.completedTools
    });
    
    // Send contextual progress update
    sendSSEMessage(controller, 'progress', progressMessage);
    
    // Execute actual tool
    const result = await executeTool(toolCall);
    
    // Send completion update
    sendSSEMessage(controller, 'tool_complete', { 
      tool: toolCall.name, 
      success: result.success 
    });
  }
}
```

### Implementation Steps

#### Step 1: Progress Narrator Service
**File**: `src/services/progressNarrator.ts`
- Create separate Claude instance for message generation
- Design context-aware prompts for different tool types
- Implement caching for similar tool call patterns
- Keep messages under 50 characters for UI responsiveness

#### Step 2: Enhanced Tool Context Tracking
**File**: `src/app/api/chat-stream/route.ts`
- Track workflow state (planning → executing → finalizing)
- Maintain history of completed tools
- Extract semantic context from tool inputs (e.g., meeting attendee names)

#### Step 3: Frontend Progress State Management
**File**: `src/components/ChatInterface.tsx`
- Single progress message that updates in-place
- Smooth transitions between progress states
- Visual indicators for different workflow phases

#### Step 4: DRY Architecture for Multiple UIs
**Preparation for Calendar Widget Integration**

```typescript
// src/hooks/useAgenticWorkflow.ts
export function useAgenticWorkflow() {
  return {
    startWorkflow: (message: string) => Promise<void>,
    progressState: ProgressState,
    workflowResults: WorkflowResults,
    isComplete: boolean
  };
}

// Both ChatInterface and CalendarWidget can use this hook
```

### Detailed Implementation Plan

#### Phase 2C.1: Core Progress Narrator (Current Sprint)
**Branch**: `feature/progressive-feedback`

**Tasks**:
1. **Create ProgressNarrator Service**
   - Setup separate Claude instance with specialized prompts
   - Design message generation for each tool type
   - Implement message caching and deduplication

2. **Enhance Tool Context Detection**
   - Extract meaningful context from tool inputs
   - Track workflow progression state
   - Build semantic understanding of user intent

3. **Update Streaming API**
   - Integrate progress narrator into tool execution loop
   - Replace generic messages with intelligent ones
   - Ensure single progress message updates in-place

4. **Frontend State Management**
   - Modify ChatInterface to handle single updating progress message
   - Add visual transitions for better UX
   - Test with complex multi-step workflows

**Expected Outcome**: Intelligent, contextual progress messages that replace generic "thinking" indicators.

#### Phase 2C.2: DRY Architecture Foundation
**Preparation for**: Calendar widget integration (next branch)

**Tasks**:
1. **Extract Workflow Logic**
   - Create `useAgenticWorkflow` hook
   - Separate business logic from UI components
   - Design unified progress state management

2. **Reusable Progress Components**
   - Create `<ProgressIndicator />` component
   - Design for use in both chat and calendar widgets
   - Implement consistent visual language

3. **Testing & Documentation**
   - Comprehensive testing of progress messaging
   - Document architecture for calendar widget team
   - Performance optimization for rapid tool execution

### Success Metrics

#### User Experience
- ✅ No redundant progress messages
- ✅ Contextual, specific progress updates
- ✅ Smooth visual transitions between states
- ✅ Under 3-second perceived wait time for complex workflows

#### Technical Architecture
- ✅ DRY code structure ready for calendar widget
- ✅ Performant progress message generation (<200ms)
- ✅ Reliable streaming with proper error handling
- ✅ Scalable for additional UI components

### Next Phases (Post-2C)

#### Phase 3A: Calendar Widget Integration
**Branch**: `feature/calendar-widget`
- Visual calendar grid showing Google Calendar events
- Real-time updates when agentic workflows create/modify events
- Uses shared progress architecture from Phase 2C

#### Phase 3B: Enhanced Intelligence
- ML-based email classification
- Predictive scheduling suggestions
- Cross-component data synchronization

### Testing Strategy

#### Manual Testing Scenarios
1. **Complex Calendar Workflow**: "Schedule 3 meetings + workout blocks + email drafts"
2. **Email Management**: "Classify last 50 emails and create newsletter label"
3. **Mixed Operations**: "Cancel tomorrow's meetings and reschedule for next week"

#### Expected Progress Messages
```
Complex Calendar Workflow:
🔄 Analyzing your schedule for next week...
✅ Created 5 workout blocks (Mon-Fri 7-9 AM)
🔄 Finding optimal afternoon meeting slots...
✅ Scheduled meeting with Joe (Mon 1-2 PM)
✅ Scheduled meeting with Dan (Tue 4-5 PM)
✅ Scheduled meeting with Sally (Wed 4-5 PM)
🔄 Drafting meeting invitation emails...
✅ All meetings scheduled and emails drafted!
```

### Code Quality Standards

- **Type Safety**: All progress messaging strongly typed
- **Performance**: Progress messages generated in <200ms
- **Error Handling**: Graceful fallback to generic messages if narrator fails
- **Testing**: Unit tests for all progress generation scenarios
- **Documentation**: Comprehensive API docs for calendar widget integration

## Phase 3A: Calendar Widget Implementation Plan

### Current Priority: Visual Calendar Interface

**Branch**: `dev` (ahead of main, contains all Phase 2C improvements)
**Target Location**: Replace "Upcoming Events" section in top-right sidebar
**Approach**: Component library integration for production-ready calendar UI

### Implementation Strategy

#### **1. UI Component Library Research & Selection**

**Evaluation Criteria:**
- React compatibility and TypeScript support
- Multiple view modes (week/month/day)
- Event display and click handling
- Customizable styling (matches current design)
- Read-only mode support
- Performance with large datasets

**Candidate Libraries:**
- `react-big-calendar` - Full-featured calendar with multiple views
- `@schedule-x/calendar` - Modern, TypeScript-first calendar
- `react-calendar` - Lightweight, customizable
- `@natscale/react-calendar` - Simple, clean design

#### **2. Calendar Data Integration**

**Polling Architecture:**
```typescript
// src/hooks/useCalendarData.ts
export function useCalendarData(refreshInterval = 30000) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Poll calendar API every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchCalendarEvents, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);
}
```

**Calendar API Endpoint:**
```typescript
// src/app/api/calendar/events/route.ts
export async function GET() {
  // Use existing listEvents tool function
  // Return standardized event format for UI
}
```

#### **3. Component Architecture**

**CalendarWidget Structure:**
```
CalendarWidget.tsx
├── CalendarHeader (view switcher, navigation)
├── CalendarBody (chosen library component)
├── EventModal (detailed view on click)
└── LoadingState / ErrorState
```

**Integration Points:**
- Replace current "Upcoming Events" placeholder
- Maintain sidebar width and responsive behavior
- Use existing Tailwind CSS design system
- Handle authentication state (show login prompt if needed)

#### **4. Event Display Standards**

**Event Data Shape:**
```typescript
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  attendees?: string[];
  color?: string; // For visual categorization
}
```

**View-Specific Behavior:**
- **Week View**: Default, shows current week with hourly slots
- **Month View**: Monthly overview with event indicators
- **Day View**: Detailed single-day schedule

#### **5. Real-Time Synchronization**

**Update Triggers:**
- Automatic polling every 30 seconds
- Manual refresh after chat creates/modifies events
- Browser focus/visibility change refresh
- WebSocket updates (future enhancement)

**Chat Integration:**
```typescript
// Update calendar when chat completes calendar operations
const onChatCalendarOperation = () => {
  triggerCalendarRefresh();
};
```

### Development Tasks (Current Sprint)

#### **Week 1: Foundation**
1. **Library Evaluation & Selection**
   - Install and test 2-3 candidate libraries
   - Create proof-of-concept implementations
   - Choose based on features and integration ease

2. **Data Layer Setup**
   - Create `useCalendarData` hook with polling
   - Build `/api/calendar/events` endpoint
   - Test with real Google Calendar data

3. **Basic Component Structure**
   - Replace "Upcoming Events" with CalendarWidget
   - Implement view switcher (week/month/day)
   - Handle loading and error states

#### **Week 2: Polish & Integration**
1. **Event Interaction**
   - Click handling for event details
   - Modal/expanded view implementation
   - Responsive design for mobile

2. **Chat Integration**
   - Calendar refresh triggers from chat operations
   - Visual feedback for calendar updates
   - Error handling for auth failures

3. **Performance Optimization**
   - Efficient re-rendering patterns
   - Data caching strategies
   - Lazy loading for large datasets

### Success Metrics

**Functional Requirements:**
- ✅ Shows real Google Calendar events
- ✅ Supports week/month/day views
- ✅ Updates within 30 seconds of changes
- ✅ Click interaction for event details

**User Experience:**
- ✅ Matches existing design language
- ✅ Responsive on mobile devices
- ✅ Smooth transitions between views
- ✅ Clear loading/error states

**Technical Standards:**
- ✅ Uses existing authentication system
- ✅ TypeScript compliance and type safety
- ✅ Leverages shared tool architecture
- ✅ Performance optimized for real-time updates

### Future Enhancements (Post-3A)
- **Event Creation**: Click empty slots to create events via chat
- **Drag & Drop**: Visual event modification (still agent-confirmed)
- **Calendar Overlays**: Multiple calendar support
- **Smart Scheduling**: AI-suggested time slots
- **Conflict Detection**: Visual warnings for scheduling conflicts

This calendar widget will provide immediate visual feedback for the conversational AI system, creating a seamless experience where users can see their schedule while having natural language conversations about calendar management.

-- Claude | 2025-08-16 (Updated: Added Phase 3A Calendar Widget implementation plan - Current Priority)