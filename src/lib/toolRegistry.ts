// Typed tool registry for Claude agent tool execution with history tracking

import * as calendarTools from '@/tools/calendar';
import * as gmailTools from '@/tools/gmail';

// Tool call history tracking
interface ToolCallRecord {
  toolName: string;
  timestamp: number;
  sessionId?: string;
}

// In-memory storage for tool call history (last 10 calls per session)
const toolCallHistory = new Map<string, ToolCallRecord[]>();
const MAX_HISTORY_LENGTH = 10;
const LIST_EVENTS_VALIDITY_WINDOW = 30 * 1000; // 30 seconds in milliseconds

export interface ToolContext {
  accessToken: string;
  refreshToken?: string;
  sessionId?: string; // For tracking tool call history per session
}

export type ToolResult = {
  success?: boolean;
  events?: unknown[];
  threads?: unknown[];
  event?: unknown;
  error?: string;
  [key: string]: unknown;
};

export type ToolFunction = (input: unknown, context: ToolContext) => Promise<ToolResult>;

// Tool registry mapping tool name to execution function
export const toolRegistry: Record<string, ToolFunction> = {
  list_events: async (input: unknown, context: ToolContext) => {
    const i = (input ?? {}) as { options?: calendarTools.ListEventsOptions };
    return await calendarTools.listEvents(
      context.accessToken,
      i.options ?? {},
      context.refreshToken
    );
  },

  create_event: async (input: unknown, context: ToolContext) => {
    const i = (input ?? {}) as { eventData: calendarTools.CalendarEvent; calendarId?: string };
    return await calendarTools.createEvent(
      context.accessToken,
      i.eventData,
      i.calendarId ?? 'primary',
      context.refreshToken
    );
  },

  update_event: async (input: unknown, context: ToolContext) => {
    const i = (input ?? {}) as { eventId: string; eventData: Partial<calendarTools.CalendarEvent>; calendarId?: string };
    return await calendarTools.updateEvent(
      context.accessToken,
      i.eventId,
      i.eventData,
      i.calendarId ?? 'primary',
      context.refreshToken
    );
  },

  delete_event: async (input: unknown, context: ToolContext) => {
    const i = (input ?? {}) as { eventId: string; calendarId?: string };
    return await calendarTools.deleteEvent(
      context.accessToken,
      i.eventId,
      i.calendarId ?? 'primary',
      context.refreshToken
    );
  },

  get_freebusy: async (input: unknown, context: ToolContext) => {
    const i = (input ?? {}) as { timeMin: string; timeMax: string; calendarIds: string[] };
    return await calendarTools.getFreeBusy(
      context.accessToken,
      i.timeMin,
      i.timeMax,
      i.calendarIds,
      context.refreshToken
    );
  },

  create_time_block: async (input: unknown, context: ToolContext) => {
    const i = (input ?? {}) as { startTime: string; endTime: string; title: string; description?: string; calendarId?: string };
    return await calendarTools.createTimeBlock(
      context.accessToken,
      i.startTime,
      i.endTime,
      i.title,
      i.description,
      i.calendarId ?? 'primary',
      context.refreshToken
    );
  },

  list_threads: async (input: unknown, context: ToolContext) => {
    const i = (input ?? {}) as { options?: gmailTools.ListThreadsOptions };
    return await gmailTools.listThreads(
      context.accessToken,
      i.options ?? {},
      context.refreshToken
    );
  },

  classify_emails: async (input: unknown, context: ToolContext) => {
    const i = (input ?? {}) as { threadIds: string[]; categories?: string[] };
    return await gmailTools.classifyEmails(
      context.accessToken,
      i.threadIds,
      i.categories,
      context.refreshToken
    );
  },
};

// Tool call history management
function addToolCallToHistory(toolName: string, sessionId: string = 'default') {
  if (!toolCallHistory.has(sessionId)) {
    toolCallHistory.set(sessionId, []);
  }
  
  const history = toolCallHistory.get(sessionId)!;
  const record: ToolCallRecord = {
    toolName,
    timestamp: Date.now(),
    sessionId,
  };
  
  history.push(record);
  
  // Keep only last MAX_HISTORY_LENGTH calls
  if (history.length > MAX_HISTORY_LENGTH) {
    history.shift();
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`📝 Tool History: Added ${toolName} (session: ${sessionId}, total: ${history.length})`);
  }
}

function hasRecentListEvents(sessionId: string = 'default'): boolean {
  const history = toolCallHistory.get(sessionId) || [];
  const now = Date.now();
  
  // Look for list_events call within the validity window
  const recentListEvents = history.find(record => 
    record.toolName === 'list_events' && 
    (now - record.timestamp) <= LIST_EVENTS_VALIDITY_WINDOW
  );
  
  const hasRecent = !!recentListEvents;
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`🔍 Tool History: Checking list_events for session ${sessionId}: ${hasRecent ? 'FOUND' : 'NOT FOUND'}`);
    if (recentListEvents) {
      const ageSeconds = Math.round((now - recentListEvents.timestamp) / 1000);
      console.warn(`📅 Tool History: Last list_events was ${ageSeconds}s ago`);
    }
  }
  
  return hasRecent;
}

// Helper to execute a tool by name with history tracking and enforcement
export async function executeTool(
  toolName: string, 
  input: unknown, 
  context: ToolContext
): Promise<ToolResult> {
  const sessionId = context.sessionId || 'default';
  
  // DELETION SAFETY ENFORCEMENT: Check for recent list_events before delete_event
  if (toolName === 'delete_event') {
    if (!hasRecentListEvents(sessionId)) {
      const friendlyMessage = `📋 Need to check calendar first - will list current events to get valid IDs`;
      
      console.warn(`⚠️ Tool Safety: delete_event requires recent list_events call`);
      
      return {
        success: false,
        error: friendlyMessage,
        requiresListEvents: true, // Special flag for UI handling
        toolName: 'delete_event', // Include tool name for UI batching
      };
    }
  }
  
  // Add this tool call to history BEFORE execution
  addToolCallToHistory(toolName, sessionId);
  
  const toolFunction = toolRegistry[toolName];
  if (!toolFunction) {
    throw new Error(`Tool ${toolName} not found in registry`);
  }
  
  return await toolFunction(input, context);
}

// Export history utilities for debugging
export function getToolCallHistory(sessionId: string = 'default'): ToolCallRecord[] {
  return toolCallHistory.get(sessionId) || [];
}

export function clearToolCallHistory(sessionId: string = 'default'): void {
  toolCallHistory.delete(sessionId);
}