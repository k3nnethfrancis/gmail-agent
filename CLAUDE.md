# CLAUDE.md - Calendar Assistant + Inbox Concierge

## Project Overview

**Calendar Assistant + Inbox Concierge** built with Next.js 15, TypeScript, and Claude Sonnet 4. Provides AI-powered calendar and email management through natural language conversations with real Google API integration.

**Current Status**: ✅ **PROJECT COMPLETE** - All major features implemented including organic classification, training examples system, manual tag editing, and UI polish. Ready for production use.

---

## Quick Links

- **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)** - Infrastructure, APIs, database design  
- **[AI Architecture](docs/AI_ARCHITECTURE.md)** - Agent workflows, classification, tool calling
- **[Features Documentation](docs/FEATURES.md)** - Current capabilities and user workflows  
- **[Classification System](docs/CLASSIFICATION.md)** - Email classification pipeline and AI integration
- **[Engineering Notes](docs/ENGINEERING.md)** - Development setup, debugging, best practices
- **[Code Audit](docs/CODE_AUDIT.md)** - Codebase quality assessment and improvement plan

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

## Completed Features

- ✅ **Training Examples System**: Complete implementation with star button, management widget, and AI learning
- ✅ **UI Polish**: Text truncation, layout alignment, visual consistency all addressed
- ✅ **Email Classification**: Pure LLM approach with user feedback integration
- ✅ **Component Restoration**: All components working without infinite loop issues
- ✅ **Database Optimization**: Fixed field mapping and performance issues

---

## Project Context

This application demonstrates enterprise-level AI integration with real-world APIs. The goal is to provide a natural language interface for calendar and email management that actually works with users' real Google accounts.

The system has evolved from a complex, fragmented codebase into a clean, modular application with a unified interface and working classification pipeline.