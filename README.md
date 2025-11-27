# EA Portal Bot - GEA AI Assistant

A context-aware AI assistant (EA Portal Bot) for the Grenada Enterprise Architecture Portal, powered by OpenAI and built with Next.js 14. The bot provides real-time, context-specific guidance for citizens, government staff, and administrators using the GEA Portal.

---

## 🌟 Features

### Context-Aware Intelligence
- **Real-time Context Tracking**: Receives postMessage from GEA Portal to understand user's current page, modal, edit state, tab, and form progress
- **User-Aware Responses**: Detects user role (public/staff/admin) and entity to provide personalized guidance
- **Dynamic Responses**: Provides specific, actionable guidance based on what the user is viewing or doing
- **Thread Persistence**: Conversations persist across page refreshes via localStorage

### Portal Integration
- **Page Guidance**: Helps users navigate and use GEA Portal features
- **Modal Awareness**: Knows what entity/grievance the user is viewing with all associated data
- **Edit Assistance**: Guides users through editing with field-specific help
- **Form Guidance**: Walks users through multi-step forms with progress tracking

### Dynamic Welcome Screen
- **Context-Based Prompts**: Shows 3 quick action prompts relevant to the current page when embedded in portal
- **Generic Prompts**: Displays common portal tasks (feedback, grievances, services) when used standalone
- **Smart Navigation**: Automatically adapts prompts based on user's current location in the portal

### Document Knowledge
- **Enterprise Architecture**: Comprehensive knowledge of Grenada's EA framework, maturity model, and policy
- **DTA Information**: Details about Digital Transformation Agency structure, services, and implementation
- **Role-Based User Manuals**: Citizen, Staff, and Admin manuals accessed based on user role
- **Function Calling**: Fetches static page information from GEA Portal API on demand

### Modern UI Features
- **Multi-line Text Input**: Textarea with 3 rows for longer questions (Enter to send, Shift+Enter for new line)
- **Optimized Button Layout**: Icon-only buttons with 25%-25%-50% width distribution (Copy, Clear, Send)
- **Icon-only Buttons**: All action buttons use icons with helpful tooltips on hover
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Framer Motion for elegant transitions and interactions

### Modern Stack
- **Next.js 14**: App Router with TypeScript for type safety
- **OpenAI Assistants API**: Function calling and document search capabilities
- **Tailwind CSS + Framer Motion**: Beautiful, responsive UI with smooth animations
- **React Markdown**: Rich markdown rendering with syntax highlighting

### Security & Reliability
- **Origin Validation**: Configurable allowed origins for postMessage
- **Error Handling**: User-friendly error messages and fallbacks
- **Caching**: Smart caching for API responses
- **Logging**: Comprehensive logging for debugging

---

## 📦 Quick Start

### Prerequisites
- Node.js 18+ and npm
- OpenAI API key with Assistants API access
- OpenAI Assistant ID (created via OpenAI Platform)

### Installation

```bash
# Clone the repository
git clone https://github.com/abhirupbanerjee/gea-ai-assistant.git
cd gea-ai-assistant

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# OpenAI Configuration (Required)
OPENAI_API_KEY=sk-proj-...
OPENAI_ASSISTANT_ID=asst_...
OPENAI_ORGANIZATION=org-...  # Optional

# GEA Portal API URL (Required)
GEA_PORTAL_URL=https://gea.abhirup.app

# Allowed Origins for postMessage (Required - Public)
NEXT_PUBLIC_ALLOWED_ORIGINS=https://gea.abhirup.app,https://gea.gov.gd,http://localhost:3000,http://localhost:3001
```

See [`.env.example`](.env.example) for a complete template.

### OpenAI Assistant Setup

