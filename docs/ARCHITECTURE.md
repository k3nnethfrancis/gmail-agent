# System Architecture

## High-Level Overview

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
        ├── EmailWidget
        └── CalendarWidget
```

### State Management

- **View State**: Single `activeView` state controls center pane content
- **Data State**: Each view manages its own data fetching and state
- **Global State**: Authentication context via AuthGuard
- **Calendar Context**: CalendarRefreshProvider for calendar-specific updates

### Component Responsibilities

| Component | Purpose | Dependencies |
|-----------|---------|-------------|
| `page.tsx` | Main layout orchestration | All views and navigation |
| `LeftRail.tsx` | Navigation and view switching | None |
| `InboxView.tsx` | Email management interface | `/api/emails`, `/api/tags` |
| `CalendarView.tsx` | Calendar display and interaction | `/api/calendar/events` |
| `ChatInterface.tsx` | Claude conversation interface | `/api/chat` |
| `RightDock.tsx` | Widget container | EmailWidget, CalendarWidget |

## Backend Architecture

### API Structure

```
/api/
├── auth/google/
│   ├── login/          # OAuth initiation
│   ├── callback/       # OAuth callback handler  
│   └── refresh/        # Token refresh
├── chat/               # Claude conversation endpoint
├── emails/
│   ├── route.ts        # Email CRUD operations
│   └── sync/           # Email synchronization
├── calendar/events/    # Calendar operations
├── classify/           # Email classification
└── tags/              # Tag management
```

### Data Flow

1. **Authentication Flow**:
   ```
   User → /api/auth/google/login → Google OAuth → Callback → HTTP-only cookies
   ```

2. **Email Flow**:
   ```
   Gmail API → /api/emails/sync → SQLite → /api/emails → Frontend
   ```

3. **Classification Flow**:
   ```
   Frontend → /api/classify → emailClassifier.ts → Database updates
   ```

4. **Calendar Flow**:
   ```
   Frontend → /api/calendar/events → Google Calendar API → Frontend
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
    internal_date TEXT NOT NULL
);

-- Classification system
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    description TEXT,
    is_system_tag BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE email_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    assigned_by TEXT NOT NULL CHECK (assigned_by IN ('user', 'ai')),
    confidence REAL,
    reasoning TEXT,
    FOREIGN KEY (email_id) REFERENCES emails(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);
```

### Service Layer

- **EmailService**: CRUD operations for emails
- **TagService**: Tag management and email-tag relationships
- **ClassificationService**: AI-powered email categorization (planned)

## Authentication & Security

### OAuth 2.0 Flow

1. User clicks login → `/api/auth/google/login`
2. Redirects to Google OAuth with proper scopes
3. Google redirects to `/api/auth/google/callback` with code
4. Exchange code for tokens → Store in HTTP-only cookies
5. Auto-refresh tokens via `/api/auth/google/refresh`

### Security Measures

- **HTTP-only cookies**: Prevent XSS attacks
- **Token refresh**: Automatic renewal before expiration
- **Scope limitation**: Only necessary Google API permissions
- **Input validation**: All API endpoints validate inputs
- **Error sanitization**: No sensitive data in error messages

## External API Integration

### Google Calendar API

- **Authentication**: OAuth 2.0 with calendar scope
- **Operations**: List events, create events (planned: update, delete)
- **Data**: Event details, attendees, recurrence rules

### Gmail API

- **Authentication**: OAuth 2.0 with gmail.readonly scope
- **Operations**: List messages, get message details, batch operations
- **Sync Strategy**: Pull last 200 emails, store locally for performance

### Claude Sonnet 4 API

- **Authentication**: API key in server environment
- **Tool Calling**: Structured function calls to Google APIs
- **Context**: Dynamic system prompts with current date/time
- **Response**: Markdown-formatted responses with auto-scroll

## Performance Considerations

### Frontend Optimization

- **Component lazy loading**: Views load on demand
- **State management**: Minimal re-renders with focused state
- **API caching**: Browser caches API responses
- **Image optimization**: Next.js automatic image optimization

### Backend Optimization

- **SQLite indexing**: Proper indexes on frequently queried fields
- **Batch operations**: Group database operations where possible  
- **Connection pooling**: Efficient database connection management
- **Response caching**: Cache static responses where appropriate

### Network Optimization

- **Credentials handling**: Include credentials for authenticated requests
- **Request batching**: Combine related API calls where possible
- **Error retry**: Automatic retry with exponential backoff
- **Timeout handling**: Reasonable timeouts for external API calls

## Deployment Architecture

### Development Environment

```bash
npm run dev  # Next.js development server on :3000
```

### Production Considerations

- **Environment variables**: Secure storage of API keys
- **Database**: SQLite file storage (consider PostgreSQL for scale)
- **Static files**: Next.js automatic optimization
- **API routes**: Serverless deployment compatible
- **Monitoring**: Error tracking and performance monitoring (planned)

## Scalability & Extensibility

### Current Limitations

- **Single-user**: One SQLite database per deployment
- **Local storage**: Database file on server filesystem
- **No real-time**: Polling-based updates only

### Future Enhancements

- **Multi-tenant**: PostgreSQL with user isolation
- **Real-time updates**: WebSocket integration
- **Microservices**: Separate classification service
- **Caching layer**: Redis for frequently accessed data
- **Mobile app**: API-first design enables mobile clients