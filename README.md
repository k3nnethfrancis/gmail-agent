# Calendar Assistant + Inbox Concierge

A production-ready AI-powered calendar and email management application built with Next.js 15, TypeScript, and Claude Sonnet 4.

## 🚀 **Quick Start**

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Google OAuth and Anthropic API keys

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

## ✨ **Features**

### 📅 **Calendar Assistant (Complete)**
- **Natural Language Scheduling**: "Schedule 3 meetings with Joe, Dan, and Sally"
- **Time Blocking**: "Block my mornings for workouts"
- **Meeting Analysis**: "How much time am I spending in meetings?"
- **Safe Deletion**: AI safety protocols prevent hallucinated event IDs
- **Real-time Sync**: Calendar widget updates immediately

### 📧 **Inbox Concierge (In Development)**
- **Smart Classification**: AI-powered email sorting into buckets
- **Custom Categories**: Create your own email buckets
- **Auto-archive**: Intelligent newsletter and notification handling
- **Preview Interface**: Gmail-style email browsing

## 🏗️ **Architecture**

### **Core Technologies**
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **AI**: Claude Sonnet 4 with tool calling and agentic workflows
- **APIs**: Google Calendar API, Gmail API with OAuth 2.0
- **Auth**: HTTP-only cookies for security

### **Key Innovations**
- **Tool Call History Enforcement**: Prevents AI from hallucinating data
- **Message Consolidation**: Clean UX for parallel tool operations
- **Session-based Safety**: 30-second validity windows for critical operations
- **Enterprise-grade Error Handling**: Comprehensive logging and recovery

## 📋 **API Routes**

### **Authentication**
- `POST /api/auth/google/login` - Initiate OAuth flow
- `GET /api/auth/google/callback` - Handle OAuth callback
- `POST /api/auth/google/refresh` - Refresh access tokens

### **Chat & AI**
- `POST /api/chat-stream` - Streaming chat with Claude (recommended)
- `POST /api/chat` - Non-streaming chat responses

### **Data**
- `GET /api/calendar/events` - Calendar events with filtering
- `GET /api/test/calendar` - Calendar API testing
- `GET /api/test/gmail` - Gmail API testing

## 🔧 **Development**

### **Environment Variables**
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### **Development Commands**
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint checking
```

### **Project Structure**
```
src/
├── app/                 # Next.js 15 app router
│   ├── api/            # API routes
│   └── page.tsx        # Main application
├── components/         # React components
│   ├── ChatInterface.tsx
│   ├── CalendarWidget.tsx
│   └── AuthGuard.tsx
├── lib/               # Core utilities
│   ├── agentConfig.ts # Claude system prompts & tools
│   ├── toolRegistry.ts # Tool execution & safety
│   └── auth.ts        # OAuth utilities
└── tools/             # Google API integrations
    ├── calendar.ts
    └── gmail.ts
```

## 🛡️ **Safety Features**

### **AI Reliability System**
Our breakthrough tool call history enforcement prevents Claude from using hallucinated data:

- **30-second validity window** for `list_events` before deletions
- **Session-based tracking** with automatic cleanup
- **Message consolidation** for better UX during parallel operations
- **Comprehensive logging** for debugging and monitoring

### **Security Best Practices**
- HTTP-only cookies prevent XSS attacks
- Token refresh automation
- Environment-based logging controls
- Input validation and sanitization

## 📚 **Documentation**

- [`CLAUDE.md`](./CLAUDE.md) - Comprehensive development guide and context
- [`docs/development/`](./docs/development/) - Technical planning and requirements
- [`docs/archive/`](./docs/archive/) - Historical development documents

## 🔄 **Current Status**

### ✅ **Calendar Assistant: 100% Complete**
- All engineering requirements implemented
- Production-ready with enterprise-grade safety
- Real-time Google Calendar integration
- Custom calendar widget with multiple views

### 🚧 **Inbox Concierge: In Development**
- Email classification system (Claude-powered)
- EmailBuckets UI component
- Custom bucket creation
- Auto-load classification (200 threads)

## 🤝 **Contributing**

This project demonstrates enterprise-level AI integration patterns. Key areas for contribution:

1. **Email Intelligence**: ML-based classification improvements
2. **UI/UX**: Mobile responsiveness and animations
3. **Performance**: Caching and optimization
4. **Features**: Additional calendar views and email operations

## 📄 **License**

Built with [Claude Code](https://claude.ai/code) - An interactive CLI for AI-powered development.

---

**Next milestone**: Complete Inbox Concierge implementation to fulfill all engineering project requirements.