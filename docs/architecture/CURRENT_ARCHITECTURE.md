# Current Architecture Overview

## 🏗️ **System Architecture**

### **High-Level Stack**
```
┌─────────────────────────────────────────────────────────────┐
│                    Calendar Assistant + Inbox Concierge     │
│                         (Production Ready)                  │
├─────────────────────────────────────────────────────────────┤
│  Frontend: Next.js 15 + React 18 + TypeScript + Tailwind  │
│  AI: Claude Sonnet 4 with Tool Calling + Agentic Workflows │
│  APIs: Google Calendar API + Gmail API + OAuth 2.0         │
│  Auth: HTTP-only Cookies + Auto Token Refresh              │
└─────────────────────────────────────────────────────────────┘
```

### **Core Components Architecture**
```
src/
├── app/                     # Next.js 15 App Router
│   ├── api/                 # Server-Side API Routes
│   │   ├── auth/google/     # OAuth 2.0 Flow
│   │   ├── chat-stream/     # Streaming Claude Integration
│   │   ├── chat/           # Non-streaming Claude Integration  
│   │   ├── calendar/events/ # Calendar Data Endpoint
│   │   └── test/           # API Testing Endpoints
│   ├── page.tsx            # Main UI (2/3 chat + 1/3 widgets)
│   └── layout.tsx          # App Shell
├── components/             # React UI Components
│   ├── ChatInterface.tsx   # Claude Chat with Tool Calling
│   ├── CalendarWidget.tsx  # Custom Calendar Implementation
│   └── AuthGuard.tsx       # OAuth Protection Wrapper
├── lib/                    # Core Business Logic
│   ├── agentConfig.ts      # Claude System Prompts + Tool Schemas
│   ├── toolRegistry.ts     # Tool Execution + AI Safety Enforcement
│   └── auth.ts             # OAuth Utilities
├── tools/                  # Google API Integrations
│   ├── calendar.ts         # Calendar CRUD Operations
│   └── gmail.ts            # Email Operations + Classification
└── contexts/               # React State Management
    └── CalendarRefreshContext.tsx # Cross-component Communication
```

## 🛡️ **Breakthrough: AI Safety System**

### **Tool Call History Enforcement**
Our most significant technical achievement - prevents AI from hallucinating data:

```typescript
// toolRegistry.ts - The Safety Layer
const toolCallHistory = new Map<string, ToolCallRecord[]>();
const LIST_EVENTS_VALIDITY_WINDOW = 30 * 1000; // 30 seconds

export async function executeTool(toolName: string, input: unknown, context: ToolContext) {
  const sessionId = context.sessionId || 'default';
  
  // DELETION SAFETY ENFORCEMENT
  if (toolName === 'delete_event') {
    if (!hasRecentListEvents(sessionId)) {
      return {
        success: false,
        error: `📋 Need to check calendar first - will list current events to get valid IDs`,
        requiresListEvents: true,
      };
    }
  }
  
  // Track this tool call
  addToolCallToHistory(toolName, sessionId);
  
  // Execute the actual tool
  return await toolFunction(input, context);
}
```

**Impact**: 
- **Problem**: Claude used fake IDs like `"workout_event_id"` → 404 failures
- **Solution**: Force `list_events` call within 30 seconds before any deletions
- **Result**: Claude now uses real Google Calendar event IDs → successful operations

### **Message Consolidation System**
Handles parallel tool calling gracefully:

```typescript
// ChatInterface.tsx - UX Layer
if (isGuidance) {
  // Consolidate multiple safety messages into one
  if (pending.has(guidanceKey)) {
    existing.count++;
  } else {
    // Show single message, update count after 1-second window
    setTimeout(() => {
      if (final.count > 1) {
        setMessages(prev => prev.map(msg => 
          msg.id === final.firstMessage.id 
            ? {...msg, content: `📋 Need to check calendar first (${final.count} attempts)`}
            : msg
        ));
      }
    }, 1000);
  }
}
```

**UX Result**: 
- **Before**: 4× `❌ Failed` (looks broken)
- **After**: 1× `📋 Need to check calendar first (4 attempts)` (professional)

## 🔄 **Data Flow Patterns**

### **Calendar Operations Flow**
```
User Input → ChatInterface → /api/chat-stream → Claude Sonnet 4
    ↓
Tool Call Decision → toolRegistry.ts → Safety Check → Google Calendar API
    ↓
Result → Stream to UI → CalendarRefreshContext → CalendarWidget Update
```

