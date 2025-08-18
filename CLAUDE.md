# CLAUDE.md - Calendar Assistant + Inbox Concierge

## Project Overview

**Calendar Assistant + Inbox Concierge** built with Next.js 15, TypeScript, and Claude Sonnet 4. Provides AI-powered calendar and email management through natural language conversations with real Google API integration.

**Current Status**: ✅ **CORE FUNCTIONALITY COMPLETE** - All major features implemented including organic classification, training examples, and manual tag editing. **UI polish needed** for professional appearance.

---

## Quick Links

- **[Architecture Documentation](docs/ARCHITECTURE.md)** - System design and data flow
- **[Features Documentation](docs/FEATURES.md)** - Current capabilities and user workflows  
- **[Classification System](docs/CLASSIFICATION.md)** - Email classification pipeline and AI integration
- **[Engineering Notes](docs/ENGINEERING.md)** - Development setup, debugging, best practices
- **[Code Audit](docs/CODE_AUDIT.md)** - Codebase quality assessment and improvement plan
- **[Issue Tracker](docs/ISSUES.md)** - Implementation roadmap (all 5 priority issues completed)

---

## Current Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Database**: SQLite with better-sqlite3 for local email storage
- **AI**: Claude Sonnet 4 (`claude-sonnet-4-20250514`) via Anthropic SDK
- **APIs**: Google Calendar API, Gmail API with OAuth 2.0
- **Auth**: HTTP-only cookies for security
- **UI**: ReactMarkdown, Lucide React icons
- **Dev Tools**: ESLint, TypeScript strict mode

---

## Development Commands

```bash
# Start development server
npm run dev

# Production build
npm run build

# Run linting
npm run lint

# Environment setup
cp .env.example .env.local
# Add your Google OAuth and Anthropic API keys
```

---

## Key Success Factors Achieved

- ✅ **Real Google API integration** (not mocks)
- ✅ **Proper authentication and security** 
- ✅ **Type-safe, maintainable codebase**
- ✅ **Production-ready error handling**
- ✅ **Organic email classification system**
- ✅ **Training examples & manual tag editing**
- ✅ **Auto-classification on login**
- ✅ **Gmail-style bulk operations**
- ✅ **Chat state persistence (Zustand)**
- ✅ **Interactive email widget**
- ✅ **Smart category filtering & sorting**

## Outstanding Items for Next Session

- 🔧 **UI Polish Needed**: Text truncation, layout alignment, visual consistency
- 🔧 **Tag Styling**: Improve visual design of email tags
- 🔧 **Responsive Design**: Ensure mobile/tablet experience is optimal

---

## Project Context

This application demonstrates enterprise-level AI integration with real-world APIs. The goal is to provide a natural language interface for calendar and email management that actually works with users' real Google accounts.

The system has evolved from a complex, fragmented codebase into a clean, modular application with a unified interface and working classification pipeline.