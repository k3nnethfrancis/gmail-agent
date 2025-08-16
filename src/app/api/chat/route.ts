import { NextRequest, NextResponse } from 'next/server';
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

// Helper to get tokens from cookies (async to satisfy current Next types)
async function getTokensFromCookies() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get('google_access_token')?.value,
    refreshToken: cookieStore.get('google_refresh_token')?.value,
  };
}

function validateConversation(conversation: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(conversation)) return [];
  return conversation
    .filter((msg): msg is { role: string; content: string } =>
      typeof msg === 'object' && msg !== null && 'role' in msg && 'content' in msg && typeof (msg as any).content === 'string'
    )
    .filter((msg): msg is { role: 'user' | 'assistant'; content: string } =>
      (msg as any).role === 'user' || (msg as any).role === 'assistant'
    );
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
    const conversation = validateConversation(body.conversation);
    
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

    // Tool definitions for Claude are imported from agentConfig

    // Build conversation history for Claude
    const systemPrompt = createSystemPrompt();

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
    
    // Track progress for user feedback
    const progressUpdates: string[] = [];
    const addProgressUpdate = (update: string) => {
      progressUpdates.push(`⏳ ${update}`);
      console.warn(`[${timestamp}] 📋 Progress: ${update}`);
    };
    
    // TODO(human): Implement real-time progress streaming here
    // We need to send intermediate progress messages to the frontend
    // while the agentic workflow is still running, rather than waiting
    // until the entire workflow completes.
    
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

        // Add user-friendly progress update
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
        const progressMessage = toolProgressMap[name] || `Processing ${name}...`;
        addProgressUpdate(progressMessage);

        try {
          const toolContext: ToolContext = { accessToken: tokens.accessToken!, refreshToken: tokens.refreshToken };
          const result = await executeTool(name, input, toolContext);

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
      
      // Small delay between iterations to reduce CPU spikes
      await new Promise(resolve => setTimeout(resolve, 50));

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

    // Add progress summary if this was a multi-step workflow
    let enhancedResponse = textContent;
    if (progressUpdates.length > 1) {
      const progressSummary = progressUpdates.map(update => `${update} ✅`).join('\n');
      enhancedResponse = `**Workflow Progress:**\n${progressSummary}\n\n---\n\n${textContent}`;
    }

    console.warn(`[${timestamp}] ✅ Chat API success - Response length: ${enhancedResponse.length} chars, ${progressUpdates.length} progress updates, stop_reason: ${finalResponse.stop_reason}`);

    return NextResponse.json({
      response: enhancedResponse,
      conversation: [
        ...conversation,
        { role: 'user', content: message },
        { role: 'assistant', content: enhancedResponse },
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