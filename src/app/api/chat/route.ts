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
  conversation?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
};

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Helper to get tokens from cookies
function getTokensFromCookies() {
  const cookieStore = cookies();
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
    const tokens = getTokensFromCookies();
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
          type: 'object',
          properties: {
            options: {
              type: 'object',
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
          type: 'object',
          properties: {
            eventData: {
              type: 'object',
              properties: {
                summary: { type: 'string', description: 'Event title' },
                description: { type: 'string', description: 'Event description' },
                location: { type: 'string', description: 'Event location' },
                start: {
                  type: 'object',
                  properties: {
                    dateTime: { type: 'string', description: 'Start time (ISO format)' },
                    timeZone: { type: 'string', description: 'Timezone' },
                  },
                  required: ['dateTime'],
                },
                end: {
                  type: 'object',
                  properties: {
                    dateTime: { type: 'string', description: 'End time (ISO format)' },
                    timeZone: { type: 'string', description: 'Timezone' },
                  },
                  required: ['dateTime'],
                },
                attendees: {
                  type: 'array',
                  items: {
                    type: 'object',
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
          type: 'object',
          properties: {
            options: {
              type: 'object',
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
          type: 'object',
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
      // TODO(human): Add missing tool definitions for updateEvent, deleteEvent, getFreeBusy, and createTimeBlock
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
        
        You have access to tools for:
        - Calendar: listing events, creating events, updating events
        - Gmail: listing emails, classifying emails, sending emails
        
        When listing events, always use appropriate date ranges based on the current date above.
        For "today" requests, use the current date.
        For "this week" requests, use the current week range.`;

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

    // Handle tool calls
    let finalResponse = response;
    
    if (contentBlocks.some(block => block.type === 'tool_use')) {
      console.warn(`[${timestamp}] 🔧 Processing tool calls...`);
      const toolResults: Array<{ tool_use_id: string; type: 'tool_result'; content: string }> = [];
      
      for (const block of contentBlocks) {
        if (block.type === 'tool_use') {
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
      }
      
      // Get final response from Claude with tool results
      if (toolResults.length > 0) {
        console.warn(`[${timestamp}] 🤖 Getting final response from Claude with ${toolResults.length} tool results`);
        finalResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [
            ...messages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: toolResults },
          ],
        });
        console.warn(`[${timestamp}] 🤖 Final response received from Claude`);
      }
    }

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