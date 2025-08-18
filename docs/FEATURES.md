# Current Features & User Workflows

## Functional Features ✅

### 1. **Unified 3-Pane Interface**
- **Left Rail**: Navigation between Chat, Inbox, and Calendar views
- **Center Pane**: Dynamic content area that switches based on navigation
- **Right Dock**: Persistent widgets (email stats + mini calendar)
- **No Separate Pages**: Everything works within single interface

### 2. **Email Management System**
- **Category-Based Organization**: View emails by category in sidebar
- **Email Actions**: Hover over emails to access Tag, Star (example), and Open actions
- **Category Creation**: Type new category names to create and assign simultaneously  
- **Manual Classification**: "Run Classification" button processes untagged emails
- **Training Examples**: Mark emails as examples for future ML training

### 3. **Calendar Integration**
- **Google Calendar Sync**: Displays user's actual calendar events
- **Multiple Views**: Month, week, and day views with navigation
- **Event Details**: Shows time, location, attendees for each event
- **Date Navigation**: Previous/next arrows, "Today" button

### 4. **Chat Interface with Claude**
- **Natural Language**: Conversation interface with Claude Sonnet 4
- **Tool Calling**: Claude can access calendar and email APIs
- **Context Aware**: Knows current date/time and user's data
- **Markdown Support**: Rich text responses with proper formatting

---

## User Workflows

### **Email Management Workflow**

1. **Access Inbox**:
   - Click "Inbox" in left rail
   - See category sidebar + email list

2. **View by Category**:
   - Click any category (Unassigned, Custom categories)
   - Email list filters to show only that category

3. **Categorize Single Email**:
   - Hover over email → Click 🏷️ tag icon
   - Type category name (creates new if doesn't exist)
   - Press Enter → email assigned to category

4. **Mark Training Example**:
   - Hover over email → Click ⭐ star icon  
   - Email marked as example for classification learning

5. **Run Classification**:
   - Click green "Run Classification" button in header
   - System processes all untagged emails
   - Results show in categories automatically

6. **Create New Category**:
   - Click + button next to "Categories" in sidebar
   - Enter category name → new category created

### **Calendar Workflow**

1. **Access Calendar**:
   - Click "Calendar" in left rail
   - See full calendar interface

2. **Switch Views**:
   - Click Month/Week/Day buttons in header
   - Calendar updates to show selected timeframe

3. **Navigate Dates**:
   - Use Previous/Next arrows
   - Click "Today" to return to current date

4. **View Event Details**:
   - Events display with time, title, location
   - Day view shows full event details

### **Chat Workflow**

1. **Start Conversation**:
   - Click "Chat" in left rail (default view)
   - Type message to Claude

2. **Use Natural Language**:
   - "Show me my calendar for this week"
   - "What emails do I have from yesterday?"
   - "Create a meeting for tomorrow at 2pm"

3. **Tool Integration**:
   - Claude automatically accesses calendar/email APIs
   - Provides contextual responses with actual data

---

## Widget Features

### **Email Stats Widget (Right Dock)**
- Shows unread email count
- Lists categories with email counts
- "View all emails" link navigates to inbox

### **Mini Calendar Widget (Right Dock)**  
- Compact calendar view
- Shows current month with today highlighted
- Quick date reference while using other features

---

## Data Management

### **Email Synchronization**
- Automatically pulls last 200 Gmail messages
- Stores locally in SQLite for fast access
- Preserves all metadata (sender, date, importance, etc.)

### **Classification System**
- Rule-based classification for common patterns:
  - Delivery failures → Auto-archive
  - Newsletters/marketing → Newsletter category
  - Meeting/urgent emails → Important category
  - Regular emails → Can wait category

### **Category Management**
- User-created categories with custom colors
- Persistent storage in database
- Easy assignment and reassignment

---

## Authentication & Security

### **Google OAuth Integration**
- Complete OAuth 2.0 flow
- Automatic token refresh
- Secure HTTP-only cookie storage
- Required scopes: Calendar read, Gmail read

### **Data Privacy**
- All email data stored locally
- No data sent to external services except Google APIs
- Chat conversations with Claude don't include personal data

---

## Current Limitations

### **Missing Features** (Planned)
- Bulk email operations (select multiple emails)
- Automatic classification on first login
- Calendar event creation/editing
- Email composition and sending
- Advanced search and filtering

### **Known Issues** (See ISSUES.md)
- Calendar not loading user events (authentication issue)
- Quick filters in sidebar don't work
- Forced system categories instead of organic classification
- No multi-select capabilities

---

## Browser Compatibility

- **Primary**: Modern Chrome, Firefox, Safari, Edge
- **Mobile**: Responsive design works on tablets and phones
- **Requirements**: JavaScript enabled, cookies allowed

---

## Performance Characteristics

- **Fast Loading**: Local SQLite database for email queries
- **Responsive UI**: React with optimized re-rendering
- **Efficient API**: Batched requests where possible
- **Offline Capability**: Emails cached locally (limited offline use)

The system provides a solid foundation for AI-powered email and calendar management with room for the planned enhancements detailed in the issue tracker.