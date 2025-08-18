# AI Architecture

## Overview

The Calendar Assistant + Inbox Concierge uses Claude Sonnet 4 as its core AI engine, implementing sophisticated conversation patterns, tool calling capabilities, and intelligent email classification. The AI architecture enables natural language interactions while maintaining precise control over calendar and email operations.

## Core AI Components

### 1. Claude Sonnet 4 Integration
- **Model**: `claude-sonnet-4-20250514`
- **Provider**: Anthropic SDK
- **Capabilities**: Tool calling, streaming responses, structured outputs
- **Context Window**: Large context for complex multi-step operations

### 2. Conversation Engine
- **Interface**: Streaming chat interface with real-time responses
- **State Management**: Persistent conversation history via Zustand
- **Tool Integration**: Seamless function calling within conversations
- **Error Handling**: Graceful degradation with user feedback

### 3. Email Classification System
- **Approach**: Pure LLM-based classification with training examples
- **Learning**: User feedback loop through training examples
- **Accuracy**: Improved through user-marked examples
- **Automation**: Automatic classification on email sync

## Agent Conversation Architecture

### Chat Flow Pattern

```
User Input → Claude Processing → Tool Calling → Result Integration → Response
     ↑                                                                  ↓
     └──────────────── Streaming Response Display ←───────────────────────┘
```

### Streaming Implementation

The chat system uses streaming responses for real-time interaction:

```typescript
// Frontend: Real-time response display
useEffect(() => {
  if (!reader) return;
  
  const readStream = async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      // Process and display chunk immediately
    }
  };
}, [reader]);
```

### Tool Calling Integration

Claude can call tools seamlessly within conversations:

**Available Tools:**
- `searchEmails()` - Find emails by criteria
- `getCalendarEvents()` - Retrieve calendar information  
- `createCalendarEvent()` - Schedule new events
- `updateCalendarEvent()` - Modify existing events
- `deleteCalendarEvent()` - Remove events
- `classifyEmails()` - Trigger email classification
- `getEmailStats()` - Retrieve inbox statistics

**Tool Call Flow:**
```
User: "Schedule a meeting with John tomorrow at 2pm"
Claude: [Tool Call] createCalendarEvent({
  summary: "Meeting with John",
  start: "2025-08-19T14:00:00",
  attendees: ["john@example.com"]
})
System: [Tool Result] Event created successfully
Claude: "I've scheduled your meeting with John for tomorrow at 2pm..."
```

## Email Classification System

### Classification Pipeline

```
New Email → Content Analysis → LLM Classification → Category Assignment → Training Integration
     ↓              ↓                ↓                    ↓                    ↓
Gmail Sync → Extract Features → Claude Analysis → Tag Creation → User Feedback
```

### Pure LLM Approach

The system uses Claude Sonnet 4 for intelligent email categorization:

**Input Processing:**
```typescript
const classifyEmail = async (email: EmailThread) => {
  const prompt = createClassificationPrompt(email, trainingExamples, existingCategories);
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000
  });
  return parseClassificationResponse(response);
};
```

**Classification Context:**
- Email subject, sender, and content
- Existing category patterns
- User training examples
- Historical classification patterns

### Training Examples System

The AI learns from user feedback through a sophisticated training system:

#### Training Data Collection
```sql
-- Training examples tracked via assignedBy field
SELECT e.*, t.name as category 
FROM emails e 
JOIN email_tags et ON e.id = et.email_id 
JOIN tags t ON et.tag_id = t.id 
WHERE et.assigned_by = 'user'  -- User-marked examples
```

#### Learning Integration
```typescript
const getTrainingExamples = async (): Promise<TrainingExample[]> => {
  // Fetch user-verified classifications
  const examples = await tagService.getTrainingExamples();
  
  return examples.map(example => ({
    email: { subject: example.subject, snippet: example.snippet },
    category: example.tagName,
    confidence: 'high' // User-verified = high confidence
  }));
};
```

#### Training Example UI
- **Star Button**: Mark emails as training examples
- **Visual Feedback**: Filled yellow star for training examples  
- **Management Widget**: View all training examples when in inbox
- **Categories**: Training examples organized by category

### Classification Prompt Engineering

**System Prompt Structure:**
```
You are an expert email classifier. Analyze emails and assign appropriate categories.

TRAINING EXAMPLES:
[Dynamic list of user-verified classifications]

EXISTING CATEGORIES:
[Current category list with descriptions]

CLASSIFICATION RULES:
1. Use existing categories when possible
2. Create new categories only when necessary
3. Provide confidence scores
4. Include reasoning

Email to classify:
[Email content]
```

