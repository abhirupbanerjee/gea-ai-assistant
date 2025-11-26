# Context-Aware AI Assistant - Implementation Summary

## Overview
Successfully implemented context-aware AI assistant functionality that enables the bot to understand which GEA Portal page the user is viewing and provide page-specific guidance.

## What Was Implemented

### 1. New Library Files Created (`/lib`)

#### `lib/types.ts`
- **PageContext**: Interface for page context data from GEA Portal API
- **FunctionCallResult**: Interface for function execution results
- **ChatRequest/ChatResponse**: API request/response types
- **FunctionDefinition**: OpenAI function schema types

#### `lib/openai-functions.ts`
- **get_page_context**: Function definition for OpenAI
  - Tells OpenAI when and how to use the function
  - Specifies parameters (route)
  - Provides detailed usage instructions
- **getFunctionDefinitions()**: Returns functions in OpenAI tools format
- **getFunctionByName()**: Helper to retrieve specific functions

#### `lib/function-handlers.ts`
- **handleGetPageContext()**: Fetches page context from GEA Portal API
  - Calls `GET https://gea.abhirup.app/api/content/page-context?route={route}`
  - Validates and normalizes route parameters
  - Includes error handling and logging
  - Caches responses for 5 minutes
- **handleFunctionCall()**: Main router for function execution
- **formatFunctionResult()**: Formats results for OpenAI submission

### 2. Backend Updates

#### `app/api/chat/route.ts`
**Added:**
- Import of function definitions and handlers
- `sourceUrl` parameter extraction from request body
- Function definitions added to OpenAI run creation
- Additional instructions with page context hint
- Polling logic for `requires_action` status
- Function call execution and tool output submission
- Increased timeout from 30 to 60 seconds for function calls

**How it works:**
1. Receives message + optional sourceUrl
2. Creates OpenAI run with tools (functions)
3. If sourceUrl provided, adds hint to use get_page_context
4. Polls run status
5. When status = `requires_action`, executes function calls
6. Submits results back to OpenAI
7. Continues polling until completion
8. Returns assistant's context-aware response

### 3. Frontend Updates

#### `app/page.tsx`
**Added:**
- `sourceUrl` state variable
- useEffect hook to capture source URL on mount
  - **Method 1**: From URL parameter `?source=/feedback`
  - **Method 2**: From `document.referrer` (iframe context)
  - Validates referrer is from GEA Portal domains
- Updated sendMessage to include `sourceUrl` in API request

**No visible UI changes** - operates completely in the background

### 4. Environment Configuration

#### `.env`
**Added:**
```
GEA_PORTAL_URL=https://gea.abhirup.app
```

## How It Works - End to End

### Scenario: User on Feedback Page

```
1. User visits https://gea.abhirup.app/feedback
2. Page embeds AI bot: https://gea-ai-assistant.vercel.app?source=/feedback
3. Bot captures sourceUrl = "/feedback"
4. User asks: "How do I submit feedback?"

5. Frontend sends to backend:
   {
     message: "How do I submit feedback?",
     threadId: "thread_abc...",
     sourceUrl: "/feedback"
   }

6. Backend creates OpenAI run with:
   - tools: [get_page_context function]
   - additional_instructions: "User is on page: /feedback. Use get_page_context..."

7. OpenAI processes request and decides to call function:
   {
     name: "get_page_context",
     arguments: { route: "/feedback" }
   }

8. Backend executes function:
   - Calls handleFunctionCall("get_page_context", { route: "/feedback" })
   - Fetches https://gea.abhirup.app/api/content/page-context?route=/feedback
   - Receives page context with steps, tips, features

9. Backend submits tool output to OpenAI:
   {
     tool_call_id: "call_xyz...",
     output: "{ title: 'Service Feedback Form', steps: [...], tips: [...] }"
   }

10. OpenAI generates context-aware response:
    "To submit feedback on this page:
    1. First, select the government entity from the dropdown
    2. Then, select the specific service you received
    3. Rate your experience on 5 dimensions (1-5 scale)
    ...

    Note: Rating scale is 1 (Poor) to 5 (Excellent), and your feedback is completely anonymous."

11. User receives accurate, page-specific guidance
```

