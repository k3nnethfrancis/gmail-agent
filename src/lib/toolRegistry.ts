// Typed tool registry for Claude agent tool execution

import * as calendarTools from '@/tools/calendar';
import * as gmailTools from '@/tools/gmail';

export interface ToolContext {
  accessToken: string;
  refreshToken?: string;
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

// Helper to execute a tool by name
export async function executeTool(
  toolName: string, 
  input: unknown, 
  context: ToolContext
): Promise<ToolResult> {
  const toolFunction = toolRegistry[toolName];
  if (!toolFunction) {
    throw new Error(`Tool ${toolName} not found in registry`);
  }
  return await toolFunction(input, context);
}