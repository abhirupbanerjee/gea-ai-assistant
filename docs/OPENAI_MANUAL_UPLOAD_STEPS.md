# OpenAI Assistant Manual Upload - Step-by-Step Guide

## Overview

This guide walks you through uploading the 3 user manuals to your OpenAI Assistant's vector store and updating the system prompt.

---

## Step 1: Prepare the Manual Files

The following files are ready for upload:

1. **Citizen User Manual**: `docs/user-manuals/GEA_Portal_Citizen_User_Manual.md`
2. **Staff User Manual**: `docs/user-manuals/GEA_Portal_Staff_User_Manual.md`
3. **Admin User Manual**: `docs/user-manuals/GEA_Portal_Admin_User_Manual.md`

---

## Step 2: Upload to OpenAI Assistant Vector Store

### Navigate to OpenAI Platform

1. Go to [https://platform.openai.com/assistants](https://platform.openai.com/assistants)
2. Sign in with your OpenAI account
3. Click on your **GEA AI Assistant** (ID: `asst_...`)

### Upload Files to Vector Store

1. Scroll to the **"Files"** or **"Knowledge"** section
2. Click **"Add file"** or **"Upload files"**
3. Upload all 3 files:
   - `GEA_Portal_Citizen_User_Manual.md`
   - `GEA_Portal_Staff_User_Manual.md`
   - `GEA_Portal_Admin_User_Manual.md`

### Enable File Search

1. In the **"Tools"** section, ensure **"File Search"** is enabled
2. This allows the assistant to search uploaded documents

---

## Step 3: Update System Instructions

### Copy Updated System Prompt

1. Open: `docs/OPENAI_SYSTEM_PROMPT_FINAL.md`
2. Select all content (Ctrl+A / Cmd+A)
3. Copy to clipboard (Ctrl+C / Cmd+C)

### Paste into OpenAI Assistant

1. In the OpenAI Platform assistant editor
2. Find the **"Instructions"** field (large text area)
3. Select all existing content and replace with copied content
4. Click **"Save"** in the top right

---

## Step 4: Verify Configuration

### Check Files Tab

Ensure you see 6 total files:
- ✅ `GEA_Portal_Citizen_User_Manual.md` (new)
- ✅ `GEA_Portal_Staff_User_Manual.md` (new)
- ✅ `GEA_Portal_Admin_User_Manual.md` (new)
- ✅ EA framework documents (existing)
- ✅ DTA documents (existing)

### Check Instructions

The instructions should now include:

```markdown
## User Roles & Manual Selection

### Available User Manuals

1. **Citizen User Manual** (`GEA_Portal_Citizen_User_Manual.md`)
2. **Staff User Manual** (`GEA_Portal_Staff_User_Manual.md`)
3. **Admin User Manual** (`GEA_Portal_Admin_User_Manual.md`)
```

### Check Tools

- ✅ **File Search**: Enabled
- ✅ **Function Calling**: `get_page_context` function exists

---

## Step 5: Test Role-Aware Responses

### Test 1: Public User (No Authentication)

**Send to chat API with context:**
```json
{
  "user": {
    "role": "public",
    "isAuthenticated": false
  },
  "route": "/feedback"
}
```

**Expected greeting:**
```
## Welcome to the GEA Portal!

I can help you navigate the portal and use government services...
```

**Test question:** "How do I submit feedback?"

**Expected response:**
- Should reference **Citizen User Manual**
- Should explain public feedback submission
- Should use generic greeting (no user name)

---

### Test 2: Entity Employee (Staff)

**Send to chat API with context:**
```json
{
  "user": {
    "id": "staff-42",
    "name": "Jane Smith",
    "email": "jane@finance.gov.gd",
    "role": "staff",
    "roleName": "Staff",
    "entity": {
      "id": 5,
      "name": "Ministry of Finance"
    },
    "isAuthenticated": true
  },
  "route": "/admin/tickets"
}
```

**Expected greeting:**
```
## Welcome, Jane Smith!

As an **employee of the Ministry of Finance**, I can help you manage tickets and view analytics for your ministry/department/agency.
```

**Test question:** "What tickets can I see?"

**Expected response:**
- Should reference **Staff User Manual**
- Should say "employee of the Ministry of Finance" NOT "staff member"
- Should explain entity-specific access
- Should mention they can only see Ministry of Finance tickets

---

### Test 3: DTA Employee (Admin)

**Send to chat API with context:**
```json
{
  "user": {
    "id": "admin-1",
    "name": "John Doe",
    "email": "john@dta.gov.gd",
    "role": "admin",
    "roleName": "Administrator",
    "entity": {
      "id": 1,
      "name": "Digital Transformation Agency"
    },
    "isAuthenticated": true
  },
  "route": "/admin/users"
}
```

**Expected greeting:**
```
## Welcome, John Doe!

As an **employee of the Digital Transformation Agency**, you have full access to the GEA Portal system.
```

**Test question:** "What can I manage?"

**Expected response:**
- Should reference **Admin User Manual**
- Should say "employee of the Digital Transformation Agency" NOT "administrator"
- Should explain full system access
- Should mention capabilities other employees don't have

---

## Step 6: Verify Manual Selection

### How to Verify

1. **Check AI response content** - Does it mention features from the correct manual?
2. **Check terminology** - Does it use "employee of [Entity]" instead of "staff" or "admin"?
3. **Check permissions** - Does it explain access correctly based on role?

### Expected Behavior

| User Role | Manual Used | Greeting Pattern | Terminology |
|-----------|-------------|------------------|-------------|
| `public` | Citizen Manual | "Welcome to the GEA Portal!" | Generic (no entity) |
| `staff` | Staff Manual | "Welcome, [Name]! As an employee of [Entity]..." | "employee of [Entity Name]" |
| `admin` | Admin Manual | "Welcome, [Name]! As an employee of the Digital Transformation Agency..." | "employee of the Digital Transformation Agency" |

---

## Troubleshooting

### AI Not Using Correct Manual

**Problem**: AI answers with generic info instead of manual content

**Solutions**:
1. Verify files uploaded successfully in OpenAI Platform
2. Check "File Search" tool is enabled
3. Test with specific question like "According to my user manual, how do I..."

---

### AI Using Wrong Terminology

**Problem**: AI says "staff member" or "admin" instead of "employee of..."

**Solutions**:
1. Verify system instructions were updated with latest prompt
2. Check the "Personalized Response Examples" section exists
3. Manually test by asking "Who am I?" and verify response uses correct language

---

### AI Not Detecting User Role

**Problem**: AI treats admin as public user or gives generic responses

**Solutions**:
1. Check `additional_instructions` in API call includes user context
2. Verify context format matches expected structure (see test examples above)
3. Check console logs for context being sent to `/api/chat`

---

## Success Criteria

✅ **All 3 manuals uploaded** to OpenAI Assistant vector store
✅ **System prompt updated** with role-aware manual selection
✅ **File Search enabled** in assistant tools
✅ **Public user test** - Uses Citizen Manual, generic greeting
✅ **Staff user test** - Uses Staff Manual, "employee of [Entity]" language
✅ **Admin user test** - Uses Admin Manual, "employee of DTA" language
✅ **Manual content verification** - Responses include manual-specific details
✅ **Terminology verification** - No "staff member" or "administrator" labels

---

## Next Steps After Upload

Once all tests pass:

1. **Deploy to Production** - Update Vercel deployment with latest code
2. **Monitor Responses** - Check that AI uses correct manuals in live environment
3. **User Feedback** - Collect feedback from actual users (public, staff, admin)
4. **Iterate** - Refine system prompt based on real-world usage

---

**Document Version**: 1.0
**Last Updated**: 2025-01-26
**Related Files**:
- System Prompt: `docs/OPENAI_SYSTEM_PROMPT_FINAL.md`
- User Manuals: `docs/user-manuals/*.md`
- User Context Enhancement: `docs/USER_SESSION_CONTEXT_ENHANCEMENT.md`