## Technical Details

### Function Calling Flow
1. **requires_action** status triggers function execution
2. Extract tool_calls from run data
3. Execute each function via handleFunctionCall()
4. Format results via formatFunctionResult()
5. Submit tool outputs back to OpenAI
6. Continue polling until completion

### Source URL Capture
- **Priority 1**: URL parameter `?source=/feedback`
- **Priority 2**: document.referrer (if from GEA Portal)
- **Validation**: Only accepts GEA Portal domains
  - gea.abhirup.app
  - gea.gov.gd
  - localhost (for development)

### Caching Strategy
- Page context responses cached for 5 minutes
- Reduces API calls to GEA Portal
- Uses Next.js fetch caching (`next: { revalidate: 300 }`)

## Dependencies Required

### From GEA Portal
- API endpoint: `GET /api/content/page-context?route={route}`
- Response format: PageContext interface
- Must be accessible from Vercel
- CORS must allow Vercel domain

### Environment Variables
```bash
# Existing
OPENAI_ORGANIZATION=org-...
OPENAI_ASSISTANT_ID=asst_...
OPENAI_API_KEY=sk-proj-...

# New
GEA_PORTAL_URL=https://gea.abhirup.app
```

## Testing

### Local Testing
```bash
# Start dev server
npm run dev

# Test with source URL
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What can I do on this page?",
    "sourceUrl": "/feedback"
  }'
```

### Browser Testing
1. Visit `http://localhost:3000?source=/feedback`
2. Ask: "How do I submit feedback?"
3. Check console for source URL capture logs
4. Verify response includes page-specific steps

### Production Testing
1. Deploy to Vercel
2. Ensure GEA_PORTAL_URL env var is set in Vercel
3. Test embedding from GEA Portal
4. Verify function calls in Vercel logs

## Deployment Checklist

- [x] Code implementation complete
- [ ] Test locally with mock source URLs
- [ ] Add GEA_PORTAL_URL to Vercel environment variables
- [ ] Deploy to Vercel
- [ ] Ensure GEA Portal API endpoint is live
- [ ] Test end-to-end from GEA Portal iframe
- [ ] Monitor Vercel logs for function call execution
- [ ] Verify page context is being fetched correctly

## Files Modified/Created

### Created (4 files)
- `/lib/types.ts` - TypeScript interfaces
- `/lib/openai-functions.ts` - Function definitions
- `/lib/function-handlers.ts` - Function execution logic
- `IMPLEMENTATION_SUMMARY.md` - This file

### Modified (3 files)
- `/app/api/chat/route.ts` - Added function calling support
- `/app/page.tsx` - Added source URL capture
- `/.env` - Added GEA_PORTAL_URL

## Key Features

✅ **Context-Aware Responses**: Bot understands current page
✅ **No UI Changes**: Completely invisible to users
✅ **Backward Compatible**: Works without sourceUrl
✅ **Robust Error Handling**: Graceful fallbacks
✅ **Detailed Logging**: Easy debugging
✅ **Caching**: Reduced API calls
✅ **Scalable**: Easy to add more functions

## Next Steps

1. **Add to Vercel**: Set `GEA_PORTAL_URL` environment variable
2. **Test Integration**: Verify with GEA Portal API
3. **Monitor Logs**: Watch for function call executions
4. **Iterate**: Add more functions as needed (e.g., get_user_info, search_knowledge_base)

## Troubleshooting

### Function not being called?
- Check OpenAI Assistant instructions include function usage guidance
- Verify sourceUrl is being captured (check console logs)
- Ensure additional_instructions are being set

### API errors?
- Verify GEA_PORTAL_URL is set correctly
- Check GEA Portal API is accessible from Vercel
- Verify CORS settings on GEA Portal

### Timeout errors?
- Increase maxRetries in route.ts
- Check GEA Portal API response time
- Verify network connectivity

---

**Implementation Date**: November 26, 2025
**Status**: ✅ Complete and ready for deployment
