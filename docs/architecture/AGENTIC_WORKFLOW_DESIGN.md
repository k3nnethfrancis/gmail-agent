# Agentic Workflow Design Guide
**A Research-Based Approach to Multi-Step AI Task Execution**

*Date: August 16, 2025*  
*Context: Calendar Assistant + Inbox Concierge Project*

## Overview

This document outlines research-based patterns for designing agentic workflows that enable AI systems to autonomously complete complex, multi-step tasks. Based on analysis of Anthropic's Claude Code SDK, traditional API patterns, and real-world implementation challenges.

## Problem Statement

**Traditional Chat Pattern:**
```
User → Claude → Tool Calls → Response to User
```
❌ **Result:** AI stops after first tool execution, requiring manual continuation

**Required Agentic Pattern:**
```
User → Claude → Tool Calls → Claude Continues → More Tool Calls → Final Response
```
✅ **Result:** AI completes entire workflow autonomously

## Core Principles of Agentic Design

### 1. **Autonomous Task Completion**
- AI should continue working until the entire user request is fulfilled
- Each tool execution should inform the next decision
- Clear completion criteria must be established

### 2. **Context Preservation**
- Maintain conversation state across multiple tool call rounds
- Track progress and intermediate results
- Handle failures and retry logic gracefully

### 3. **Safety and Control**
- Maximum iteration limits to prevent infinite loops
- Progress monitoring and user visibility
- Graceful degradation on errors or timeouts

### 4. **Declarative Task Definition**
- Users specify *what* they want, not *how* to achieve it
- AI orchestrates the specific tool calls and sequence
- Complex workflows emerge from simple natural language requests

## Architecture Patterns

### Pattern 1: Linear Workflow Loop
**Best For:** Sequential tasks with clear dependencies

```typescript
async function executeLinearWorkflow(userRequest: string, tools: Tool[]) {
  const messages = [{ role: 'user', content: userRequest }];
  const maxIterations = 10;
  let iteration = 0;
  
  while (iteration < maxIterations) {
    const response = await claude.create({
      messages,
      tools,
      max_tokens: 4096
    });
    
    // Check if Claude made tool calls
    const toolCalls = extractToolCalls(response);
    if (toolCalls.length === 0) {
      // No more work needed - Claude is done
      return response;
    }
    
    // Execute tools and continue conversation
    const toolResults = await executeTools(toolCalls);
    messages.push(
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults }
    );
    
    iteration++;
  }
  
  throw new Error('Workflow exceeded maximum iterations');
}
```

### Pattern 2: State-Driven Workflow
**Best For:** Complex workflows with branching logic

```typescript
interface WorkflowState {
  phase: 'planning' | 'execution' | 'verification' | 'complete';
  completedTasks: string[];
  pendingTasks: string[];
  context: Record<string, any>;
}

async function executeStateDrivenWorkflow(userRequest: string) {
  let state: WorkflowState = {
    phase: 'planning',
    completedTasks: [],
    pendingTasks: [],
    context: {}
  };
  
  while (state.phase !== 'complete') {
    const systemPrompt = buildSystemPrompt(state);
    const response = await claude.create({
      system: systemPrompt,
      messages: [...conversationHistory],
      tools: getToolsForPhase(state.phase)
    });
    
    state = updateStateFromResponse(state, response);
    
    if (hasToolCalls(response)) {
      const results = await executeTools(response);
      state = updateStateFromToolResults(state, results);
    }
  }
  
  return state;
}
```

### Pattern 3: Parallel Task Orchestration
**Best For:** Independent tasks that can run concurrently

```typescript
async function executeParallelWorkflow(userRequest: string) {
  // Phase 1: Planning - Let Claude break down the work
  const planResponse = await claude.create({
    system: "Break down this request into independent parallel tasks",
    messages: [{ role: 'user', content: userRequest }]
  });
  
  const taskList = extractTaskList(planResponse);
  
  // Phase 2: Parallel Execution
  const taskPromises = taskList.map(task => 
    executeLinearWorkflow(task, availableTools)
  );
  
  const results = await Promise.allSettled(taskPromises);
  
  // Phase 3: Synthesis
  const synthesisResponse = await claude.create({
    system: "Combine these task results into a cohesive response",
    messages: [
      { role: 'user', content: userRequest },
      { role: 'assistant', content: JSON.stringify(results) }
    ]
  });
  
  return synthesisResponse;
}
```

