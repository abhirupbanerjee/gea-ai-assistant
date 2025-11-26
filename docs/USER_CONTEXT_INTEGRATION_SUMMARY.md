# User Context Integration - Summary

## Overview

The GEA AI Assistant now integrates user session context from the GEA Portal to provide personalized, role-aware responses.

---

## What Changed

### 1. **TypeScript Types Updated** ([types/page-context.ts](../types/page-context.ts))

Added `UserContext` interface:

```typescript
export interface UserContext {
  id?: string;
  name?: string;
  email?: string;
  role: 'admin' | 'staff' | 'public';
  roleName?: string;
  entity?: {
    id: number;
    name: string;
  };
  isAuthenticated: boolean;
}
```

Updated `PageContext` to include user:

```typescript
export interface PageContext {
  route: string;
  user?: UserContext | null;  // NEW
  modal?: ModalContext | null;
  edit?: EditContext | null;
  // ... other fields
}
```

---

### 2. **Context Hook Updated** ([hooks/usePageContext.ts](../hooks/usePageContext.ts))

The `buildContextDescription()` function now includes user information:

```typescript
const buildContextDescription = useCallback((): string => {
  // ...

  // User Context
  if (pageContext.user) {
    const user = pageContext.user;
    let userDesc = 'User information:';

    if (user.name) {
      userDesc += `\n  - Name: ${user.name}`;
    }

    userDesc += `\n  - Role: ${user.role}`;

    if (user.entity) {
      userDesc += `\n  - Entity: ${user.entity.name} (ID: ${user.entity.id})`;
    }

    userDesc += `\n  - Authenticated: ${user.isAuthenticated}`;

    parts.push(userDesc);
  }

  // Route, modal, edit, etc...
}, [pageContext]);
```

---

### 3. **System Prompt Updated** ([docs/OPENAI_SYSTEM_PROMPT_FINAL.md](OPENAI_SYSTEM_PROMPT_FINAL.md))

Added comprehensive user role and manual selection section with:

- **3 User Manuals**: Citizen, Staff, Admin
- **User Context Detection**: How to detect role from context
- **Manual Selection Rules**: Which manual to use for each role
- **Critical Terminology Rules**:
  - ✅ "employee of [Entity Name]" NOT "staff member"
  - ✅ "employee of the Digital Transformation Agency" NOT "administrator"
- **Personalized Greeting Templates**: For each role
- **Good/Bad Examples**: Showing correct vs incorrect language

---

## How It Works

### Step 1: GEA Portal Sends User Context

The GEA Portal sends user information via `postMessage`:

```javascript
window.frames['ai-assistant-iframe'].postMessage({
  type: 'CONTEXT_UPDATE',
  context: {
    route: '/admin/tickets',
    timestamp: Date.now(),
    changeType: 'navigation',
    user: {
      id: 'staff-42',
      name: 'Jane Smith',
      email: 'jane@finance.gov.gd',
      role: 'staff',
      roleName: 'Staff',
      entity: {
        id: 5,
        name: 'Ministry of Finance'
      },
      isAuthenticated: true
    }
  }
}, 'https://gea-ai-assistant.vercel.app');
```

---

### Step 2: AI Assistant Receives Context

The `usePageContext` hook:
1. Validates the origin
2. Stores the `PageContext` (including user)
3. Builds a description string for OpenAI

Example context description sent to OpenAI:

```
User information:
  - Name: Jane Smith
  - Email: jane@finance.gov.gd
  - Role: staff
  - Entity: Ministry of Finance (ID: 5)
  - Authenticated: true
Current page: /admin/tickets
```

---

### Step 3: OpenAI Processes with Role Awareness

The OpenAI Assistant:
1. Reads the user role from `additional_instructions`
2. Selects the appropriate user manual:
   - `role: 'public'` → Citizen User Manual
   - `role: 'staff'` → Staff User Manual
   - `role: 'admin'` → Admin User Manual
3. Uses correct terminology:
   - For `staff` → "employee of [Entity Name]"
   - For `admin` → "employee of the Digital Transformation Agency"
4. Provides personalized greeting and guidance

---

## Example Responses

### Example 1: Entity Employee (Staff)

**Context received:**
```json
{
  "user": {
    "name": "Jane Smith",
    "role": "staff",
    "entity": { "name": "Ministry of Finance" }
  },
  "route": "/admin/tickets"
}
```

**AI Response:**
```markdown
## Welcome, Jane Smith!

As an **employee of the Ministry of Finance**, I can help you manage tickets and view analytics for your ministry.

### What you can do:

**Ticket Management:**
- View tickets assigned to the Ministry of Finance
- Update ticket status and add comments
- Filter tickets by status, priority, or category

**Important:** You can only view and manage tickets for your ministry. Tickets from other entities are not visible to you.

How can I assist you today?
```

---

### Example 2: DTA Employee (Admin)

**Context received:**
```json
{
  "user": {
    "name": "John Doe",
    "role": "admin",
    "entity": { "name": "Digital Transformation Agency" }
  },
  "route": "/admin/users"
}
```

