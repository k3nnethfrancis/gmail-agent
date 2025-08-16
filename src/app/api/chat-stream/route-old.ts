import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { createSystemPrompt, tools } from '@/lib/agentConfig';
import { executeTool, type ToolContext } from '@/lib/toolRegistry';

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

// Helper to send SSE message
function sendSSEMessage(controller: ReadableStreamDefaultController, type: string, data: any) {
  const message = `data: ${JSON.stringify({ type, data })}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] 🚀 Chat Stream API: Incoming request`);
  
  try {
    const body = (await request.json()) as Partial<ChatBody>;
    
    if (!body.message || typeof body.message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }
    
    const message = body.message;
    const conversation = Array.isArray(body.conversation) ? body.conversation : [];
    
    // Get authentication tokens
    const tokens = await getTokensFromCookies();
    if (!tokens.accessToken) {
      return new Response('Authentication required', { status: 401 });
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Claude Code style - no initial progress message, start directly with Claude
          
          // Build system prompt and tools (same as main API)
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

IMPORTANT: Continue using tools until the entire user request is satisfied.`;

          // Tool definitions (same as main API)
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
            // Add other tools as needed
          ];

          const messages = [
            ...conversation,
            {
              role: 'user' as const,
              content: message,
            },
          ];

          // Start agentic workflow with streaming
          let currentResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemPrompt,
            tools,
            messages,
          });

          let currentMessages = [...messages];
          let iterationCount = 0;
          const maxIterations = 15;
          let totalToolCalls = 0;
          const maxToolCalls = 50;

          // Tool progress mapping
          const toolProgressMap: Record<string, string> = {
            'list_events': 'Checking your calendar...',
            'create_event': 'Creating calendar event...',
            'update_event': 'Updating calendar event...',
            'delete_event': 'Removing calendar event...',
            'get_freebusy': 'Checking availability...',
            'create_time_block': 'Blocking time for you...',
            'list_threads': 'Reviewing your emails...',
            'classify_emails': 'Organizing your inbox...',
          };

          while (iterationCount < maxIterations && totalToolCalls < maxToolCalls) {
            const currentContentBlocks = currentResponse.content as ContentBlock[];
            const toolCalls = currentContentBlocks.filter(block => block.type === 'tool_use');
            
            // CLAUDE CODE STYLE: First, stream any text content Claude provided
            const textBlocks = currentContentBlocks.filter((block): block is { type: 'text'; text: string } => block.type === 'text');
            if (textBlocks.length > 0) {
              const claudeText = textBlocks.map(block => block.text).join('');
              sendSSEMessage(controller, 'claude_response', claudeText);
            }
            
            if (toolCalls.length === 0) {
              // No more tool calls - workflow complete
              break;
            }
            
            totalToolCalls += toolCalls.length;
            
            const toolResults: Array<{ tool_use_id: string; type: 'tool_result'; content: string }> = [];
            
            for (const block of toolCalls) {
              const { name, input, id } = block as { type: 'tool_use'; name: string; input: unknown; id: string };
              
              // CLAUDE CODE STYLE: Show the tool call with clean display
              const getCleanToolDisplay = (toolName: string, toolInput: unknown) => {
                switch (toolName) {
                  case 'list_events':
                    const opts = (toolInput as any)?.options;
                    return `list_events(timeMin: "${opts?.timeMin?.slice(0, 10) || 'today'}", timeMax: "${opts?.timeMax?.slice(0, 10) || 'week'}")`;
                  case 'create_event':
                    const eventData = (toolInput as any)?.eventData;
                    return `create_event(summary: "${eventData?.summary || 'New Event'}")`;
                  case 'create_time_block':
                    const i = toolInput as any;
                    return `create_time_block(title: "${i?.title}", time: "${i?.startTime?.slice(11, 16) || 'TBD'}")`;
                  default:
                    return `${toolName}(...)`;
                }
              };
              
              sendSSEMessage(controller, 'tool_call', { 
                name, 
                input, 
                id,
                display: getCleanToolDisplay(name, input)
              });
              
              // Small delay to ensure real-time display
              await new Promise(resolve => setTimeout(resolve, 100));
              
              try {
                let result: any;
                
                switch (name) {
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
                  case 'list_events': {
                    const i = (input ?? {}) as { options?: calendarTools.ListEventsOptions };
                    result = await calendarTools.listEvents(
                      tokens.accessToken,
                      i.options ?? {},
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
                  default:
                    throw new Error(`Tool ${name} not implemented in streaming API`);
                }
                
                toolResults.push({
                  tool_use_id: id,
                  type: 'tool_result',
                  content: JSON.stringify(result),
                });

                // CLAUDE CODE STYLE: Show tool result summary
                const resultSummary = result.success 
                  ? (result.events?.length ? `Found ${result.events.length} events` :
                     result.threads?.length ? `Found ${result.threads.length} threads` :
                     result.event ? 'Event created successfully' :
                     'Completed successfully')
                  : 'Failed';
                
                sendSSEMessage(controller, 'tool_result', { 
                  tool: name, 
                  success: result.success,
                  summary: resultSummary,
                  id
                });
                
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                toolResults.push({
                  tool_use_id: id,
                  type: 'tool_result',
                  content: JSON.stringify({ error: errorMessage }),
                });
                
                // CLAUDE CODE STYLE: Show tool error
                sendSSEMessage(controller, 'tool_result', { 
                  tool: name, 
                  success: false,
                  summary: `Error: ${errorMessage}`,
                  id
                });
              }
            }
            
            // Continue conversation with tool results
            currentMessages.push(
              { role: 'assistant', content: currentResponse.content as any },
              { role: 'user', content: toolResults as any }
            );
            
            // Get Claude's next response
            currentResponse = await anthropic.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              system: systemPrompt,
              tools,
              messages: currentMessages,
            });
            
            iterationCount++;
          }

          // Final text response is already sent in the loop above
          // No need to send it again here

          sendSSEMessage(controller, 'done', 'Conversation complete');
          
        } catch (error) {
          sendSSEMessage(controller, 'error', error instanceof Error ? error.message : 'Unknown error');
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${timestamp}] ❌ Chat Stream API error:`, error);
    return new Response(errorMessage, { status: 500 });
  }
}