# Function Calling Guide

## Overview

This document provides examples of how the OpenAI Assistant function calling works in the GEA AI Assistant, including request/response formats and integration with the GEA Portal.

---

## Architecture Flow

```
┌─────────────────┐
│   GEA Portal    │
│  (Parent Page)  │
└────────┬────────┘
         │ postMessage
         │ CONTEXT_UPDATE
         ▼
┌─────────────────────────────────────────────────┐
│           AI Assistant (This App)               │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  usePageContext Hook                     │  │
│  │  - Receives postMessage                  │  │
│  │  - Validates origin                      │  │
│  │  - Builds context description            │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│                 ▼                               │
│  ┌──────────────────────────────────────────┐  │
│  │  /api/chat Route                         │  │
│  │  - Receives message + context            │  │
│  │  - Calls OpenAI with additional_inst     │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│                 ▼                               │
│  ┌──────────────────────────────────────────┐  │
│  │  OpenAI Assistant                        │  │
│  │  - Processes request                     │  │
│  │  - May call get_page_context function   │  │
│  └──────────────┬───────────────────────────┘  │
│                 │ (if requires_action)          │
│                 ▼                               │
│  ┌──────────────────────────────────────────┐  │
│  │  Function Handler                        │  │
│  │  - Fetches from GEA Portal API           │  │
│  │  - Returns result to OpenAI              │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│                 ▼                               │
│  ┌──────────────────────────────────────────┐  │
│  │  OpenAI generates final response         │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Function Definition

### get_page_context Function

**File**: `lib/openai-functions.ts`

```typescript
{
  name: 'get_page_context',
  description: `Get detailed information about a specific page in the GEA Portal.

Use this function when:
- User asks what they can do on the current page
- User needs help with a form or process on the page
- User asks how to complete a task
- User seems confused about where they are or what to do
- You need to provide step-by-step guidance for the current page
- User asks about features available on the page

The function returns:
- Page title and purpose
- Target audience (public, staff, admin)
- Step-by-step instructions (if applicable)
- Helpful tips and warnings
- Available features

Always use this function to provide accurate, page-specific guidance rather than generic responses.`,
  parameters: {
    type: 'object',
    properties: {
      route: {
        type: 'string',
        description: 'The page route/path from the GEA Portal, e.g., "/feedback", "/admin/analytics", "/grievance", "/ticket-status"',
      },
    },
    required: ['route'],
  },
}
```

---

## Sample Request/Response Flows

### Scenario 1: User Asks About Current Page (No Function Call)

#### 1. User Input
```
User: "Hello"
```

#### 2. Context from postMessage
```json
{
  "route": "/feedback",
  "timestamp": 1705312456789,
  "changeType": "navigation"
}
```

#### 3. Built Context Description
```
Current page: /feedback
```

#### 4. API Request to /api/chat
```json
{
  "message": "Hello",
  "threadId": null,
  "contextDescription": "Current page: /feedback",
  "sourceUrl": "/feedback"
}
```

#### 5. OpenAI Run Creation
```json
{
  "assistant_id": "asst_xxx",
  "tools": [
    {
      "type": "function",
      "function": { /* get_page_context definition */ }
    }
  ],
  "additional_instructions": "## CURRENT USER CONTEXT\n\nCurrent page: /feedback\n\n---\n\nUse this context to provide relevant, specific assistance..."
}
```

#### 6. OpenAI Response (No Function Call)
```json
{
  "id": "msg_xxx",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": {
        "value": "Hello! I see you're on the Feedback page. I can help you submit feedback for government services. Would you like guidance on any step?"
      }
    }
  ]
}
```

#### 7. Final Response to User
```
"Hello! I see you're on the Feedback page. I can help you submit feedback for government services. Would you like guidance on any step?"
```

---

### Scenario 2: User Asks for Page Details (Function Call Required)

#### 1. User Input
```
User: "What can I do on this page?"
```

#### 2. Context from postMessage
```json
{
  "route": "/admin/analytics",
  "timestamp": 1705312456789,
  "changeType": "navigation"
}
```

#### 3. Built Context Description
```
Current page: /admin/analytics
```

#### 4. API Request to /api/chat
```json
{
  "message": "What can I do on this page?",
  "threadId": "thread_abc123",
  "contextDescription": "Current page: /admin/analytics",
  "sourceUrl": "/admin/analytics"
}
```

#### 5. OpenAI Run Status: requires_action
```json
{
  "id": "run_xyz789",
  "status": "requires_action",
  "required_action": {
    "type": "submit_tool_outputs",
    "submit_tool_outputs": {
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "get_page_context",
            "arguments": "{\"route\":\"/admin/analytics\"}"
          }
        }
      ]
    }
  }
}
```

#### 6. Function Handler Execution
**Function**: `handleFunctionCall('get_page_context', { route: '/admin/analytics' })`

**API Call**: `GET https://gea.abhirup.app/api/content/page-context?route=%2Fadmin%2Fanalytics`

