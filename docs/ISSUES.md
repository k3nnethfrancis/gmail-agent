# Issue Tracker & Implementation Roadmap

**Last Updated**: August 18, 2025  
**Status**: ✅ **MAJOR FUNCTIONALITY COMPLETE** - Core features implemented, UI polish needed

> Note: This is the canonical issues tracker. `docs/ACTIVE_ISSUES.md` has been consolidated into this document and will no longer be updated.

## 🎉 Major Implementation Summary

All major functionality has been successfully implemented:

- ✅ **Issue #1**: Quick Filters removed - cleaner navigation
- ✅ **Issue #2**: Calendar displays actual Google Calendar events  
- ✅ **Issue #3**: Forced system categories replaced with organic classification
- ✅ **Issue #4**: Auto-classification implemented on login workflow
- ✅ **Issue #5**: Gmail-style bulk operations fully functional
- ✅ **Issue #6**: Chat state persistence with Zustand
- ✅ **Issue #7**: Fixed auto-classification database bugs
- ✅ **Issue #8**: Interactive email widget with navigation
- ✅ **Additional**: Manual tag editing, training examples, category filtering/sorting

**Total Implementation Time**: ~15 hours

---

## 🚦 Critical Path vs. Later To-Dos (Demo Focus)

For the current local single-user demo, prioritize UI improvements and simple correctness fixes. Defer architecture/agent changes.

### ✅ Critical Path (Do Now)
- Fix unread inversion in sync (email badges/counts)
  - Status: In Progress
  - Branch: `feature/fix-unread-flag`
  - Files: `src/lib/emailSync.ts`
  - Notes: Flip `isUnread` to reflect Gmail `UNREAD` label truthfully