**AI Response:**
```markdown
## Welcome, John Doe!

As an **employee of the Digital Transformation Agency**, you have full access to the GEA Portal system.

### What you can do:

**User Management:**
- Add, edit, and deactivate users across all entities
- Assign roles and permissions
- Manage entity associations

**System-wide Access:**
Unlike employees of individual ministries/departments, you can:
- View and manage tickets from all entities
- Access master data management
- Configure system-wide settings

How can I assist you today?
```

---

### Example 3: Public User (Not Authenticated)

**Context received:**
```json
{
  "user": {
    "role": "public",
    "isAuthenticated": false
  },
  "route": "/feedback"
}
```

**AI Response:**
```markdown
## Welcome to the GEA Portal!

I can help you navigate the portal and use government services.

### What you can do:

**Submit Feedback:**
1. Select the government entity
2. Choose the service you received
3. Provide your ratings
4. Add comments (optional)
5. Submit feedback

**Important:** You can submit feedback anonymously if you prefer.

How can I help you today?
```

---

## No Code Changes Required for Function Calling

**Good news:** The function calling JSON definition does NOT need to change.

### Why?

The `get_page_context` function:
- Fetches **static page information** (steps, tips, features)
- Does NOT need user context (already in `additional_instructions`)
- Returns the same structure regardless of user role

**Current function definition (unchanged):**

```json
{
  "type": "function",
  "function": {
    "name": "get_page_context",
    "description": "Get detailed static information about a specific GEA Portal page including purpose, features, steps, and tips",
    "parameters": {
      "type": "object",
      "properties": {
        "route": {
          "type": "string",
          "description": "The route/path of the page (e.g., '/feedback', '/admin/analytics')"
        }
      },
      "required": ["route"]
    }
  }
}
```

**This stays the same!** ✅

---

## Testing Checklist

### ✅ Code Changes Complete

- [x] Added `UserContext` interface to [types/page-context.ts](../types/page-context.ts)
- [x] Updated `PageContext` to include `user` field
- [x] Modified `buildContextDescription()` to include user info
- [x] Updated system prompt with role-aware instructions

### 📋 Manual Steps Required

1. **Upload User Manuals to OpenAI** (see [OPENAI_MANUAL_UPLOAD_STEPS.md](OPENAI_MANUAL_UPLOAD_STEPS.md))
   - [ ] Upload `GEA_Portal_Citizen_User_Manual.md`
   - [ ] Upload `GEA_Portal_Staff_User_Manual.md`
   - [ ] Upload `GEA_Portal_Admin_User_Manual.md`

2. **Update OpenAI Assistant System Prompt**
   - [ ] Copy content from [OPENAI_SYSTEM_PROMPT_FINAL.md](OPENAI_SYSTEM_PROMPT_FINAL.md)
   - [ ] Paste into OpenAI Platform assistant instructions

3. **Test with Different User Roles**
   - [ ] Test as public user (not authenticated)
   - [ ] Test as entity employee (staff role)
   - [ ] Test as DTA employee (admin role)

4. **Verify Terminology**
   - [ ] Confirm no "staff member" appears in responses
   - [ ] Confirm no "administrator" appears in responses
   - [ ] Confirm "employee of [Entity]" is used correctly

---

## Portal Integration Requirements

For the GEA Portal to send user context, it needs to:

### 1. Include User in postMessage

```javascript
// When sending context updates
window.frames['ai-assistant-iframe'].postMessage({
  type: 'CONTEXT_UPDATE',
  context: {
    route: currentRoute,
    timestamp: Date.now(),
    changeType: 'navigation',
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,  // 'admin', 'staff', or 'public'
      roleName: session.user.roleName,
      entity: session.user.entity ? {
        id: session.user.entity.id,
        name: session.user.entity.name
      } : undefined,
      isAuthenticated: !!session.user
    }
  }
}, AI_ASSISTANT_URL);
```

### 2. Send User Updates

User context should be sent:
- On page navigation
- On user login/logout
- When modal opens (include user context)
- When editing (include user context)

---

## Summary

### ✅ Completed

1. **TypeScript types** - Added `UserContext` interface
2. **Context hook** - Updated to include user info in description
3. **System prompt** - Added comprehensive role-aware instructions
4. **Documentation** - Created upload guide and test scenarios

### ⏳ Pending (Manual Steps)

1. Upload 3 user manuals to OpenAI Assistant vector store
2. Update OpenAI Assistant system prompt
3. Test with all 3 user roles
4. Verify correct terminology in responses

### 🎯 Expected Outcome

After manual steps are complete:

- **Public users** get generic, citizen-focused guidance
- **Entity employees** get personalized responses with their entity name
- **DTA employees** get full system-wide guidance
- **All responses** use correct terminology ("employee of..." instead of "staff" or "admin")

---

**Document Version**: 1.0
**Last Updated**: 2025-01-26
**Related Files**:
- Types: [types/page-context.ts](../types/page-context.ts)
- Hook: [hooks/usePageContext.ts](../hooks/usePageContext.ts)
- System Prompt: [OPENAI_SYSTEM_PROMPT_FINAL.md](OPENAI_SYSTEM_PROMPT_FINAL.md)
- Upload Guide: [OPENAI_MANUAL_UPLOAD_STEPS.md](OPENAI_MANUAL_UPLOAD_STEPS.md)