**API Response**:
```json
{
  "route": "/admin/analytics",
  "title": "Analytics Dashboard",
  "purpose": "View comprehensive analytics and insights about feedback, grievances, and service performance across the GEA Portal.",
  "audience": "staff",
  "steps": null,
  "tips": [
    "Use the date range selector to filter data by time period",
    "Click on any chart to drill down into details",
    "Export reports using the Export button in the top right"
  ],
  "features": [
    "Feedback submission trends over time",
    "Grievance status distribution",
    "Entity and service performance metrics",
    "Average resolution times",
    "User engagement statistics"
  ],
  "autoGenerated": false,
  "lastUpdated": "2025-01-15T10:30:00Z"
}
```

#### 7. Tool Output Submission
```json
{
  "tool_outputs": [
    {
      "tool_call_id": "call_abc123",
      "output": "{\n  \"route\": \"/admin/analytics\",\n  \"title\": \"Analytics Dashboard\",\n  \"purpose\": \"View comprehensive analytics...\",\n  ...\n}"
    }
  ]
}
```

#### 8. OpenAI Final Response
```json
{
  "id": "msg_def456",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": {
        "value": "You're on the **Analytics Dashboard**. This page provides comprehensive analytics and insights about feedback, grievances, and service performance.\n\n**Available Features:**\n- Feedback submission trends over time\n- Grievance status distribution\n- Entity and service performance metrics\n- Average resolution times\n- User engagement statistics\n\n**Tips:**\n- Use the date range selector to filter data by time period\n- Click on any chart to drill down into details\n- Export reports using the Export button in the top right\n\nWhat specific metric or insight would you like to explore?"
      }
    }
  ]
}
```

#### 9. Final Response to User
```
You're on the **Analytics Dashboard**. This page provides comprehensive analytics and insights about feedback, grievances, and service performance.

**Available Features:**
- Feedback submission trends over time
- Grievance status distribution
- Entity and service performance metrics
- Average resolution times
- User engagement statistics

**Tips:**
- Use the date range selector to filter data by time period
- Click on any chart to drill down into details
- Export reports using the Export button in the top right

What specific metric or insight would you like to explore?
```

---

### Scenario 3: Modal Open with Rich Context (No Function Call Needed)

#### 1. User Input
```
User: "What should I do with this?"
```

#### 2. Context from postMessage
```json
{
  "route": "/admin/grievances",
  "timestamp": 1705312456789,
  "changeType": "modal",
  "modal": {
    "type": "view-grievance",
    "title": "Grievance Details",
    "entityType": "grievance",
    "entityId": "GRV-2025-001",
    "entityName": "Poor service at passport office",
    "data": {
      "status": "In Progress",
      "priority": "High",
      "category": "Service Quality",
      "assignedTo": "John Doe",
      "createdAt": "2025-01-15",
      "slaDeadline": "2025-01-17 14:30"
    }
  },
  "tab": {
    "tabGroup": "grievance-filters",
    "activeTab": "in-progress",
    "availableTabs": ["all", "open", "in-progress", "resolved", "closed"]
  }
}
```

#### 3. Built Context Description
```
Current page: /admin/grievances

Modal open: view-grievance - "Grievance Details"
Viewing grievance: Poor service at passport office
Modal data:
  - status: In Progress
  - priority: High
  - category: Service Quality
  - assignedTo: John Doe
  - createdAt: 2025-01-15
  - slaDeadline: 2025-01-17 14:30

Active tab: "in-progress" in grievance-filters
Available tabs: all, open, in-progress, resolved, closed
```