- Sidebar category truncation and tooltips (Issue #9)
  - Status: In Progress
  - Branch: `feature/sidebar-truncation-tooltips`
  - Files: `src/components/email/CategorySidebar.tsx`
  - Notes: Truncate with tooltip, tabular-nums for counts, maintain accessibility
- Clean email previews (overflow/truncation noise)
  - Status: In Progress
  - Branch: `feature/clean-previews`
  - Files: `src/components/email/EmailList.tsx`
  - Notes: Limit subject width, improve clamp, strip noisy "Preview" text, normalize whitespace
- Email count display consistency (Issue #10)
  - Status: In Progress
  - Branch: `feature/count-consistency`
  - Files: `src/lib/database.ts`, `src/components/InboxView.tsx`, `src/components/email/CategorySidebar.tsx`
  - Notes: Use server counts (total/unassigned) for sidebar/header; ensure stability after actions
- Bulk selection and reclassify selected (Issue #5)
- Inline category editing on tag click (Issue #6)
- Add skeleton loaders and standardized error toasts (Inbox/Chat/Calendar)
  
  
### 🧪 Unread UI Indicator (for verification)
- Status: In Progress
- Branch: `feature/unread-ui-indicator`
- Files: `src/components/email/EmailList.tsx`
- Notes: Bold sender + darker subject and small dot with aria-label for unread emails to visually verify unread status

### 🕒 Later To-Dos (Post-Demo)
- Keep agent tools as-is; later align `agentConfig` with `toolRegistry`
- Centralize auth cookie helper; remove route-local duplicates
- Unify model versions in one config
- Add DB row→DTO mapping utility and reduce N+1 in `/api/emails`
- Replace deprecated Google token refresh method
- Stop deriving sessionId from token substring; use opaque IDs
- Plan for multi-user + hosted DB when needed

## 🟡 UI Polish Issues (User Testing - Latest)

**Discovered During User Testing**: August 18, 2025  
**Status**: 4 UI polish issues identified from screenshot feedback

### Issue #9: Inbox Categories Text Truncation
**Priority**: HIGH  
**Status**: 🟡 Ready for Implementation  

**Problem**: Category names are truncated/cut off in the left sidebar  
**Evidence**: User screenshot shows "General" and "System Notifications" partially visible  
**Location**: `src/components/InboxView.tsx` (category sidebar)  

**Solution**: 
- Adjust sidebar width or implement text wrapping
- Add tooltips for long category names  
- Ensure all category text is readable

**Estimated Time**: 1 hour

---

### Issue #10: Email Count Display Inconsistency
**Priority**: HIGH  
**Status**: 🟡 Ready for Implementation  

**Problem**: Email counts not displaying correctly next to categories  
**Evidence**: Screenshot shows categories but counts aren't clearly visible  
**Location**: `src/components/InboxView.tsx` (category display)

**Solution**:
- Verify email count calculation logic
- Improve count styling and positioning
- Ensure counts accurately reflect email numbers

**Estimated Time**: 1 hour

---

### Issue #11: Input Field Positioning Issues  
**Priority**: MEDIUM
**Status**: 🟡 Ready for Implementation

**Problem**: "Type category name..." input field appears misaligned/floating  
**Evidence**: Screenshot shows input in unexpected position during inline editing
**Location**: `src/components/InboxView.tsx` (inline editing)

**Solution**:
- Fix input field positioning and styling
- Improve inline editing user experience
- Ensure proper focus management

**Estimated Time**: 1 hour

---

### Issue #12: Tag Styling Improvements
**Priority**: MEDIUM  
**Status**: 🟡 Ready for Implementation

**Problem**: Tags like "New2" have basic/inconsistent styling  
**Evidence**: Screenshot shows simple blue tag without design polish  
**Location**: `src/components/InboxView.tsx` (tag rendering)

**Solution**:
- Improve tag visual design consistency
- Ensure appealing color schemes
- Fix tag spacing and alignment

**Estimated Time**: 30 minutes

---

## 🟡 Previous UX Issues (COMPLETED)

**Discovered During User Testing**: August 18, 2025  
**Status**: All resolved in current session

### Issue #6: Chat State Not Persisting Between Views
**Priority**: HIGH  
**Status**: 🟡 Ready for Implementation  

**Problem**: When switching from Chat to Inbox/Calendar and back, chat history is cleared  
**Current Behavior**: Each view switch resets the chat state  
**Desired Behavior**: Chat history should persist throughout the session  

**Solution**: Implement Zustand state management for chat persistence
**Location**: `src/components/ChatInterface.tsx`
**Implementation**: 
1. Create Zustand store for chat messages
2. Replace useState with Zustand state
3. Persist chat history across component unmounts

**Estimated Time**: 1-2 hours

---

### Issue #7: Auto-Classification Not Triggering on Authentication
**Priority**: HIGH  
**Status**: 🟠 Partially Fixed - Testing Required  

**Problem**: After login, 197 unassigned emails remain - auto-classification failing with errors  
**Current Behavior**: Classification attempts but fails with "Cannot read properties of undefined"  
**Desired Behavior**: Classification should run automatically after authentication  

**Root Cause Identified**: Email objects have missing/undefined fields (fromAddress, subject, snippet)
**Location**: `src/lib/emailClassifier.ts:56-58`

**✅ Fix Applied**: Added null-safety to field access:
```typescript
const subject = (email.subject || '').toLowerCase();
const snippet = (email.snippet || '').toLowerCase();  
const fromAddress = (email.fromAddress || '').toLowerCase();
```

**⚠️ Testing Required**: User needs to test auto-classification after re-authentication
**Estimated Time**: 30 minutes (testing)

---

### Issue #8: Inbox Widget Misalignment and Inaccuracy  
**Priority**: MEDIUM  
**Status**: 🟡 Ready for Implementation  

**Problem**: Right-dock inbox widget shows issues:
- "6 unread emails" not clickable and possibly inaccurate
- Categories don't sync with actual inbox system
- Overall misalignment with main inbox functionality

**Current Issues**:
- Widget shows old system categories (Auto-archive, Can wait, Important, Newsletter)
- Unread count may not reflect actual unread status
- No interaction capability

**Solution**:
1. Update widget to use organic categories from actual system
2. Fix unread email count accuracy
3. Make "unread emails" clickable to navigate to inbox
4. Ensure real-time sync with main inbox data

**Location**: `src/components/widgets/EmailWidget.tsx`
**Estimated Time**: 2-3 hours

---

## 🎯 Next Development Session Priority

**Recommended Implementation Order**:
1. **Issue #7** - Fix auto-classification (highest user impact)
2. **Issue #6** - Chat state persistence (user experience)  
3. **Issue #8** - Widget cleanup (polish)

**Total Estimated Time**: 5-8 hours

---

## 🔴 Critical Issues (User-Identified)

### Issue #1: Non-functional Quick Filters
**Priority**: Medium  
**Status**: 🟡 Ready for Implementation  

**Problem**: Left sidebar has non-working "Quick Filters" section that serves no purpose  
**Location**: `src/components/LeftRail.tsx` (lines 62-80)  
**Code Affected**:
```typescript
{/* Quick Filters */}
<div className="mt-8">
  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
    Quick Filters
  </h3>
  <div className="space-y-1">
    <FilterItem icon={<Clock className="w-3 h-3" />} label="Today" count={3} />
    <FilterItem icon={<Star className="w-3 h-3" />} label="This Week" count={12} />
  </div>
</div>
```

**Solution**:
- Remove entire Quick Filters section from LeftRail component
- Remove FilterItem component definition (lines 125-147)
- Keep focus on main navigation only

**Implementation Time**: 15 minutes

---

### Issue #2: Calendar Not Loading User's Events  
**Priority**: HIGH  
**Status**: 🟡 Ready for Implementation  

**Problem**: Calendar component displays but doesn't show user's actual Google Calendar events  
**Location**: `src/components/CalendarView.tsx` (line 51)  
**Code Affected**:
```typescript
const response = await fetch(`/api/calendar/events?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}`, {
  credentials: 'include'
});
```

**Root Cause Analysis**:
1. **API Endpoint**: `/api/calendar/events` may not be properly handling authentication
2. **Token Passing**: Calendar API calls might not include proper OAuth tokens
3. **Scope Issues**: Google OAuth might not have calendar read permissions

**Files to Investigate**:
- `src/app/api/calendar/events/route.ts` - Check authentication handling
- `src/lib/auth.ts` - Verify token extraction and validation
- OAuth scopes in Google Console settings

**Solution Steps**:
1. Debug `/api/calendar/events` endpoint authentication
2. Verify Google OAuth scopes include calendar access
3. Test token passing and refresh logic
4. Add proper error handling and user feedback

**Implementation Time**: 2-3 hours

---

### Issue #3: Forced System Categories  
**Priority**: HIGH  
**Status**: 🟡 Ready for Implementation  

**Problem**: System-level email categories are hardcoded and forced on all users  
**Location**: `src/lib/database.ts` (lines 180-200)  
**Code Affected**:
```typescript
// Create default system tags
const defaultTags = [
  { name: 'Important', color: '#ef4444', description: 'Emails requiring immediate attention', isSystemTag: true },
  { name: 'Can wait', color: '#6b7280', description: 'Regular emails that can be processed later', isSystemTag: true },
  { name: 'Auto-archive', color: '#9ca3af', description: 'Automated notifications and confirmations', isSystemTag: true },
  { name: 'Newsletter', color: '#3b82f6', description: 'Marketing emails and newsletters', isSystemTag: true }
];
```

**Current Flow**: Database initialization forces system tags on all users  
**Desired Flow**: Let classification pipeline create categories organically

**Solution**:
1. Remove hardcoded system tags from database initialization
2. Modify classification pipeline to work without predefined categories
3. Let Claude create categories based on email analysis
4. Store categories created by AI classification

**Files to Modify**:
- `src/lib/database.ts` - Remove default tag creation
- `src/lib/emailClassifier.ts` - Update classification logic
- `src/app/api/classify/route.ts` - Handle dynamic category creation

**Implementation Time**: 3-4 hours

---

### Issue #4: No Automatic Classification on Login
**Priority**: HIGH  
**Status**: 🟡 Ready for Implementation  

**Problem**: Classification pipeline doesn't run automatically when user logs in  
**Current Behavior**: User sees unclassified emails until they manually click "Run Classification"  
**Desired Behavior**: 
- User logs in → Check if emails in DB → If no emails, pull 200 → Classify all untagged emails → User sees classified inbox

**Locations to Modify**:
- `src/components/InboxView.tsx` - Add automatic classification check in useEffect
- `src/lib/emailClassifier.ts` - Modify auto-classification logic
- `src/app/api/classify/route.ts` - Support automatic triggers

**Implementation Flow**:
```typescript
// In InboxView useEffect:
useEffect(() => {
  const runInitialSetup = async () => {
    // 1. Check if emails exist in database
    const emailsResponse = await fetch('/api/emails?limit=1');
    const { emails } = await emailsResponse.json();
    
    if (emails.length === 0) {
      // 2. Sync emails from Gmail
      await fetch('/api/emails/sync', { method: 'POST' });
    }
    
    // 3. Check for unclassified emails
    const unclassifiedCheck = await fetch('/api/classify');
    const { classificationNeeded } = await unclassifiedCheck.json();
    
    if (classificationNeeded) {
      // 4. Run classification automatically
      await fetch('/api/classify', { method: 'POST', body: JSON.stringify({ force: true }) });
    }
    
    // 5. Load classified emails for display
    fetchData();
  };
  
  runInitialSetup();
}, []);
```

**Implementation Time**: 2-3 hours

---

### Issue #5: Missing Bulk Operations Interface
**Priority**: HIGH  
**Status**: 🟡 Ready for Implementation  

**Problem**: No multi-select checkboxes or bulk reclassification capabilities  
**Current Behavior**: Can only act on one email at a time  
**Desired Behavior**: Gmail-style bulk operations with select all functionality

**Location**: `src/components/InboxView.tsx`  
**New Features Needed**:
1. Checkbox column in email list
2. "Select All" / "Select None" controls  
3. Bulk actions toolbar when emails are selected
4. Reclassify button for selected emails only

**Implementation Plan**:

**Step 1**: Add selection state management
```typescript
const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
const [isSelectAllMode, setIsSelectAllMode] = useState(false);
```

**Step 2**: Add checkbox column to email list
```typescript
// Add checkbox to each email row
<input 
  type="checkbox"
  checked={selectedEmails.has(email.id)}
  onChange={() => toggleEmailSelection(email.id)}
/>
```

**Step 3**: Add bulk actions toolbar
```typescript
{selectedEmails.size > 0 && (
  <div className="bg-blue-50 border-b p-4 flex items-center justify-between">
    <span>{selectedEmails.size} emails selected</span>
    <div className="space-x-2">
      <button onClick={handleBulkReclassify}>Reclassify Selected</button>
      <button onClick={() => setSelectedEmails(new Set())}>Clear Selection</button>
    </div>
  </div>
)}
```

**Step 4**: Implement bulk reclassification logic
```typescript
const handleBulkReclassify = async () => {
  const promises = Array.from(selectedEmails).map(emailId =>
    fetch('/api/classify', {
      method: 'POST',
      body: JSON.stringify({ emailIds: [emailId], force: true })
    })
  );
  await Promise.all(promises);
  setSelectedEmails(new Set());
  fetchData(); // Refresh display
};
```

**Files to Modify**:
- `src/components/InboxView.tsx` - Add bulk selection interface
- `src/app/api/classify/route.ts` - Support bulk classification
- `src/lib/emailClassifier.ts` - Handle arrays of emails

**Implementation Time**: 4-5 hours

---

### Issue #6: Email Category Editing Workflow  
**Priority**: HIGH  
**Status**: 🟡 Ready for Implementation  

**Problem**: Should be able to click email category and change it directly  
**Current Behavior**: Must use hover actions to change category  
**Desired Behavior**: Click on category tag → inline editing

**Location**: `src/components/InboxView.tsx` (email tag display section)  
**Current Code**:
```typescript
{email.tags?.map(tag => (
  <span
    key={tag.id}
    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
  >
    {tag.name}
  </span>
))}
```

**Enhanced Code Needed**:
```typescript
{email.tags?.map(tag => (
  <button
    key={tag.id}
    onClick={() => handleCategoryEdit(email.id, tag.id)}
    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium hover:opacity-80"
    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
  >
    {tag.name}
  </button>
))}
```

**Implementation**: Add inline editing state and category dropdown

**Implementation Time**: 2 hours

---

## 🟡 Medium Priority Issues

### Issue #7: Large Component Complexity
**Location**: `src/components/InboxView.tsx`  
**Problem**: Component has too many responsibilities  
**Solution**: Break into smaller components (EmailList, CategorySidebar, etc.)

### Issue #8: Manual Field Transformations  
**Location**: `src/app/api/emails/route.ts`  
**Problem**: Repeated camelCase transformation logic  
**Solution**: Create utility function for database-to-API field mapping

---

## Implementation Schedule

### **Week 1 Priority**
1. **Day 1**: Fix calendar authentication (Issue #2)
2. **Day 2**: Remove quick filters (Issue #1) + Implement auto-classification (Issue #4)
3. **Day 3**: Remove forced system categories (Issue #3)
4. **Day 4-5**: Implement bulk operations (Issue #5)

### **Week 2 Priority**  
1. Add inline category editing (Issue #6)
2. Refactor large components (Issue #7)
3. Create utility functions (Issue #8)
4. Add basic testing

---

## Success Criteria

After implementing all issues:
- ✅ User logs in → sees classified emails immediately (no manual steps)
- ✅ Calendar shows user's actual Google Calendar events
- ✅ Clean, minimal interface without unused features
- ✅ Gmail-style bulk email operations work smoothly
- ✅ Categories are organic/user-driven, not forced system categories
- ✅ Inline category editing provides smooth UX

**Estimated Total Implementation Time**: 15-20 hours across 1-2 weeks