## Implementation Strategies

### Strategy 1: Conversation Continuation Pattern
**How it works:** Keep extending the conversation until Claude stops making tool calls

```typescript
// Anthropic SDK Implementation
export async function agenticChatHandler(request: UserRequest) {
  const conversation = [
    { role: 'user', content: request.message }
  ];
  
  let attempts = 0;
  const maxAttempts = 15; // Prevent infinite loops
  
  while (attempts < maxAttempts) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: buildSystemPrompt(),
      tools: availableTools,
      messages: conversation
    });
    
    // Extract tool calls from response
    const toolCalls = response.content.filter(
      block => block.type === 'tool_use'
    );
    
    if (toolCalls.length === 0) {
      // Claude is done - no more tool calls needed
      return extractFinalResponse(response);
    }
    
    // Execute tools and continue conversation
    conversation.push({ role: 'assistant', content: response.content });
    
    const toolResults = await Promise.all(
      toolCalls.map(call => executeTool(call))
    );
    
    conversation.push({
      role: 'user',
      content: toolResults
    });
    
    attempts++;
  }
  
  throw new AgenticWorkflowError('Maximum iterations reached');
}
```

### Strategy 2: Goal-Oriented System Prompts
**Key insight:** The system prompt should emphasize completion of the entire workflow

```typescript
function buildAgenticSystemPrompt(currentDate: string) {
  return `You are a helpful assistant that can manage calendars and emails through Google APIs.

CURRENT DATE AND TIME: ${currentDate}

IMPORTANT AGENTIC BEHAVIOR:
- When given a multi-step task, complete ALL steps before responding to the user
- Use available tools multiple times as needed to fulfill the entire request
- Don't stop after the first tool call - continue until the full workflow is complete
- For complex requests like "schedule meetings + block time + write emails", do all parts

AVAILABLE CAPABILITIES:
- Calendar: list_events, create_event, update_event, delete_event, get_freebusy, create_time_block
- Gmail: list_threads, classify_emails, send_email, create_label, add_label

WORKFLOW COMPLETION CRITERIA:
- All requested calendar operations are complete
- All requested email operations are complete  
- User has been provided with comprehensive results
- Any requested drafts or summaries have been generated

Continue using tools until the entire user request is satisfied.`;
}
```

### Strategy 3: Progress Tracking and User Feedback
**Pattern:** Show progress during long-running workflows

```typescript
interface WorkflowProgress {
  totalSteps: number;
  completedSteps: string[];
  currentStep: string;
  estimatedTimeRemaining?: number;
}

async function executeWithProgress(request: string) {
  const progress: WorkflowProgress = {
    totalSteps: 0,
    completedSteps: [],
    currentStep: 'Planning workflow...'
  };
  
  // Send progress updates to client
  const updateProgress = (update: Partial<WorkflowProgress>) => {
    Object.assign(progress, update);
    sendProgressUpdate(progress);
  };
  
  // Phase 1: Planning
  updateProgress({ currentStep: 'Analyzing request and planning steps...' });
  const plan = await generateWorkflowPlan(request);
  updateProgress({ 
    totalSteps: plan.steps.length,
    currentStep: plan.steps[0]
  });
  
  // Phase 2: Execution with progress tracking
  for (const [index, step] of plan.steps.entries()) {
    updateProgress({ currentStep: step });
    
    await executeWorkflowStep(step);
    
    updateProgress({ 
      completedSteps: [...progress.completedSteps, step],
      currentStep: index < plan.steps.length - 1 ? plan.steps[index + 1] : 'Completing...'
    });
  }
  
  updateProgress({ currentStep: 'Workflow complete!' });
}
```

## Error Handling and Safety

### Graceful Degradation Patterns