#### 4. API Request to /api/chat
```json
{
  "message": "What should I do with this?",
  "threadId": "thread_abc123",
  "contextDescription": "Current page: /admin/grievances\n\nModal open: view-grievance...",
  "sourceUrl": "/admin/grievances"
}
```

#### 5. OpenAI Response (No Function Call - Context is Sufficient)
```json
{
  "id": "msg_ghi789",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": {
        "value": "This grievance **\"Poor service at passport office\"** (GRV-2025-001) is currently **In Progress** with **High** priority, assigned to **John Doe**.\n\n**Important**: The SLA deadline is **2025-01-17 14:30** - that's in 2 days!\n\n**Recommended next steps:**\n\n1. **Add Progress Note**: Document what's been done so far\n2. **Contact Citizen**: If you need more information, update status to \"Waiting\"\n3. **Escalate**: If it can't be resolved before SLA, escalate to supervisor\n4. **Resolve**: If issue is fixed, update status to \"Resolved\" and add resolution notes\n\nWhich action would you like to take?"
      }
    }
  ]
}
```

#### 6. Final Response to User
```
This grievance **"Poor service at passport office"** (GRV-2025-001) is currently **In Progress** with **High** priority, assigned to **John Doe**.

**Important**: The SLA deadline is **2025-01-17 14:30** - that's in 2 days!

**Recommended next steps:**

1. **Add Progress Note**: Document what's been done so far
2. **Contact Citizen**: If you need more information, update status to "Waiting"
3. **Escalate**: If it can't be resolved before SLA, escalate to supervisor
4. **Resolve**: If issue is fixed, update status to "Resolved" and add resolution notes

Which action would you like to take?
```

---

## Code Implementation

### Function Handler (`lib/function-handlers.ts`)

```typescript
async function handleGetPageContext(args: { route: string }): Promise<FunctionCallResult> {
  try {
    const { route } = args;

    if (!route) {
      return {
        success: false,
        error: 'Route parameter is required',
      };
    }

    // Normalize route
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;

    // Build API URL
    const url = `${GEA_PORTAL_API}/api/content/page-context?route=${encodeURIComponent(normalizedRoute)}`;

    console.log(`[Function] Fetching page context for: ${normalizedRoute}`);

    // Fetch from GEA Portal API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 5 minutes
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`[Function] API error: ${response.status}`);
      return {
        success: false,
        error: `Failed to fetch page context: HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    console.log(`[Function] Successfully fetched context for: ${data.title}`);

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('[Function] Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to fetch page context',
    };
  }
}
```

### Chat API Route Handling (`app/api/chat/route.ts`)

```typescript
// Handle function calls when run status is requires_action
if (status === 'requires_action') {
  const toolCalls = runData.required_action?.submit_tool_outputs?.tool_calls || [];
  console.log(`Processing ${toolCalls.length} function call(s)`);

  // Execute all function calls in parallel
  const toolOutputs = await Promise.all(
    toolCalls.map(async (toolCall: any) => {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log(`Executing function: ${functionName}`, functionArgs);

      // Execute the function
      const result = await handleFunctionCall(functionName, functionArgs);
      const output = formatFunctionResult(result);

      console.log(`Function ${functionName} result:`, result.success ? 'success' : 'failed');

      return {
        tool_call_id: toolCall.id,
        output,
      };
    })
  );

  // Submit tool outputs back to OpenAI
  await axios.post(
    `https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}/submit_tool_outputs`,
    { tool_outputs: toolOutputs },
    { headers }
  );
}
```

---

## Testing Function Calls

### Manual Testing via Browser Console

```javascript
// Test local function handler
const testFunction = async () => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'What can I do on the feedback page?',
      threadId: null,
      contextDescription: 'Current page: /feedback',
      sourceUrl: '/feedback'
    })
  });

  const data = await response.json();
  console.log('Response:', data);
};

testFunction();
```

### Testing GEA Portal API Directly

```bash
# Test the page context endpoint
curl "https://gea.abhirup.app/api/content/page-context?route=%2Ffeedback" \
  -H "Accept: application/json"