1. **Create/Update Assistant** on [OpenAI Platform](https://platform.openai.com/assistants)
2. **Copy System Instructions** from [`docs/OPENAI_SYSTEM_PROMPT_FINAL.md`](docs/OPENAI_SYSTEM_PROMPT_FINAL.md)
3. **Add Function** using definition from [`docs/OPENAI_FUNCTION_DEFINITION.json`](docs/OPENAI_FUNCTION_DEFINITION.json)
4. **Upload Documents** (EA framework, DTA docs, etc.)

See detailed setup guide: [`docs/OPENAI_SETUP_GUIDE.md`](docs/OPENAI_SETUP_GUIDE.md)

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

#### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/abhirupbanerjee/gea-ai-assistant)

#### Option 2: Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
# Settings → Environment Variables → Add all from .env
```

#### Required Vercel Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```
OPENAI_API_KEY=sk-proj-...
OPENAI_ASSISTANT_ID=asst_...
OPENAI_ORGANIZATION=org-...
GEA_PORTAL_URL=https://gea.abhirup.app
NEXT_PUBLIC_ALLOWED_ORIGINS=https://gea.abhirup.app,https://gea.gov.gd
```

### Deploy to Cloudflare Pages

```bash
# Build
npm run build

# Deploy
npm run deploy
```

Set environment variables in Cloudflare Pages settings.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  GEA Portal (Parent Window)             │
│  - Sends CONTEXT_UPDATE via postMessage │
└──────────────┬──────────────────────────┘
               │ postMessage
               ▼
┌─────────────────────────────────────────┐
│  AI Assistant (This App - iframe)       │
│                                         │
│  usePageContext Hook                    │
│  ├─ Validates origin                    │
│  ├─ Stores context                      │
│  └─ Builds context description          │
│                                         │
│  /api/chat Route                        │
│  ├─ Receives message + context          │
│  ├─ Calls OpenAI with context           │
│  └─ Handles function calls              │
│                                         │
│  OpenAI Assistant                       │
│  ├─ Processes with context awareness    │
│  ├─ Calls get_page_context if needed    │
│  └─ Returns context-aware response      │
└─────────────────────────────────────────┘
               │ (if function called)
               ▼
┌─────────────────────────────────────────┐
│  GEA Portal API                         │
│  /api/content/page-context?route=...   │
└─────────────────────────────────────────┘
```

See [`docs/FUNCTION_CALLING_GUIDE.md`](docs/FUNCTION_CALLING_GUIDE.md) for detailed architecture.

---

## 📚 Documentation

### Setup & Configuration
- **[Quick Start Guide](docs/QUICK_START.md)** - Fast deployment checklist
- **[OpenAI Setup Guide](docs/OPENAI_SETUP_GUIDE.md)** - Complete OpenAI Assistant configuration
- **[Manual Upload Guide](docs/OPENAI_MANUAL_UPLOAD_STEPS.md)** - Upload user manuals and test role-aware responses
- **[Environment Variables](.env.example)** - Configuration template

### Technical Documentation
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY_V2.md)** - Complete feature list and changes
- **[User Context Integration](docs/USER_CONTEXT_INTEGRATION_SUMMARY.md)** - User role detection and personalization
- **[Function Calling Guide](docs/FUNCTION_CALLING_GUIDE.md)** - Function calling architecture and examples
- **[System Prompt](docs/OPENAI_SYSTEM_PROMPT_FINAL.md)** - OpenAI Assistant instructions
- **[Function Definition](docs/OPENAI_FUNCTION_DEFINITION.json)** - OpenAI function schema

---

## 🧪 Testing

### Local Testing

```bash
# Start dev server
npm run dev

# Test with URL parameter
http://localhost:3000?source=/feedback

# Simulate postMessage in browser console
window.postMessage({
  type: 'CONTEXT_UPDATE',
  context: {
    route: '/feedback',
    timestamp: Date.now(),
    changeType: 'navigation'
  }
}, '*');
```

### Integration Testing

See [`docs/QUICK_START.md#testing-checklist`](docs/QUICK_START.md) for comprehensive testing steps.

---

## 🛠️ Development

### Project Structure

```
gea-ai-assistant/
├── app/
│   ├── api/chat/route.ts       # OpenAI API integration
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main chat interface
├── hooks/
│   └── usePageContext.ts       # Context management hook
├── lib/
│   ├── openai-functions.ts     # Function definitions
│   ├── function-handlers.ts    # Function handlers
│   └── types.ts                # Shared types
├── types/
│   └── page-context.ts         # Context type definitions
├── docs/                       # Documentation
│   ├── QUICK_START.md
│   ├── OPENAI_SETUP_GUIDE.md
│   ├── FUNCTION_CALLING_GUIDE.md
│   ├── IMPLEMENTATION_SUMMARY_V2.md
│   ├── OPENAI_SYSTEM_PROMPT_FINAL.md
│   └── OPENAI_FUNCTION_DEFINITION.json
└── public/
    └── icon.png                # App icon
```

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type safety and better DX |
| **OpenAI Assistants API** | AI backend with function calling |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Smooth animations |
| **React Markdown** | Markdown rendering |
| **Axios** | HTTP client |

