import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import * as calendarTools from '@/tools/calendar';
import * as gmailTools from '@/tools/gmail';

// Type definitions
type ContentBlock = 
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: string; [k: string]: unknown };

type ChatBody = {
  message: string;
  conversation?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Helper to get tokens from cookies
async function getTokensFromCookies() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get('google_access_token')?.value,
    refreshToken: cookieStore.get('google_refresh_token')?.value,
  };
}


export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] 🚀 Chat API: Incoming request`);
  
  try {
    const body = (await request.json()) as Partial<ChatBody>;
    
    if (!body.message || typeof body.message !== 'string') {
      console.warn(`[${timestamp}] ❌ No message provided`);
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    const message = body.message;
    const conversation = Array.isArray(body.conversation) ? body.conversation : [];
    
    console.warn(`[${timestamp}] 📝 User message:`, message);
    console.warn(`[${timestamp}] 💬 Conversation length:`, conversation.length);

    // Get authentication tokens
    const tokens = await getTokensFromCookies();
    console.warn(`[${timestamp}] 🔐 Auth tokens:`, {
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken,
      accessTokenStart: process.env.NODE_ENV !== 'production' 
        ? (tokens.accessToken?.substring(0, 10) ?? 'none') + '...'
        : '[redacted]',
    });
    
    if (!tokens.accessToken) {
      console.warn(`[${timestamp}] ❌ No access token found`);
      return NextResponse.json(
        { error: 'Authentication required. Please login with Google.' },
        { status: 401 }
      );
    }

    // Create tool definitions for Claude
    const tools = [
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
        description: 'Delete a calendar event',
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
    ];

    // Build conversation history for Claude
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
    
    const systemPrompt = `You are a helpful assistant that can manage calendars and emails through Google APIs.

CURRENT DATE AND TIME: ${dateString} at ${timeString}

IMPORTANT AGENTIC BEHAVIOR:
- When given a multi-step task, complete ALL steps before responding to the user
- Use available tools multiple times as needed to fulfill the entire request
- Don't stop after the first tool call - continue until the full workflow is complete
- For complex requests like "schedule meetings + block time + write emails", do all parts

AVAILABLE TOOLS:
- Calendar: list_events, create_event, update_event, delete_event, get_freebusy, create_time_block
- Gmail: list_threads, classify_emails, send_email, create_label, add_label, archive_thread

WORKFLOW COMPLETION CRITERIA:
- All requested calendar operations are complete
- All requested email operations are complete  
- User has been provided with comprehensive results
- Any requested drafts or summaries have been generated

