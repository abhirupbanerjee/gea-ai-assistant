# OpenAI Assistant Setup Guide

## Step-by-Step Setup Instructions

### Step 1: Access OpenAI Platform

1. Go to [https://platform.openai.com/assistants](https://platform.openai.com/assistants)
2. Sign in with your OpenAI account
3. Locate your assistant: `asst_lhyQ42RyOBwVfSOrB3HukqHn`

---

### Step 2: Update System Instructions

1. Click on your assistant to open settings
2. Scroll to the **"Instructions"** section
3. **Delete all existing content**
4. **Copy the entire content** from [`OPENAI_SYSTEM_PROMPT_FINAL.md`](./OPENAI_SYSTEM_PROMPT_FINAL.md)
5. **Paste** into the Instructions field
6. **Do not click Save yet** - continue to Step 3

---

### Step 3: Configure Function

#### Option A: Via Web Interface (Recommended)

1. Scroll to the **"Functions"** section
2. Click **"+ Add Function"**
3. Fill in the form with these exact values:

**Name:**
```
get_page_context
```

**Description:**
```
Get detailed static information about a specific page in the GEA Portal. Use this function when the user asks what they can do on the current page, needs help with a form or process, asks how to complete a task, seems confused about where they are, or when you need to provide step-by-step guidance. The function returns page title, purpose, target audience (public/staff/admin), step-by-step instructions (if applicable), helpful tips and warnings, and available features. Always use this function to provide accurate, page-specific guidance rather than generic responses.
```

**Parameters (JSON):**
```json
{
  "type": "object",
  "properties": {
    "route": {
      "type": "string",
      "description": "The page route/path from the GEA Portal (e.g. '/feedback', '/admin/analytics', '/grievance', '/ticket-status', '/admin/master/entities')"
    }
  },
  "required": ["route"]
}
```

4. Leave **"Strict"** unchecked (false)
5. Click **"Save"** or **"Add Function"**

#### Option B: Via JSON Import (If Available)

1. Click **"Import Function"** or **"JSON Mode"**
2. Copy the entire content from [`OPENAI_FUNCTION_DEFINITION.json`](./OPENAI_FUNCTION_DEFINITION.json)
3. Paste and save

---

### Step 4: Configure Model and Settings

1. **Model**: Select `gpt-4-turbo-preview` or `gpt-4o` (recommended for best context handling)
2. **Temperature**: `0.7` (balanced between creativity and consistency)
3. **Top P**: `1.0` (default)
4. **Code Interpreter**: ❌ Disabled (not needed)
5. **File Search**: ✅ Enabled (if you have uploaded EA/DTA documents)
6. **File Upload**: Upload your Grenada EA and DTA documents if not already uploaded

---

### Step 5: Save All Changes

1. Scroll to the bottom
2. Click **"Save"** or **"Update Assistant"**
3. Wait for confirmation message

---

### Step 6: Verify Setup

#### Test 1: Check Function is Registered

1. In the assistant settings, scroll to Functions
2. Verify `get_page_context` is listed
3. Check parameters are correct

#### Test 2: Test in Playground

1. Go to **Playground** tab (or **Test** section)
2. Send a test message: `"What can I do on the feedback page?"`
3. **Expected behavior**:
   - Assistant should attempt to call `get_page_context` function
   - You'll see a function call request in the logs
   - Function call will fail in playground (that's okay - it only works in production)

#### Test 3: Check Instructions

1. Review the Instructions field
2. Verify it includes:
   - ✅ "Context Awareness" section
   - ✅ "get_page_context Function" section
   - ✅ "Response Formatting Guidelines"
   - ✅ "Greeting Behavior"

---

## Quick Reference: Complete Function Definition

Copy this entire JSON object if needed:

```json
{
  "name": "get_page_context",
  "description": "Get detailed static information about a specific page in the GEA Portal. Use this function when the user asks what they can do on the current page, needs help with a form or process, asks how to complete a task, seems confused about where they are, or when you need to provide step-by-step guidance. The function returns page title, purpose, target audience (public/staff/admin), step-by-step instructions (if applicable), helpful tips and warnings, and available features. Always use this function to provide accurate, page-specific guidance rather than generic responses.",
  "strict": false,
  "parameters": {
    "type": "object",
    "properties": {
      "route": {
        "type": "string",
        "description": "The page route/path from the GEA Portal (e.g. '/feedback', '/admin/analytics', '/grievance', '/ticket-status', '/admin/master/entities')"
      }
    },
    "required": [
      "route"
    ]
  }
}
```

---

## Common Routes Reference

For your reference, common GEA Portal routes:

| Route | Purpose | Audience |
|-------|---------|----------|
| `/` | Home page | Public |
| `/feedback` | Submit service feedback | Public |
| `/grievance` | File a grievance | Public |
| `/ticket-status` | Check ticket status | Public |
| `/admin/analytics` | View analytics dashboard | Staff/Admin |
| `/admin/grievances` | Manage grievances | Staff/Admin |
| `/admin/feedback` | Manage feedback submissions | Staff/Admin |
| `/admin/master/entities` | Manage entities (MDM) | Admin |
| `/admin/master/services` | Manage services (MDM) | Admin |
| `/admin/master/users` | Manage users | Admin |

---

## Troubleshooting

### Function Not Being Called

**Problem**: Assistant doesn't call `get_page_context` when expected

**Solutions**:
1. Check function description is clear and detailed
2. Verify system instructions mention when to use the function
3. Test with explicit questions like "What can I do on this page?"
4. Check function name is exactly `get_page_context` (case-sensitive)

### Function Call Fails

**Problem**: Function is called but returns errors

**Solutions**:
1. Check `GEA_PORTAL_URL` environment variable in your app
2. Verify GEA Portal API endpoint `/api/content/page-context` exists
3. Check server logs in Vercel for function handler errors
4. Test API endpoint directly: `https://gea.abhirup.app/api/content/page-context?route=/feedback`

### Instructions Too Long

**Problem**: System instructions exceed character limit

**Solutions**:
1. Use the condensed version if needed (remove examples)
2. Keep core sections: Context Awareness, Response Guidelines, Restrictions
3. Remove some example scenarios

---

## Screenshot Guide

### Where to Find Each Setting

1. **Instructions Box**: Large text area at the top of assistant settings
2. **Functions Section**: Below Instructions, collapsible section
3. **Model Selection**: Dropdown usually near the top
4. **Code Interpreter Toggle**: In "Capabilities" or "Tools" section
5. **File Search Toggle**: In "Capabilities" or "Tools" section

---

## After Setup: Testing Checklist

Once everything is configured:

- [ ] System instructions saved with v2 content
- [ ] `get_page_context` function added
- [ ] Function parameters match JSON structure
- [ ] Model set to GPT-4 Turbo or GPT-4o
- [ ] File Search enabled (if using documents)
- [ ] Code Interpreter disabled
- [ ] Tested in Playground with sample question
- [ ] Verified function call appears in logs

---

## Support

If you encounter issues:

1. Check [OpenAI Platform Status](https://status.openai.com/)
2. Review [OpenAI Assistants API Documentation](https://platform.openai.com/docs/assistants)
3. Check server logs in Vercel deployment
4. Test GEA Portal API endpoint directly

---

**Last Updated**: 2025-01-26
**Version**: v2.0
**Assistant ID**: `asst_lhyQ42RyOBwVfSOrB3HukqHn`
