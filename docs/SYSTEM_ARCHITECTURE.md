# System Architecture

## Overview

The Calendar Assistant + Inbox Concierge is a Next.js 15 web application that provides AI-powered calendar and email management through a unified interface. The system integrates with Google Calendar and Gmail APIs while using SQLite for local email storage and caching.

## High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  React Frontend │    │   Next.js API    │    │  External APIs  │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Chat        │ │────┤ │ /api/chat    │ │────┤ │ Claude API  │ │
│ │ Interface   │ │    │ │              │ │    │ │             │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Inbox       │ │────┤ │ /api/emails  │ │────┤ │ Gmail API   │ │
│ │ Management  │ │    │ │ /api/tags    │ │    │ │             │ │
│ └─────────────┘ │    │ │ /api/classify│ │    │ └─────────────┘ │
│                 │    │ └──────────────┘ │    │                 │
│ ┌─────────────┐ │    │                  │    │ ┌─────────────┐ │
│ │ Calendar    │ │────┤ ┌──────────────┐ │────┤ │ Calendar    │ │
│ │ Views       │ │    │ │/api/calendar │ │    │ │ API         │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
└─────────────────┘    │                  │    └─────────────────┘
                       │ ┌──────────────┐ │    
                       │ │   SQLite     │ │    
                       │ │   Database   │ │    
                       │ └──────────────┘ │    
                       └──────────────────┘    
```

## Frontend Architecture

### Component Hierarchy

```
App (page.tsx)
├── AuthGuard
├── CalendarRefreshProvider
└── Unified Interface
    ├── LeftRail (Navigation)
    ├── Center Content (Dynamic)
    │   ├── ChatInterface
    │   ├── InboxView 
    │   └── CalendarView
    └── RightDock (Widgets)
        ├── EmailWidget/TrainingExamplesWidget
        └── CalendarWidget
```

### State Management

- **View State**: Single `activeView` state controls center pane content (`chat` | `inbox` | `calendar`)
- **Data State**: Each view manages its own data fetching and local state
- **Global State**: Authentication context via AuthGuard
- **Calendar Context**: CalendarRefreshProvider for calendar-specific updates
- **Chat State**: Zustand store for conversation persistence

### Component Responsibilities

| Component | Purpose | API Dependencies |
|-----------|---------|------------------|
| `page.tsx` | Main layout orchestration, view switching | None |
| `LeftRail.tsx` | Navigation and view switching | None |
| `InboxView.tsx` | Email management interface | `/api/emails`, `/api/tags`, `/api/classify` |
| `CalendarView.tsx` | Calendar display and interaction | `/api/calendar/events` |
| `ChatInterface.tsx` | Claude conversation interface | `/api/chat-stream` |
| `RightDock.tsx` | Widget container with contextual content | None |
| `EmailWidget.tsx` | Email stats or training examples (contextual) | `/api/emails`, `/api/training-examples` |

## Backend Architecture

### API Structure

```
/api/
├── auth/google/
│   ├── login/          # OAuth initiation
│   ├── callback/       # OAuth callback handler  
│   └── refresh/        # Token refresh
├── chat-stream/        # Claude conversation endpoint (streaming)
├── emails/
│   ├── route.ts        # Email CRUD operations
│   └── sync/           # Email synchronization with Gmail
├── calendar/events/    # Calendar operations
├── classify/           # Email classification
│   └── status/         # Classification status check
├── tags/              # Tag management
└── training-examples/  # Training examples management
```

### Data Flow Patterns

1. **Authentication Flow**:
   ```
   User → /api/auth/google/login → Google OAuth → Callback → HTTP-only cookies
   ```

2. **Email Synchronization Flow**:
   ```
   Gmail API → /api/emails/sync → SQLite → Frontend (via /api/emails)
   ```

3. **Email Classification Flow**:
   ```
   Frontend → /api/classify → AI Classification → Database updates → Frontend refresh
   ```

4. **Calendar Flow**:
   ```
   Frontend → /api/calendar/events → Google Calendar API → Frontend
   ```

5. **Training Examples Flow**:
   ```
   Frontend → /api/training-examples → Database (assignedBy update) → Frontend refresh
   ```

## Database Schema

### Core Tables

```sql
-- Email storage
CREATE TABLE emails (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    from_address TEXT NOT NULL,
    from_name TEXT,
    snippet TEXT NOT NULL,
    body_text TEXT,
    body_html TEXT,
    received_at TEXT NOT NULL,
    is_unread BOOLEAN NOT NULL DEFAULT 1,
    is_important BOOLEAN NOT NULL DEFAULT 0,
    label_ids TEXT NOT NULL DEFAULT '[]',
    history_id TEXT NOT NULL,
    internal_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Classification system
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    description TEXT,
    is_system_tag BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Email-tag relationships with training data
CREATE TABLE email_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    assigned_by TEXT NOT NULL CHECK (assigned_by IN ('user', 'ai')),
    confidence REAL,
    reasoning TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES emails(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id),
    UNIQUE(email_id, tag_id)
);
```

### Service Layer

- **EmailService**: Email CRUD operations, sync management
- **TagService**: Tag management, email-tag relationships, statistics
- **Database initialization**: Schema creation, indexes, constraints

## Authentication & Security

### OAuth 2.0 Implementation

1. **Login Initiation**: `/api/auth/google/login`
   - Generates OAuth URL with calendar and Gmail scopes
   - Redirects user to Google OAuth consent

2. **Callback Handling**: `/api/auth/google/callback`
   - Exchanges authorization code for access/refresh tokens
   - Stores tokens in HTTP-only cookies

3. **Token Refresh**: `/api/auth/google/refresh`
   - Automatic renewal before token expiration
   - Background refresh maintains session

### Security Measures

- **HTTP-only cookies**: Prevent XSS token theft
- **Secure token storage**: No client-side token exposure
- **Scope limitation**: Minimal necessary Google API permissions
- **Input validation**: All API endpoints validate request data
- **Error sanitization**: No sensitive data in error responses
- **CORS handling**: Proper cross-origin request security

## External API Integration

### Google Calendar API
- **Scope**: `https://www.googleapis.com/auth/calendar`
- **Operations**: List events, create events, update events, delete events
- **Data Handling**: Event details, attendees, recurrence rules
- **Rate Limiting**: Handled with exponential backoff