```typescript
class AgenticWorkflowManager {
  private maxIterations = 20;
  private maxToolCalls = 50;
  private timeoutMs = 300000; // 5 minutes
  
  async execute(request: string): Promise<WorkflowResult> {
    const startTime = Date.now();
    let toolCallCount = 0;
    
    try {
      return await this.executeWithSafetyChecks(request, {
        onIteration: (iteration) => {
          if (Date.now() - startTime > this.timeoutMs) {
            throw new WorkflowTimeoutError();
          }
        },
        onToolCall: () => {
          toolCallCount++;
          if (toolCallCount > this.maxToolCalls) {
            throw new TooManyToolCallsError();
          }
        }
      });
    } catch (error) {
      return this.handleWorkflowError(error, request);
    }
  }
  
  private async handleWorkflowError(
    error: Error, 
    originalRequest: string
  ): Promise<WorkflowResult> {
    if (error instanceof WorkflowTimeoutError) {
      return {
        success: false,
        message: "The workflow is taking longer than expected. I've completed what I could so far.",
        partialResults: this.getPartialResults()
      };
    }
    
    if (error instanceof TooManyToolCallsError) {
      return {
        success: false,
        message: "This task requires too many operations. Let me suggest breaking it into smaller parts.",
        suggestions: await this.generateSimplifiedTasks(originalRequest)
      };
    }
    
    // Generic error fallback
    return {
      success: false,
      message: `I encountered an error: ${error.message}. Please try rephrasing your request.`,
      error: error.message
    };
  }
}
```

## Real-World Implementation Examples

### Example 1: Calendar Assistant Workflow
**User Request:** *"I have three meetings I need to schedule with Joe, Dan, and Sally. I really want to block my mornings off to work out, so can you write me an email draft I can share with each of them?"*

**Agentic Workflow Steps:**
1. **Planning Phase:** Analyze request → Identify 4 main tasks
2. **Time Blocking:** Create workout blocks for next week (7-9 AM)
3. **Availability Check:** Use `get_freebusy` to find open afternoon slots  
4. **Meeting Creation:** Schedule 3 separate 1-hour meetings
5. **Email Generation:** Draft personalized emails with meeting details
6. **Synthesis:** Provide summary with calendar links and email drafts

**Implementation:**
```typescript
// This would be our enhanced /api/chat route
async function handleCalendarAssistantRequest(request: string) {
  const systemPrompt = `You are a calendar assistant. For complex scheduling requests:
  1. First create any requested time blocks
  2. Check availability for new meetings  
  3. Schedule all requested meetings
  4. Generate any requested emails or communications
  5. Provide a complete summary
  
  Continue using tools until ALL parts of the request are complete.`;
  
  return await executeAgenticWorkflow(request, {
    systemPrompt,
    tools: [...calendarTools, ...emailTools],
    maxIterations: 15
  });
}
```

### Example 2: Inbox Concierge Workflow  
**User Request:** *"Organize my last 200 emails and create custom buckets for newsletters and work projects."*

**Agentic Workflow Steps:**
1. **Data Collection:** Retrieve last 200 email threads
2. **Analysis:** Analyze email patterns and content types
3. **Custom Bucket Creation:** Create labels for newsletters and work projects
4. **Classification:** Classify all emails into appropriate buckets
5. **Organization:** Apply labels and organize inbox
6. **Reporting:** Provide summary of organization results

## Testing Agentic Workflows

### Unit Testing Patterns
```typescript
describe('Agentic Workflow', () => {
  it('should complete multi-step calendar workflow', async () => {
    const mockRequest = "Schedule meeting with John and block workout time";
    
    const result = await executeAgenticWorkflow(mockRequest, {
      tools: mockCalendarTools,
      maxIterations: 5
    });
    
    expect(result.completedTasks).toContain('create_time_block');
    expect(result.completedTasks).toContain('create_event');
    expect(result.success).toBe(true);
  });
  
  it('should handle tool failures gracefully', async () => {
    const mockRequest = "Schedule impossible meeting";
    mockCalendarTools.create_event.mockRejectedValue(new Error('Conflict'));
    
    const result = await executeAgenticWorkflow(mockRequest);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Conflict');
  });
});
```

