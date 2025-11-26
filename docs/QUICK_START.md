# Quick Start Guide - Context-Aware AI v2

## 🚀 Quick Deployment Steps

### 1. Update OpenAI Assistant (5 minutes)

1. Go to https://platform.openai.com/assistants
2. Select assistant: `asst_lhyQ42RyOBwVfSOrB3HukqHn`
3. Copy the entire "System Instructions" section from [OPENAI_ASSISTANT_SYSTEM_PROMPT.md](./OPENAI_ASSISTANT_SYSTEM_PROMPT.md)
4. Paste into "Instructions" field
5. Click "Save"

### 2. Update Vercel Environment Variable (3 minutes)

1. Go to Vercel Dashboard
2. Select `gea-ai-assistant` project
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name**: `NEXT_PUBLIC_ALLOWED_ORIGINS`
   - **Value**: `https://gea.abhirup.app,https://gea.gov.gd,http://localhost:3000,http://localhost:3001`
5. Click "Save"
6. Redeploy (or it will auto-deploy on next commit)

### 3. Deploy Changes (Automatic)

```bash
git add .
git commit -m "Add context-aware AI v2 with postMessage integration"
git push origin main
```

Vercel will automatically deploy.

---

## 🧪 Quick Local Test

```bash
# Install dependencies (if needed)
npm install

# Start dev server
npm run dev

# Open browser
http://localhost:3000?source=/feedback

# Open browser console and simulate context update
window.postMessage({
  type: 'CONTEXT_UPDATE',
  context: {
    route: '/feedback',
    timestamp: Date.now(),
    changeType: 'navigation',
    modal: {
      type: 'view-details',
      title: 'Test Modal',
      data: { test: 'data' }
    }
  }
}, '*');
```

**Expected Result**:
- Green "Connected" badge appears
- Header shows context summary
- Console logs: `[PageContext] Updated: navigation`

---

## 📋 GEA Portal Integration Checklist

The GEA Portal needs to send postMessage when:

- [ ] User navigates to a new page
- [ ] Modal opens (with entity data)
- [ ] Modal closes
- [ ] User starts editing
- [ ] User cancels editing
- [ ] User switches tabs
- [ ] User progresses through form steps

**Example Code**:

```typescript
// Get reference to AI assistant iframe
const aiIframe = document.getElementById('ai-assistant-iframe') as HTMLIFrameElement;

// Send context update
aiIframe.contentWindow?.postMessage({
  type: 'CONTEXT_UPDATE',
  context: {
    route: window.location.pathname,
    timestamp: Date.now(),
    changeType: 'modal', // or 'navigation', 'edit', 'tab', 'form'
    modal: {
      type: 'view-grievance',
      title: 'Grievance Details',
      entityType: 'grievance',
      entityId: 'GRV-001',
      entityName: 'Poor service',
      data: {
        status: 'Open',
        priority: 'High'
      }
    }
  }
}, 'https://gea-ai-assistant.vercel.app');
```

---

## 🔍 Quick Verification

### After Deployment

1. **Check Environment Variable**:
   ```bash
   # In Vercel, this should show in deployment logs
   NEXT_PUBLIC_ALLOWED_ORIGINS is set
   ```

2. **Check OpenAI Assistant**:
   - Instructions should mention "Context Awareness"
   - Instructions should mention modal, edit, tab, form contexts

3. **Test Live Site**:
   - Visit: https://gea-ai-assistant.vercel.app
   - Should load without errors
   - Check browser console for no errors

### With GEA Portal

1. **Open AI Assistant from GEA Portal**
2. **Check Header**:
   - Should show "Connected" badge (green)
   - Should show context summary (e.g., "📍 /feedback")

3. **Open a Modal**:
   - Badge should stay connected
   - Context summary should update (e.g., "📋 Grievance Details")

4. **Ask AI**:
   - "What should I do with this?"
   - Should reference specific modal content
   - Should provide context-specific advice

---

## 🐛 Quick Troubleshooting

### "Not Connected" in Header
**Problem**: Context not being received

**Solutions**:
1. Check `NEXT_PUBLIC_ALLOWED_ORIGINS` is set in Vercel
2. Check GEA Portal is sending postMessage
3. Check browser console for origin validation errors
4. Verify iframe URL matches allowed origins

### Generic AI Responses
**Problem**: AI not using context

**Solutions**:
1. Check OpenAI Assistant instructions are updated
2. Check browser console for context being sent
3. Check `/api/chat` logs for `hasContext: true`
4. Verify `contextDescription` is in API request body

### Thread Not Persisting
**Problem**: Conversation resets on refresh

**Solutions**:
1. Check browser console for localStorage errors
2. Check `usePageContext` hook is being used
3. Clear browser cache and test again
4. Verify `threadId` is in localStorage

---

## 📖 Full Documentation

- **System Prompt**: [OPENAI_ASSISTANT_SYSTEM_PROMPT.md](./OPENAI_ASSISTANT_SYSTEM_PROMPT.md)
- **Function Calling**: [FUNCTION_CALLING_GUIDE.md](./FUNCTION_CALLING_GUIDE.md)
- **Implementation**: [IMPLEMENTATION_SUMMARY_V2.md](./IMPLEMENTATION_SUMMARY_V2.md)

---

## 🎯 Success Indicators

✅ Green "Connected" badge visible
✅ Context summary updates on navigation
✅ Modal content reflected in AI responses
✅ Thread persists across refreshes
✅ No console errors
✅ AI provides specific, context-aware help

---

## 🆘 Support

**For Issues**:
1. Check browser console logs
2. Check Vercel deployment logs
3. Review documentation in `/docs`
4. Check server API logs at `/api/chat`

**Key Log Prefixes**:
- `[PageContext]` - postMessage handling
- `[Function]` - Function call execution
- `[Chat]` - API requests

---

**Version**: v2.0
**Last Updated**: 2025-01-26
**Status**: Ready for Production