```

**Expected Response:**
```json
{
  "route": "/feedback",
  "title": "Submit Feedback",
  "purpose": "Submit feedback about government services",
  "audience": "public",
  "steps": [
    "Select the government entity",
    "Select the service you received",
    "Provide your ratings",
    "Add comments (optional)",
    "Submit feedback"
  ],
  "tips": [
    "You can submit feedback anonymously",
    "Be specific about your experience",
    "Constructive feedback helps improve services"
  ],
  "features": ["Anonymous submission", "Rating system", "Comment field"],
  "autoGenerated": false,
  "lastUpdated": "2025-01-15T08:00:00Z"
}
```

---

## Debugging Function Calls

### Enable Detailed Logging

Check server logs for these messages:

```
[Function] Handling function call: get_page_context
[Function] Arguments: { "route": "/feedback" }
[Function] Fetching page context for: /feedback
[Function] API URL: https://gea.abhirup.app/api/content/page-context?route=%2Ffeedback
[Function] Successfully fetched context for: Submit Feedback
[Function] Function get_page_context result: success
```

### Common Issues

1. **Function not being called**
   - Check if function is properly registered in `getFunctionDefinitions()`
   - Verify function description is clear enough for AI to understand when to use it
   - Check OpenAI Assistant configuration

2. **Function call fails**
   - Check GEA_PORTAL_URL environment variable
   - Verify GEA Portal API is accessible
   - Check route parameter format (should start with `/`)

3. **Response is generic despite function call**
   - Check if tool outputs were properly submitted
   - Verify OpenAI assistant instructions emphasize using function results
   - Check for errors in formatFunctionResult

---

## Adding New Functions

To add a new function (e.g., `submit_feedback`):

### 1. Define Function (`lib/openai-functions.ts`)

```typescript
{
  name: 'submit_feedback',
  description: 'Submit feedback on behalf of the user when they explicitly ask you to submit feedback.',
  parameters: {
    type: 'object',
    properties: {
      entityId: {
        type: 'string',
        description: 'The entity ID (e.g., "ENT-001")',
      },
      serviceId: {
        type: 'string',
        description: 'The service ID (e.g., "SRV-045")',
      },
      rating: {
        type: 'number',
        description: 'Rating from 1-5',
      },
      comments: {
        type: 'string',
        description: 'User comments (optional)',
      },
    },
    required: ['entityId', 'serviceId', 'rating'],
  },
}
```

### 2. Implement Handler (`lib/function-handlers.ts`)

```typescript
async function handleSubmitFeedback(args: {
  entityId: string;
  serviceId: string;
  rating: number;
  comments?: string;
}): Promise<FunctionCallResult> {
  try {
    const response = await fetch(`${GEA_PORTAL_API}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity: args.entityId,
        service: args.serviceId,
        rating: args.rating,
        comments: args.comments || '',
        source: 'ai-assistant',
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to submit feedback: HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### 3. Add to Router (`lib/function-handlers.ts`)

```typescript
export async function handleFunctionCall(
  functionName: string,
  functionArgs: any
): Promise<FunctionCallResult> {
  switch (functionName) {
    case 'get_page_context':
      return handleGetPageContext(functionArgs);

    case 'submit_feedback':
      return handleSubmitFeedback(functionArgs);

    default:
      return {
        success: false,
        error: `Unknown function: ${functionName}`,
      };
  }
}
```

---

## Best Practices

1. **Keep Functions Read-Only (for now)**
   - Current implementation only has `get_page_context` which is read-only
   - This is safer and doesn't require authentication
   - For write operations (submit, update, delete), implement proper authentication first

2. **Clear Function Descriptions**
   - Be very specific about when the AI should call the function
   - Include examples in the description
   - Explain what the function returns

3. **Error Handling**
   - Always return `{ success: boolean, data?: any, error?: string }`
   - Log errors for debugging
   - Provide user-friendly error messages

4. **Caching**
   - Use Next.js `revalidate` for static content
   - Don't cache dynamic user-specific data
   - Current implementation caches page context for 5 minutes

5. **Testing**
   - Test function calls independently
   - Test with various parameter combinations
   - Test error scenarios (invalid route, API down, etc.)

---

## Summary

The function calling system allows the AI Assistant to:
- Fetch static page information from the GEA Portal API
- Provide detailed, page-specific guidance
- Potentially execute actions (future enhancement)

The system is designed to be:
- **Secure**: Origin validation, read-only functions
- **Reliable**: Error handling, caching, retries
- **Context-Aware**: Combines static function data with dynamic postMessage context
- **Extensible**: Easy to add new functions following the same pattern