IMPORTANT: Continue using tools until the entire user request is satisfied. When listing events, always use appropriate date ranges based on the current date above.`;

    const messages = [
      ...conversation,
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Call Claude with tools
    console.warn(`[${timestamp}] 🤖 Calling Claude with ${tools.length} tools available`);
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });

    const contentBlocks = response.content as ContentBlock[];
    console.warn(`[${timestamp}] 🤖 Claude response received:`, {
      contentBlocks: contentBlocks.length,
      hasToolUse: contentBlocks.some(block => block.type === 'tool_use'),
    });

    // Agentic workflow loop - continue until Claude stops making tool calls
    let currentResponse = response;
    let currentMessages = [...messages];
    let iterationCount = 0;
    const maxIterations = 15; // Safety limit to prevent infinite loops
    let totalToolCalls = 0;
    const maxToolCalls = 50; // Additional safety limit
    
    while (iterationCount < maxIterations && totalToolCalls < maxToolCalls) {
      const currentContentBlocks = currentResponse.content as ContentBlock[];
      const toolCalls = currentContentBlocks.filter(block => block.type === 'tool_use');
      
      if (toolCalls.length === 0) {
        // No more tool calls - Claude is done with the workflow
        console.warn(`[${timestamp}] ✅ Agentic workflow complete after ${iterationCount} iterations and ${totalToolCalls} tool calls`);
        break;
      }
      
      console.warn(`[${timestamp}] 🔧 Agentic iteration ${iterationCount + 1}: Processing ${toolCalls.length} tool calls...`);
      totalToolCalls += toolCalls.length;
      
      const toolResults: Array<{ tool_use_id: string; type: 'tool_result'; content: string }> = [];
      
      for (const block of toolCalls) {
        const { name, input, id } = block as { type: 'tool_use'; name: string; input: unknown; id: string };
        console.warn(`[${timestamp}] 🛠️ Calling tool: ${name}`);
        
        try {
          let result:
            | { success?: boolean; events?: Array<unknown>; threads?: Array<unknown> }
            | unknown;
          
          switch (name) {
            case 'list_events': {
              const i = (input ?? {}) as { options?: calendarTools.ListEventsOptions };
              result = await calendarTools.listEvents(
                tokens.accessToken,
                i.options ?? {},
                tokens.refreshToken
              );
              break;
            }
            case 'create_event': {
              const i = (input ?? {}) as { eventData: calendarTools.CalendarEvent; calendarId?: string };
              result = await calendarTools.createEvent(
                tokens.accessToken,
                i.eventData,
                i.calendarId ?? 'primary',
                tokens.refreshToken
              );
              break;
            }
            case 'list_threads': {
              const i = (input ?? {}) as { options?: gmailTools.ListThreadsOptions };
              result = await gmailTools.listThreads(
                tokens.accessToken,
                i.options ?? {},
                tokens.refreshToken
              );
              break;
            }
            case 'classify_emails': {
              const i = (input ?? {}) as { threadIds: string[]; categories?: string[] };
              result = await gmailTools.classifyEmails(
                tokens.accessToken,
                i.threadIds,
                i.categories,
                tokens.refreshToken
              );
              break;
            }
            case 'update_event': {
              const i = (input ?? {}) as { eventId: string; eventData: Partial<calendarTools.CalendarEvent>; calendarId?: string };
              result = await calendarTools.updateEvent(
                tokens.accessToken,
                i.eventId,
                i.eventData,
                i.calendarId ?? 'primary',
                tokens.refreshToken
              );
              break;
            }
            case 'delete_event': {
              const i = (input ?? {}) as { eventId: string; calendarId?: string };
              result = await calendarTools.deleteEvent(
                tokens.accessToken,
                i.eventId,
                i.calendarId ?? 'primary',
                tokens.refreshToken
              );
              break;
            }
            case 'get_freebusy': {
              const i = (input ?? {}) as { timeMin: string; timeMax: string; calendarIds: string[] };
              result = await calendarTools.getFreeBusy(
                tokens.accessToken,
                i.timeMin,
                i.timeMax,
                i.calendarIds,
                tokens.refreshToken
              );
              break;
            }
            case 'create_time_block': {
              const i = (input ?? {}) as { startTime: string; endTime: string; title: string; description?: string; calendarId?: string };
              result = await calendarTools.createTimeBlock(
                tokens.accessToken,
                i.startTime,
                i.endTime,
                i.title,
                i.description,
                i.calendarId ?? 'primary',
                tokens.refreshToken
              );
              break;
            }
            default:
              throw new Error(`Unknown tool: ${name}`);
          }
          
          const success = (result as { success?: boolean }).success;
          const eventsLen = (result as { events?: Array<unknown> }).events?.length;
          const threadsLen = (result as { threads?: Array<unknown> }).threads?.length;
          console.warn(`[${timestamp}] ✅ Tool ${name} succeeded:`, {
            success,
            dataLength: eventsLen ?? threadsLen ?? 'N/A',
          });
          
          toolResults.push({
            tool_use_id: id,
            type: 'tool_result',
            content: JSON.stringify(result),
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`[${timestamp}] ❌ Tool ${name} failed:`, errorMessage);
          toolResults.push({
            tool_use_id: id,
            type: 'tool_result',
            content: JSON.stringify({ error: errorMessage }),
          });
        }
      }
      
      // Continue the conversation with tool results
      currentMessages.push(
        { role: 'assistant', content: currentResponse.content as any },
        { role: 'user', content: toolResults as any }
      );
      
      // Get Claude's next response
      console.warn(`[${timestamp}] 🤖 Getting Claude's next response with ${toolResults.length} tool results`);
      currentResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: currentMessages,
      });
      
      iterationCount++;
    }
    
    // Safety check for limits
    if (iterationCount >= maxIterations) {
      console.warn(`[${timestamp}] ⚠️ Workflow reached maximum iterations (${maxIterations})`);
    }
    if (totalToolCalls >= maxToolCalls) {
      console.warn(`[${timestamp}] ⚠️ Workflow reached maximum tool calls (${maxToolCalls})`);
    }
    
    const finalResponse = currentResponse;

    // Handle Claude 4 refusal stop reason
    if (finalResponse.stop_reason === 'refusal') {
      console.warn(`[${timestamp}] 🚫 Claude refused the request`);
      return NextResponse.json({
        response: "I'm not able to help with that request. Please try asking something else about your calendar or emails.",
        conversation: [
          ...conversation,
          { role: 'user', content: message },
          { role: 'assistant', content: "I'm not able to help with that request. Please try asking something else about your calendar or emails." },
        ],
      });
    }

    // Extract text response
    const finalContentBlocks = finalResponse.content as ContentBlock[];
    const textContent = finalContentBlocks
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map(block => block.text)
      .join('');

    console.warn(`[${timestamp}] ✅ Chat API success - Response length: ${textContent.length} chars, stop_reason: ${finalResponse.stop_reason}`);

    return NextResponse.json({
      response: textContent,
      conversation: [
        ...conversation,
        { role: 'user', content: message },
        { role: 'assistant', content: textContent },
      ],
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${timestamp}] ❌ Chat API error:`, error);
    return NextResponse.json(
      { error: 'Failed to process chat message', details: errorMessage },
      { status: 500 }
    );
  }
}