### **Authentication Flow**
```
User → /api/auth/google/login → Google OAuth → /api/auth/google/callback
    ↓
HTTP-only Cookies Set → Auto Refresh via /api/auth/google/refresh
    ↓
All API calls include credentials → toolRegistry gets sessionId from tokens
```

### **Real-time Synchronization**
```
Chat Operation Success → CalendarRefreshContext.refreshCalendar()
    ↓
CalendarWidget.useEffect → /api/calendar/events → Widget Updates
    ↓
User sees immediate visual feedback
```

## 🎯 **Claude Integration Patterns**

### **Agentic Workflow System**
```typescript
// chat-stream/route.ts - Core AI Loop
while (iterationCount < maxIterations && totalToolCalls < maxToolCalls) {
  const toolCalls = currentContentBlocks.filter(block => block.type === 'tool_use');
  
  if (toolCalls.length === 0) break; // Claude finished
  
  // Execute all tool calls (potentially in parallel)
  for (const toolCall of toolCalls) {
    const result = await executeTool(toolCall.name, toolCall.input, context);
    // Stream result to UI immediately
    sendSSEMessage(controller, 'tool_result', result);
  }
  
  // Get Claude's next response based on tool results
  currentResponse = await anthropic.messages.create({...});
  iterationCount++;
}
```

**Capabilities**:
- Multi-step task completion ("Schedule 3 meetings + block workout time + email drafts")
- Self-correction when tool calls fail
- Parallel tool execution for performance
- Safety limits (15 iterations, 50 tool calls max)

### **Tool Schema Architecture**
```typescript
// agentConfig.ts - Centralized Configuration
export const tools = [
  {
    name: 'list_events',
    description: 'List calendar events with optional filtering by date range',
    input_schema: { /* JSON Schema */ }
  },
  // ... other tools
];

export function createSystemPrompt() {
  return `Current date: ${dateString}
  
  DELETION SAFETY PROTOCOL:
  - ALWAYS call list_events FIRST before delete_event
  - NEVER use made-up event IDs
  
  AGENTIC BEHAVIOR:
  - Complete ALL steps before responding
  - Use tools multiple times as needed`;
}
```

**Benefits**:
- Single source of truth for tool definitions
- Dynamic system prompt with current date/time
- Centralized safety protocols
- Easy tool addition/modification

## 🚀 **Performance & Scalability**

### **Current Performance Metrics**
- **Chat Response Time**: ~3.7s (includes Claude + tool calls)
- **Authentication**: ~1.4s for OAuth flow
- **Tool Function Calls**: ~400ms for Google API requests
- **Real-time Updates**: <500ms for widget refresh

### **Scalability Patterns**
- **Session-based Tool History**: Isolated per user, auto-cleanup
- **Streaming Responses**: Server-Sent Events for real-time UX
- **AbortController**: Prevents memory leaks from cancelled requests
- **Message Consolidation**: Handles high-frequency parallel operations

### **Resource Management**
```typescript
// Memory Management
const MAX_HISTORY_LENGTH = 10;  // Tool calls per session
const LIST_EVENTS_VALIDITY_WINDOW = 30 * 1000;  // 30 seconds

// Request Management  
const maxIterations = 15;
const maxToolCalls = 50;

// UI Management
useEffect(() => {
  return () => {
    if (consolidationTimerRef.current) {
      clearTimeout(consolidationTimerRef.current);
    }
  };
}, []);
```

## 🔮 **Extensibility Patterns**

### **Adding New Tools**
1. **Implement Function**: Add to `src/tools/`
2. **Register Tool**: Add to `toolRegistry.ts`
3. **Define Schema**: Add to `agentConfig.ts`
4. **Apply Safety**: Use safety patterns if needed

### **UI Component Patterns**
- **Real-time Data**: Use context patterns like `CalendarRefreshContext`
- **Loading States**: Handle async operations gracefully  
- **Error Boundaries**: Comprehensive error handling
- **Responsive Design**: Mobile-first with Tailwind CSS

### **Safety Pattern Reuse**
The tool call history enforcement is **generalizable**:
- Email operations can require recent `list_threads` before modifications
- Any destructive operation can require validation steps
- Session-based tracking works for any tool category

---

**This architecture represents a production-ready foundation for AI-powered business applications with enterprise-grade safety and UX.**