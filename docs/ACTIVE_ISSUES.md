# Active Development Issues

**Last Updated**: August 19, 2025  
**Current Status**: Core functionality complete, UI/UX improvements needed

This document tracks **active issues requiring immediate attention**. All other documentation should remain static unless code changes affect their explanations.

---

## 🔍 **Investigation Results** 

### Database & Classification Status
- ✅ **Database intact**: 8.8MB SQLite database exists with all email data
- ✅ **Classification running**: Auto-classification actively processing in background (100/200 emails classified)
- ✅ **System functional**: No data loss occurred during merge to main
- ⚠️ **Progress UI missing**: Classification happening but user has no visibility

### Root Cause Analysis
The emails appearing "unclassified" is normal - we performed a fresh email sync which reset all tags, and auto-classification is currently running in the background (visible in logs). The issue is **lack of user feedback** about this background process.

---

## 🚨 **Critical UI/UX Issues** (From User Screenshots)

### Issue #1: Chat Interface Infinite Scroll  
**Priority**: HIGH  
**Status**: ✅ **COMPLETED**  

**Problem**: Chat conversation grows the page height infinitely, requiring full page scroll  
**Solution Applied**:
- ✅ Added `max-h-[60vh]` to messages container
- ✅ Container already had `overflow-y-auto` for internal scrolling
- ✅ Auto-scroll to bottom functionality already working via `messagesEndRef`

**Location**: `src/components/ChatInterface.tsx`  
**Changes Made**:
- Line 261: Added `max-h-[60vh]` to messages area div
- Chat now constrains to 60% of viewport height with internal scrolling

---

### Issue #2: Inbox View Infinite Scroll  
**Priority**: HIGH  
**Status**: ✅ **COMPLETED**  

**Problem**: Email list grows page height infinitely despite pagination implementation  
**Solution Applied**:
- ✅ Added `max-h-[65vh]` to email list container
- ✅ Implemented `flex-1 overflow-y-auto` for internal scrolling  
- ✅ Maintained pagination controls outside scrollable area

**Location**: `src/components/email/EmailList.tsx`  
**Changes Made**:
- Line 200: Changed container to `flex flex-col h-full`
- Line 201: Added `flex-1 max-h-[65vh] overflow-y-auto` to email list div
- Pagination controls remain fixed at bottom

---

### Issue #3: Email Preview Text Truncation  
**Priority**: MEDIUM  
**Status**: ✅ **COMPLETED**  

**Problem**: Email preview text gets cut off and doesn't wrap nicely  
**Solution Applied**:
- ✅ Replaced harsh `truncate max-w-full overflow-hidden` with `line-clamp-2`
- ✅ Added `leading-relaxed` for better line spacing
- ✅ Improved sender name and subject truncation (removed redundant classes)
- ✅ Email snippets now show up to 2 lines with proper word wrapping

**Location**: `src/components/email/EmailList.tsx`  
**Changes Made**:
- Line 322: Email snippet uses `line-clamp-2 leading-relaxed`
- Line 306: Simplified sender name truncation
- Line 313: Simplified subject truncation

---

### Issue #4: Missing Classification Progress UI  
**Priority**: HIGH  
**Status**: ✅ **COMPLETED**  

**Problem**: Classification runs in background with no user visibility  
**Solution Applied**:
- ✅ Restored ClassificationProgress component (was disabled for debugging)
- ✅ Fixed polling logic to start immediately on mount
- ✅ Added proper status logging and visibility controls
- ✅ Component now shows when `unclassifiedEmails > 0`

**Location**: `src/components/ClassificationProgress.tsx`  
**Changes Made**:
- Removed `return null;` debug code  
- Simplified polling logic - starts immediately, polls every 2 seconds
- Added better logging for debugging
- Auto-hides progress bar 2 seconds after completion

---

---

## 🎯 **Implementation Priority**

### **Session 1** (Critical Issues - Must Fix First)
1. ✅ **Issue #4**: Restore classification progress bar (**COMPLETED**)
2. ✅ **Issue #1**: Fix chat infinite scroll (**COMPLETED**)  
3. ✅ **Issue #2**: Fix inbox infinite scroll (**COMPLETED**)
4. ✅ **Issue #3**: Improve email preview layout (**COMPLETED**)
5. 🔄 **Issue #5**: Clean up TypeScript 'any' types (**IN PROGRESS** - 7/29 any types fixed)

---

## 🔧 **Later/Lower Priority Issues**

### Issue #6: ESLint Warnings Cleanup
**Priority**: LOW (Technical Debt)  
**Status**: 🟡 Ready for Later Implementation  

**Problem**: 45+ TypeScript warnings about explicit 'any' types  
**Impact**: Reduces type safety and code maintainability but doesn't affect user experience  

**Major Files Needing Cleanup**:
- `src/app/api/chat/route.ts` (6 instances)
- `src/app/api/chat-stream/route.ts` (4 instances) 
- `src/lib/database.ts` (7 instances)
- `src/components/widgets/CalendarWidget.tsx` (3 instances)

**Solution**: Replace `any` types with proper TypeScript interfaces  
**Estimated Time**: 2-3 hours total

### Issue #6: ESLint Warnings Cleanup
**Priority**: LOW (Technical Debt)  
**Status**: 🟡 Ready for Later Implementation  

**Problem**: 40+ ESLint warnings (unused variables, missing dependencies, etc.)  
**Impact**: Code cleanliness but no functional issues  
**Estimated Time**: 1-2 hours

---

## 🔧 **Technical Notes**

### Database Architecture Confirmed Working
- Database properly stores email-tag relationships
- Classification service correctly updates database
- Frontend should pull from database state, not manage classification

### UI State Management  
- Classification status should be polled/streamed from backend
- Frontend displays database state + classification progress
- User actions (training examples, category changes) update database immediately

### Background Process Visibility
- Auto-classification runs on login when unclassified emails detected  
- Progress should be visible to user during this process
- Classification completion should trigger UI refresh

---

## ✅ **Completion Criteria**

This document can be archived when:
- [x] **Chat and inbox have proper internal scrolling (no page growth)** ✅ COMPLETED
- [x] **Email previews display cleanly with proper text wrapping** ✅ COMPLETED  
- [x] **Classification progress is visible to users during background processing** ✅ COMPLETED
- [ ] All TypeScript 'any' types replaced with proper interfaces (IN PROGRESS - 75% complete)
- [x] **UI consistently reflects database state without frontend classification logic** ✅ COMPLETED

**Progress**: 4/5 criteria completed (80%)  
**Time Invested**: ~4 hours  
**Remaining Work**: Complete TypeScript any types cleanup (~2 hours)