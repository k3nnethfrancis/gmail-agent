# Calendar Assistant + Inbox Concierge

A unified Next.js application that combines calendar management and email management through a single chat interface, powered by Claude Code SDK with direct tool function integration.

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Google Cloud Console**
   
   You need to create Google OAuth credentials for the app to access your calendar and email.
   
   ### Step-by-Step Google Setup:
   
   1. Go to [Google Cloud Console](https://console.cloud.google.com)
   2. Create a new project (or use an existing one)
   3. Enable the required APIs:
      - Go to "APIs & Services" → "Library"
      - Search and enable "Google Calendar API" 
      - Search and enable "Gmail API"
   
   4. Create OAuth 2.0 credentials:
      - Go to "APIs & Services" → "Credentials"
      - Click "Create Credentials" → "OAuth 2.0 Client IDs"
      - Choose "Web application"
      - Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
      - Copy the Client ID and Client Secret

3. **Create Environment File**
   
   Create a `.env.local` file in the project root:
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   
   # Optional: For Claude AI integration later
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Test the Setup**
   - Visit http://localhost:3000
   - Click "Connect Google Account"
   - Complete OAuth flow
   - Test Calendar and Gmail APIs

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Next.js Application                     │
│                                                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Chat UI       │ │  Calendar View  │ │   Email View    ││
│  │   (React)       │ │   (React)       │ │   (React)       ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│                                                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Claude Code SDK │ │  Tool Functions │ │  API Routes     ││
│  │ (Chat Agent)    │ │ (Direct Import) │ │ (OAuth & State) ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────────────┐
                    │  Google APIs    │
                    │ - Calendar API  │
                    │ - Gmail API     │
                    └─────────────────┘
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/google/          # OAuth flow endpoints
│   │   └── test/                 # API testing endpoints
│   ├── page.tsx                  # Main testing interface
│   └── layout.tsx
├── tools/
│   ├── calendar.ts               # Calendar API functions
│   └── gmail.ts                  # Gmail API functions
└── lib/
    └── auth.ts                   # OAuth utilities
```

## Available Tool Functions

### Calendar Tools (`src/tools/calendar.ts`)
- `listEvents(auth, options)` - List calendar events with filtering
- `createEvent(auth, eventData)` - Create new calendar events
- `updateEvent(auth, eventId, updates)` - Update existing events
- `deleteEvent(auth, eventId)` - Delete calendar events
- `getFreeBusy(auth, timeMin, timeMax, calendars)` - Check availability
- `createTimeBlock(auth, startTime, endTime, title)` - Block time

### Gmail Tools (`src/tools/gmail.ts`)
- `listThreads(auth, options)` - List email threads with filtering
- `getThread(auth, threadId)` - Get specific email thread
- `sendEmail(auth, emailOptions)` - Send emails
- `createLabel(auth, name)` - Create Gmail labels
- `addLabel(auth, threadId, labelIds)` - Add labels to threads
- `archiveThread(auth, threadId)` - Archive email threads
- `classifyEmails(auth, threadIds, categories)` - Classify emails into categories

## Development Workflow

1. **Foundation Testing** (Current)
   - Test OAuth flow
   - Verify Google API access
   - Test tool functions individually

2. **Claude SDK Integration** (Next)
   - Install Claude Code SDK
   - Create agent that imports tool functions
   - Build chat interface

3. **Feature Development**
   - Calendar management UI
   - Email classification system
   - Natural language processing

## Security Notes

- Tokens are stored in secure HTTP-only cookies
- OAuth flow includes proper PKCE for security
- Refresh tokens automatically handled
- APIs require proper authentication

## Troubleshooting

### OAuth Issues
- Ensure redirect URI exactly matches Google Cloud Console configuration
- Check that Calendar API and Gmail API are enabled
- Verify environment variables are properly set

### API Errors
- Check browser console for detailed error messages
- Verify token expiration and refresh logic
- Ensure proper Google API scopes are requested

## Contributing

This project follows the simplified architecture pattern with direct tool function imports rather than MCP protocol overhead. When adding new features:

1. Create tool functions in `src/tools/`
2. Add API routes for stateful operations in `src/app/api/`
3. Import tools directly in Claude SDK integration
4. Test each layer independently

## License

MIT