**Response Format:**
```json
{
  "category": "Category Name",
  "confidence": 0.95,
  "reasoning": "This email is about...",
  "isNewCategory": false
}
```

## Agentic Workflow Patterns

### Multi-Step Task Execution

The system implements agentic patterns for complex tasks:

**Example: "Organize my inbox and schedule time for important emails"**

```
Step 1: Analyze inbox status
  └── Tool: getEmailStats()
Step 2: Identify unclassified emails  
  └── Tool: searchEmails({ unclassified: true })
Step 3: Run classification
  └── Tool: classifyEmails()
Step 4: Identify high-priority categories
  └── Tool: getEmailStats() [updated]
Step 5: Suggest calendar blocks
  └── Tool: createCalendarEvent() [for each priority category]
Step 6: Provide summary and next steps
```

### Context Maintenance

**Conversation Context:**
- Previous messages and responses
- Current task state and progress
- Available tools and their results
- User preferences and patterns

**System Context:**
- Current date/time
- Calendar availability
- Email status and counts
- Recent user actions

### Error Handling and Recovery

**Graceful Degradation:**
```typescript
try {
  const result = await executeTool(toolCall);
  return formatSuccessResponse(result);
} catch (error) {
  // Log error for debugging
  console.error('Tool execution failed:', error);
  
  // Provide helpful user message
  return `I encountered an issue with ${toolCall.name}. Let me try a different approach...`;
}
```

## Advanced AI Features

### Intelligent Email Insights

**Pattern Recognition:**
- Identify sender importance patterns
- Detect email priority indicators
- Recognize routine vs. important communications
- Learn user response patterns

**Smart Suggestions:**
- Optimal classification categories
- Calendar scheduling recommendations
- Email organization strategies
- Productivity improvements

### Contextual Understanding

**Temporal Awareness:**
- Current date and time context
- Calendar availability consideration
- Email recency and urgency
- Deadline and schedule awareness

**Relationship Mapping:**
- Sender importance scoring
- Communication frequency analysis
- Professional vs. personal context
- Project and topic clustering

### Continuous Learning

**Feedback Loops:**
1. **User Corrections**: Manual category changes update training data
2. **Star Markings**: Training examples improve classification accuracy  
3. **Usage Patterns**: Learn from user email management behavior
4. **Success Metrics**: Track classification accuracy over time

**Adaptation Mechanisms:**
- Training examples bias future classifications
- User corrections adjust category patterns
- Frequency patterns influence priority scoring
- Context clues improve automation accuracy

## Performance and Optimization

### AI Request Optimization

**Batch Processing:**
```typescript
// Process multiple emails in single classification request
const classifyBatch = async (emails: EmailThread[]) => {
  const batchPrompt = createBatchClassificationPrompt(emails);
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: batchPrompt }]
  });
  return parseBatchResponse(response, emails);
};
```

**Context Reuse:**
- Maintain conversation context for related requests
- Cache training examples to avoid repeated fetches
- Reuse category information across classifications

### Response Time Optimization

**Streaming Responses:**
- Real-time chunk processing
- Progressive response building
- Immediate user feedback

**Predictive Loading:**
- Pre-load common tool responses
- Cache frequent email patterns
- Anticipate likely user requests

## Security and Privacy

### AI Data Handling

**Data Minimization:**
- Only necessary email content sent to Claude
- Personal identifiers stripped when possible
- Conversation history managed securely

**Privacy Protection:**
- No email content stored by Anthropic
- Local training data management
- User control over data sharing

### Model Security

**Input Validation:**
- Sanitize user inputs before AI processing
- Validate tool call parameters
- Prevent prompt injection attacks

**Output Verification:**
- Validate AI tool calls before execution
- Confirm user intent for sensitive operations
- Provide clear action summaries

## Monitoring and Analytics

### AI Performance Metrics

**Classification Accuracy:**
- Track user corrections to AI categories
- Monitor training example effectiveness
- Measure classification confidence trends

**User Satisfaction:**
- Conversation completion rates
- Tool call success rates
- User feedback patterns

**System Health:**
- API response times
- Error rates and types
- Resource utilization patterns

### Continuous Improvement

**Model Performance:**
- A/B testing of prompt variations
- Training example quality assessment
- Classification accuracy improvement tracking

**User Experience:**
- Conversation flow optimization
- Tool integration refinement
- Interface responsiveness improvements

This AI architecture provides a sophisticated, user-centered approach to email and calendar management while maintaining transparency, accuracy, and continuous learning capabilities.