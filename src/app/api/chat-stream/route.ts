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
function sendSSEMessage(controller: ReadableStreamDefaultController, type: string, data: unknown) {
  const message = `data: ${JSON.stringify({ type, data })}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

// Helper to create clean tool display
function getCleanToolDisplay(toolName: string, toolInput: unknown) {
  switch (toolName) {
    case 'list_events': {
      const opts = toolInput as { options?: { timeMin?: string; timeMax?: string } };
      return `list_events(timeMin: "${opts.options?.timeMin?.slice(0, 10) || 'today'}", timeMax: "${opts.options?.timeMax?.slice(0, 10) || 'week'}")`;
    }
    case 'create_event': {
      const eventData = toolInput as { eventData?: { summary?: string } };
      return `create_event(summary: "${eventData.eventData?.summary || 'New Event'}")`;
    }
    case 'create_time_block': {
      const i = toolInput as { title?: string; startTime?: string };
      return `create_time_block(title: "${i.title}", time: "${i.startTime?.slice(11, 16) || 'TBD'}")`;
    }
    default:
      return `${toolName}(...)`;
  }
}

// Input validation
function validateConversation(conversation: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(conversation)) return [];
  
  return conversation
    .filter((msg): msg is { role: string; content: string } => 
      typeof msg === 'object' && 
      msg !== null && 
      'role' in msg && 
      'content' in msg &&
      typeof msg.content === 'string'
    )
    .filter((msg): msg is { role: 'user' | 'assistant'; content: string } => 
      (msg.role === 'user' || msg.role === 'assistant')
    );
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[${timestamp}] 🚀 Chat Stream API: Incoming request`);
  }
  
  try {
    const body = (await request.json()) as Partial<ChatBody>;
    
    if (!body.message || typeof body.message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }
    
    const message = body.message;
    const conversation = validateConversation(body.conversation);
    
    // Enhanced request logging
    console.warn(`🚀 Chat Stream API: New message received`);
    console.warn(`💬 User Message: "${message}"`);
    console.warn(`📜 Conversation History: ${conversation.length} messages`);
    
    // Get authentication tokens
    const tokens = await getTokensFromCookies();
    if (!tokens.accessToken) {
      return new Response('Authentication required', { status: 401 });
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const systemPrompt = createSystemPrompt();
          
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
          
          // Generate session ID from access token hash for session-based tool history tracking
          const sessionId = tokens.accessToken ? 
            `session_${tokens.accessToken.substring(0, 8)}_${Date.now()}` : 
            'default';
          
          const toolContext: ToolContext = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            sessionId,
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
              
              // Enhanced logging for debugging
              console.warn(`🔧 Tool Call: ${name}`);
              console.warn(`📋 Input:`, JSON.stringify(input, null, 2));
              console.warn(`🆔 Tool ID: ${id}`);

              // CLAUDE CODE STYLE: Show the tool call with clean display
              sendSSEMessage(controller, 'tool_call', { 
                name, 
                input, 
                id,
                display: getCleanToolDisplay(name, input)
              });
              
              // Small delay to ensure real-time display
              await new Promise(resolve => setTimeout(resolve, 100));
              
              try {
                const result = await executeTool(name, input, toolContext);
                
                // Enhanced result logging
                console.warn(`✅ Tool Result for ${name}:`, JSON.stringify(result, null, 2));
                
                toolResults.push({
                  tool_use_id: id,
                  type: 'tool_result',
                  content: JSON.stringify(result),
                });

                // CLAUDE CODE STYLE: Show tool result summary with special handling
                let resultSummary: string;
                let displaySuccess = result.success;
                
                if (result.success) {
                  resultSummary = result.events?.length ? `Found ${result.events.length} events` :
                                 result.threads?.length ? `Found ${result.threads.length} threads` :
                                 result.event ? 'Event created successfully' :
                                 'Completed successfully';
                } else if ((result as any).requiresListEvents) {
                  // Special case: deletion safety - show as guidance, not failure
                  resultSummary = `📋 Need to check calendar first`;
                  displaySuccess = true; // Don't show as error in UI
                } else {
                  resultSummary = 'Failed';
                }
                
                sendSSEMessage(controller, 'tool_result', { 
                  tool: name, 
                  success: displaySuccess,
                  summary: resultSummary,
                  id
                });
                
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                
                // Enhanced error logging
                console.error(`❌ Tool Error for ${name}:`, error);
                console.error(`📋 Failed Input:`, JSON.stringify(input, null, 2));
                
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
            
            // Small delay between iterations to reduce CPU spikes
            await new Promise(resolve => setTimeout(resolve, 50));
            
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