### Adding New Functions

See [`docs/FUNCTION_CALLING_GUIDE.md#adding-new-functions`](docs/FUNCTION_CALLING_GUIDE.md) for step-by-step guide.

---

## 🔍 Context Types

The assistant understands these context types from the GEA Portal:

### 1. **Navigation Context**
```typescript
{
  route: '/feedback',
  timestamp: 1705312456789,
  changeType: 'navigation'
}
```

### 2. **Modal Context**
```typescript
{
  route: '/admin/grievances',
  changeType: 'modal',
  modal: {
    type: 'view-grievance',
    title: 'Grievance Details',
    entityType: 'grievance',
    entityId: 'GRV-001',
    entityName: 'Poor service',
    data: {
      status: 'In Progress',
      priority: 'High'
    }
  }
}
```

### 3. **Edit Context**
```typescript
{
  changeType: 'edit',
  edit: {
    isEditing: true,
    entityType: 'entity',
    entityId: 'ENT-001',
    entityName: 'Ministry of Finance',
    fields: ['name', 'abbreviation', 'type'],
    originalData: { abbreviation: 'MOF' }
  }
}
```

### 4. **Tab Context**
```typescript
{
  changeType: 'tab',
  tab: {
    tabGroup: 'grievance-filters',
    activeTab: 'in-progress',
    availableTabs: ['all', 'open', 'in-progress', 'resolved']
  }
}
```

### 5. **Form Context**
```typescript
{
  changeType: 'form',
  form: {
    formName: 'service-feedback',
    currentStep: 2,
    totalSteps: 3,
    completedFields: ['entity'],
    pendingFields: ['service', 'ratings'],
    validationErrors: ['Service is required']
  }
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### "Not Connected" Badge
**Problem**: Context not being received

**Solutions**:
- Check `NEXT_PUBLIC_ALLOWED_ORIGINS` environment variable
- Verify GEA Portal is sending postMessage
- Check browser console for origin validation errors

#### Generic AI Responses
**Problem**: AI not using context

**Solutions**:
- Verify OpenAI Assistant instructions are updated
- Check browser console for context being sent
- Review `/api/chat` logs in Vercel

#### Thread Not Persisting
**Problem**: Conversation resets on refresh

**Solutions**:
- Check browser localStorage is enabled
- Clear browser cache and test again
- Verify `usePageContext` hook is used correctly

See [`docs/QUICK_START.md#troubleshooting`](docs/QUICK_START.md) for more.

---

## 📊 Performance

- **First Load**: ~200KB (JS)
- **Response Time**: ~2-5s (depends on OpenAI API)
- **Caching**: 5-minute cache for static page context
- **Thread Storage**: localStorage (minimal overhead)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Grenada Digital Transformation Agency (DTA)** - For the vision and requirements
- **OpenAI** - For the powerful Assistants API
- **Next.js Team** - For the amazing framework
- **Vercel** - For seamless deployment

---

## 📞 Support

For issues, questions, or feedback:

- **GitHub Issues**: [Create an issue](https://github.com/abhirupbanerjee/gea-ai-assistant/issues)
- **Documentation**: Check [`/docs`](docs/) folder
- **DTA Contact**: Contact Grenada DTA team for GEA Portal-specific questions

---

## 🗺️ Roadmap

### v2.0 (Current)
- ✅ Context-aware responses
- ✅ postMessage integration
- ✅ Thread persistence
- ✅ Function calling
- ✅ Origin validation

### v2.1 (Planned)
- [ ] Write operations (submit feedback, update status)
- [ ] User authentication
- [ ] Analytics dashboard
- [ ] Multi-language support

### v3.0 (Future)
- [ ] Voice interaction
- [ ] Proactive suggestions
- [ ] Advanced analytics
- [ ] Mobile app (React Native)

---

**Version**: v2.0
**Last Updated**: 2025-01-26
**Repository**: [github.com/abhirupbanerjee/gea-ai-assistant](https://github.com/abhirupbanerjee/gea-ai-assistant)
**Live Demo**: [gea-ai-assistant.vercel.app](https://gea-ai-assistant.vercel.app)
**GEA Portal**: [gea.abhirup.app](https://gea.abhirup.app)