### Gmail API
- **Scope**: `https://www.googleapis.com/auth/gmail.readonly`
- **Operations**: List messages, get message details, batch operations
- **Sync Strategy**: Pull recent emails, store locally for performance
- **Data Storage**: Full email content cached in SQLite

### Claude Sonnet 4 API
- **Model**: `claude-sonnet-4-20250514`
- **Authentication**: Server-side API key
- **Features**: Tool calling, streaming responses, structured outputs
- **Context Management**: Dynamic system prompts with current data

## Performance & Optimization

### Frontend Optimization
- **Component Structure**: Efficient re-rendering with stable refs
- **State Management**: Focused state updates to prevent cascade re-renders
- **API Caching**: Browser caches API responses appropriately
- **Lazy Loading**: Components load on demand

### Backend Optimization
- **Database Indexing**: Optimized queries on frequently accessed fields
- **Connection Management**: Efficient SQLite connection handling
- **Batch Operations**: Group related database operations
- **Response Streaming**: Large responses stream for better UX

### Network Optimization
- **Request Batching**: Combine related API calls where possible
- **Error Retry Logic**: Automatic retry with exponential backoff
- **Timeout Handling**: Reasonable timeouts for external APIs
- **Credential Management**: Secure, efficient token handling

## Deployment Architecture

### Development Environment
```bash
npm run dev          # Next.js development server on :3000
npm run build        # Production build
npm run lint         # Code quality checks
```

### Environment Variables
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXTAUTH_SECRET=your_nextauth_secret
```

### Production Considerations
- **Database**: SQLite for single-user, consider PostgreSQL for multi-user
- **File Storage**: Database files on persistent storage
- **API Routes**: Compatible with serverless deployment
- **Static Assets**: Next.js automatic optimization
- **Monitoring**: Error tracking and performance monitoring setup

## Scalability Considerations

### Current Architecture Limits
- **Single-user deployment**: One SQLite database per instance
- **Local file storage**: Database on server filesystem
- **Polling-based updates**: No real-time synchronization

### Future Enhancement Opportunities
- **Multi-tenant support**: PostgreSQL with user isolation
- **Real-time updates**: WebSocket integration for live data
- **Microservices**: Separate classification and sync services
- **Caching layer**: Redis for frequently accessed data
- **Mobile clients**: API-first design enables mobile apps

## Directory Structure

```
src/
├── app/
│   ├── api/              # Next.js API routes
│   ├── globals.css       # Global styles
│   └── page.tsx          # Main application entry
├── components/
│   ├── email/            # Email-specific components
│   ├── widgets/          # Sidebar widgets
│   └── [other-components]
├── hooks/                # Custom React hooks
├── lib/                  # Core business logic
│   ├── database.ts       # Database services
│   ├── emailClassifier.ts # AI classification
│   └── emailSync.ts      # Gmail synchronization
├── store/                # State management
└── types/                # TypeScript definitions
```

This architecture provides a solid foundation for the AI-powered email and calendar management system while maintaining clear separation of concerns and scalability for future enhancements.