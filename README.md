# Calendar Assistant + Inbox Concierge

A powerful AI-powered calendar and email management system built with Next.js 15, TypeScript, and Claude Sonnet 4. This application provides natural language interactions for managing your Google Calendar and Gmail through intelligent conversation and automated email classification.

## ✨ Features

- **🤖 AI Chat Interface**: Natural language conversation with Claude Sonnet 4 for calendar and email management
- **📧 Smart Email Classification**: Automatic email categorization using AI with training examples
- **📅 Google Calendar Integration**: Full calendar management with event creation, editing, and deletion
- **🏷️ Organic Tagging System**: Dynamic category creation based on email content and user feedback
- **⭐ Training Examples**: Mark emails to improve classification accuracy over time
- **🔄 Real-time Sync**: Automatic email and calendar synchronization
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Cloud Console project with Calendar and Gmail APIs enabled
- Anthropic API key for Claude

### 1. Clone and Install

```bash
git clone https://github.com/k3nnethfrancis/gmail-agent.git
cd gmail-agent
npm install
```

### 2. Environment Setup

Create `.env.local` from the example:

```bash
cp .env.example .env.local
```

Configure your environment variables:

```env
# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string

# Database (SQLite - no setup required)
DATABASE_URL=file:./data/emails.db
```

### 3. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable these APIs:
   - Gmail API
   - Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Download credentials and update your `.env.local`

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and authenticate with Google.

## 🧪 Testing the Application

### Initial Setup Test
1. **Authentication**: Click "Sign in with Google" - should redirect and authenticate successfully
2. **Email Sync**: First login automatically syncs last 200 emails from Gmail
3. **Auto-Classification**: Emails are automatically categorized (takes 30-60 seconds)

### Core Features Test

#### 📧 Email Classification
1. Go to **Inbox** view
2. Verify emails are organized into categories (General, Newsletters, Financial, etc.)
3. **Manual Tagging**: 
   - Hover over an email → Click 🏷️ tag icon
   - Type new category name → Press Enter
   - Email moves to new category

#### ⭐ Training Examples
1. Select a well-categorized email
2. Click ⭐ star icon to mark as training example
3. Run classification again - similar emails should be categorized consistently

#### 📅 Calendar Integration
1. Switch to **Calendar** view
2. Your Google Calendar events should display
3. **Chat Commands**: Try saying "What meetings do I have today?" or "Schedule a meeting tomorrow at 2pm"

#### 🤖 AI Chat
1. Try natural language commands:
   ```
   "What emails came in today?"
   "Show me financial emails"  
   "Create a meeting for next Monday at 3pm"
   "Classify my unread emails"
   ```

### Bulk Operations Test
1. In Inbox, use checkboxes to select multiple emails
2. Click "Reclassify Selected" to re-categorize in bulk
3. Use "Select All" for mass operations

## 📁 Project Structure

```
gmail-agent/
├── src/
│   ├── app/                    # Next.js 13+ app router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Google OAuth handling  
│   │   │   ├── calendar/      # Calendar API endpoints
│   │   │   ├── emails/        # Email API endpoints
│   │   │   ├── classify/      # Classification API
│   │   │   └── chat-stream/   # AI chat streaming
│   │   └── page.tsx           # Main application page
│   ├── components/            # React components
│   │   ├── InboxView.tsx      # Email management interface
│   │   ├── CalendarView.tsx   # Calendar interface  
│   │   ├── ChatInterface.tsx  # AI chat component
│   │   └── widgets/           # Dashboard widgets
│   ├── lib/                   # Core business logic
│   │   ├── database.ts        # SQLite database layer
│   │   ├── emailClassifier.ts # AI classification engine
│   │   ├── auth.ts           # Authentication utilities
│   │   └── gmail.ts          # Gmail API integration
│   └── store/                # State management (Zustand)
├── docs/                     # Detailed documentation
│   ├── AGENT_SYSTEM.md      # How the AI agent works
│   └── CLASSIFICATION.md     # Email classification deep dive
└── data/                     # SQLite database storage
```

## 🔧 Development

### Key Technologies
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **AI**: Claude Sonnet 4 via Anthropic SDK  
- **APIs**: Google Calendar API, Gmail API
- **Database**: SQLite with better-sqlite3
- **Auth**: Custom Google OAuth implementation
- **State**: Zustand for chat persistence

### Adding New Features

1. **API Endpoints**: Add to `src/app/api/`
2. **UI Components**: Add to `src/components/`  
3. **Business Logic**: Add to `src/lib/`
4. **Database Schema**: Modify `src/lib/database.ts`

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint checking
```

### Debugging

- **Email Issues**: Check browser console for 📧 logs
- **Classification**: Look for 🤖 classification logs  
- **Chat Problems**: Monitor 💬 chat stream logs
- **Calendar**: Watch for 📅 calendar operation logs

## 🐛 Troubleshooting

### Common Issues

**"Authentication required" errors**:
- Check Google OAuth credentials in `.env.local`
- Verify authorized redirect URIs in Google Console

**No emails loading**:
- Check Gmail API is enabled in Google Console
- Verify authentication tokens are valid

**Classification not working**:  
- Confirm Anthropic API key is valid
- Check server logs for classification errors

**Calendar not syncing**:
- Ensure Calendar API is enabled
- Check OAuth scopes include calendar access

## 📚 Detailed Documentation

- **[Agent System Guide](docs/AGENT_SYSTEM.md)** - How the AI chat agent works
- **[Classification System](docs/CLASSIFICATION.md)** - Email categorization deep dive  
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and data flow
- **[Feature Guide](docs/FEATURES.md)** - Complete feature documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests: `npm run lint` and `npm run build`
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Getting Help

- Check the [Issues](../../issues) for known problems
- Review server logs in browser console  
- Examine database with SQLite browser if needed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ using Claude Sonnet 4, Next.js, and the power of AI-human collaboration**