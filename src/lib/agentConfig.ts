// Shared agent configuration for Claude Sonnet 4

export function createSystemPrompt() {
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeString = currentDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short'
  });

  return `You are a helpful assistant that can manage calendars and emails through Google APIs.

CURRENT DATE AND TIME: ${dateString} at ${timeString}

IMPORTANT AGENTIC BEHAVIOR:
- When given a multi-step task, complete ALL steps before responding to the user
- Use available tools multiple times as needed to fulfill the entire request
- Don't stop after the first tool call - continue until the full workflow is complete
- For complex requests like "schedule meetings + block time + write emails", do all parts

AVAILABLE TOOLS:
- Calendar: list_events, create_event, update_event, delete_event, get_freebusy, create_time_block
- Gmail: list_threads, classify_emails, send_email, create_label, add_label, archive_thread

DELETION SAFETY PROTOCOL:
- NEVER delete events without explicit user confirmation
- ALWAYS call list_events FIRST to get current, valid event IDs
- NEVER use made-up, assumed, or remembered event IDs
- When user requests to "cancel" or "delete" events:
  1. MANDATORY: Call list_events to get real event IDs and current details
  2. Present event details (title, time, attendees) to user using data from list_events
  3. Ask "Should I delete [event details]? (yes/no)"
  4. Only call delete_event with the EXACT event IDs from the list_events response
- For bulk deletions, confirm each event individually or ask for blanket approval
- If user says "cancel all meetings on Friday", list them first, then ask for confirmation
- CRITICAL: Event IDs must come directly from list_events API calls, never from memory or assumptions

WORKFLOW COMPLETION CRITERIA:
- All requested calendar operations are complete
- All requested email operations are complete  
- User has been provided with comprehensive results
- Any requested drafts or summaries have been generated
- Any deletions have been properly confirmed by the user

IMPORTANT: Continue using tools until the entire user request is satisfied. When listing events, always use appropriate date ranges based on the current date above.`;
}

export const tools = [
  {
    name: 'list_events',
    description: 'List calendar events with optional filtering by date range',
    input_schema: {
      type: 'object' as const,
      properties: {
        options: {
          type: 'object' as const,
          properties: {
            timeMin: { type: 'string', description: 'Start time (ISO format)' },
            timeMax: { type: 'string', description: 'End time (ISO format)' },
            maxResults: { type: 'number', description: 'Maximum events to return' },
            calendarId: { type: 'string', description: 'Calendar ID (default: primary)' },
          },
        },
      },
    },
  },
  {
    name: 'create_event',
    description: 'Create a new calendar event',
    input_schema: {
      type: 'object' as const,
      properties: {
        eventData: {
          type: 'object' as const,
          properties: {
            summary: { type: 'string', description: 'Event title' },
            description: { type: 'string', description: 'Event description' },
            location: { type: 'string', description: 'Event location' },
            start: {
              type: 'object' as const,
              properties: {
                dateTime: { type: 'string', description: 'Start time (ISO format)' },
                timeZone: { type: 'string', description: 'Timezone' },
              },
              required: ['dateTime'],
            },
            end: {
              type: 'object' as const,
              properties: {
                dateTime: { type: 'string', description: 'End time (ISO format)' },
                timeZone: { type: 'string', description: 'Timezone' },
              },
              required: ['dateTime'],
            },
            attendees: {
              type: 'array',
              items: {
                type: 'object' as const,
                properties: {
                  email: { type: 'string', description: 'Attendee email' },
                },
              },
            },
          },
          required: ['summary', 'start', 'end'],
        },
        calendarId: { type: 'string', description: 'Calendar ID (default: primary)' },
      },
      required: ['eventData'],
    },
  },
  {
    name: 'update_event',
    description: 'Update an existing calendar event',
    input_schema: {
      type: 'object' as const,
      properties: {
        eventId: { type: 'string', description: 'Event ID to update' },
        eventData: {
          type: 'object' as const,
          properties: {
            summary: { type: 'string', description: 'Event title' },
            description: { type: 'string', description: 'Event description' },
            location: { type: 'string', description: 'Event location' },
            start: {
              type: 'object' as const,
              properties: {
                dateTime: { type: 'string', description: 'Start time (ISO format)' },
                timeZone: { type: 'string', description: 'Timezone' },
              },
            },
            end: {
              type: 'object' as const,
              properties: {
                dateTime: { type: 'string', description: 'End time (ISO format)' },
                timeZone: { type: 'string', description: 'Timezone' },
              },
            },
            attendees: {
              type: 'array',
              items: {
                type: 'object' as const,
                properties: {
                  email: { type: 'string', description: 'Attendee email' },
                },
              },
            },
          },
        },
        calendarId: { type: 'string', description: 'Calendar ID (default: primary)' },
      },
      required: ['eventId', 'eventData'],
    },
  },
  {
    name: 'delete_event',
    description: 'Delete a calendar event - ONLY use after explicit user confirmation',
    input_schema: {
      type: 'object' as const,
      properties: {
        eventId: { type: 'string', description: 'Event ID to delete' },
        calendarId: { type: 'string', description: 'Calendar ID (default: primary)' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'get_freebusy',
    description: 'Check availability across calendars for scheduling',
    input_schema: {
      type: 'object' as const,
      properties: {
        timeMin: { type: 'string', description: 'Start time (ISO format)' },
        timeMax: { type: 'string', description: 'End time (ISO format)' },
        calendarIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of calendar IDs to check',
        },
      },
      required: ['timeMin', 'timeMax', 'calendarIds'],
    },
  },
  {
    name: 'create_time_block',
    description: 'Create a time block for focus work, workouts, or personal time',
    input_schema: {
      type: 'object' as const,
      properties: {
        startTime: { type: 'string', description: 'Start time (ISO format)' },
        endTime: { type: 'string', description: 'End time (ISO format)' },
        title: { type: 'string', description: 'Time block title (e.g., "Workout", "Focus Time")' },
        description: { type: 'string', description: 'Optional description' },
        calendarId: { type: 'string', description: 'Calendar ID (default: primary)' },
      },
      required: ['startTime', 'endTime', 'title'],
    },
  },
  {
    name: 'list_threads',
    description: 'List email threads with optional filtering',
    input_schema: {
      type: 'object' as const,
      properties: {
        options: {
          type: 'object' as const,
          properties: {
            maxResults: { type: 'number', description: 'Maximum threads to return' },
            labelIds: { type: 'array', items: { type: 'string' }, description: 'Label IDs to filter by' },
            q: { type: 'string', description: 'Search query' },
          },
        },
      },
    },
  },
  {
    name: 'classify_emails',
    description: 'Classify email threads into categories',
    input_schema: {
      type: 'object' as const,
      properties: {
        threadIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of thread IDs to classify',
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Categories to classify into',
        },
      },
      required: ['threadIds'],
    },
  },
];