### Integration Testing
```typescript
describe('Real API Integration', () => {
  it('should execute full calendar workflow end-to-end', async () => {
    const testRequest = "Block 9-10 AM tomorrow for exercise";
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: testRequest }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    // Verify actual calendar event was created
    const events = await listEvents(accessToken, {
      timeMin: tomorrow.toISOString(),
      timeMax: dayAfterTomorrow.toISOString()
    });
    
    expect(events.events).toContainObject({
      summary: expect.stringContaining('exercise')
    });
  });
});
```

## Performance Considerations

### Optimization Strategies

1. **Tool Call Batching**
   ```typescript
   // Instead of sequential tool calls, batch when possible
   const parallelResults = await Promise.all([
     createEvent(eventData1),
     createEvent(eventData2), 
     createEvent(eventData3)
   ]);
   ```

2. **Intelligent Caching**
   ```typescript
   // Cache availability data to avoid repeated API calls
   const cache = new Map();
   
   async function getAvailabilityWithCache(timeRange: TimeRange) {
     const key = `${timeRange.start}-${timeRange.end}`;
     if (cache.has(key)) return cache.get(key);
     
     const result = await getFreeBusy(timeRange);
     cache.set(key, result);
     return result;
   }
   ```

3. **Progressive Enhancement**
   ```typescript
   // Start with essential tasks, add nice-to-have features
   const essentialTasks = ['create_meeting', 'send_invite'];
   const enhancementTasks = ['add_calendar_description', 'set_reminders'];
   
   await executeTaskList(essentialTasks);
   await executeTaskList(enhancementTasks, { failSilently: true });
   ```

## Monitoring and Observability

### Workflow Metrics
```typescript
interface WorkflowMetrics {
  totalDuration: number;
  toolCallCount: number;
  iterationCount: number;
  successRate: number;
  commonFailurePoints: string[];
}

class WorkflowMonitor {
  track(workflow: AgenticWorkflow) {
    const startTime = performance.now();
    
    workflow.on('toolCall', (tool) => {
      this.metrics.toolCallCount++;
      console.log(`[WORKFLOW] Tool called: ${tool.name}`);
    });
    
    workflow.on('iteration', (iteration) => {
      this.metrics.iterationCount++;
      console.log(`[WORKFLOW] Iteration ${iteration} complete`);
    });
    
    workflow.on('complete', () => {
      this.metrics.totalDuration = performance.now() - startTime;
      this.logMetrics();
    });
  }
}
```

## Best Practices Summary

### ✅ Do's
- **Clear Completion Criteria:** Define when the workflow should stop
- **Progressive Complexity:** Start simple, add sophistication gradually  
- **Graceful Degradation:** Handle failures without breaking entire workflow
- **User Feedback:** Show progress for long-running tasks
- **Safety Limits:** Maximum iterations, timeouts, tool call limits
- **Context Preservation:** Maintain conversation state across tool calls

### ❌ Don'ts  
- **Infinite Loops:** Always have maximum iteration limits
- **Silent Failures:** Always inform user of partial completion
- **Synchronous Blocking:** Use async patterns for tool execution
- **Assumption-Based Logic:** Verify tool results before proceeding
- **Monolithic Workflows:** Break complex tasks into manageable steps

## Implementation Roadmap

### Phase 1: Basic Agentic Loop (Current Need)
- [ ] Implement conversation continuation pattern
- [ ] Add agentic system prompts  
- [ ] Test multi-step calendar workflows
- [ ] Add basic safety limits

### Phase 2: Enhanced Workflow Management
- [ ] Add progress tracking and user feedback
- [ ] Implement parallel task execution
- [ ] Add intelligent error recovery
- [ ] Performance optimization

### Phase 3: Advanced Orchestration  
- [ ] State-driven workflow management
- [ ] Custom workflow definitions
- [ ] Advanced monitoring and analytics
- [ ] Multi-agent coordination

---

**Next Steps:** Implement Phase 1 patterns in our Calendar Assistant to enable complete autonomous execution of complex scheduling workflows.

*This document will be updated as we implement and learn from real-world agentic workflow patterns.*