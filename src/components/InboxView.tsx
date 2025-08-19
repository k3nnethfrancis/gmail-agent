'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  RefreshCw,
  CircleHelp
} from 'lucide-react';

// Import extracted components and hooks
import { useEmailActions, EmailThread, TagRecord } from '../hooks/useEmailActions';
import { useInboxState } from '../hooks/useInboxState';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { formatEmailDate, getSenderName } from '../utils/emailFormatters';
import ErrorDisplay from './ErrorDisplay';
import ClassificationProgress from './ClassificationProgress';
import BulkActionToolbar from './email/BulkActionToolbar';
import CategorySidebar from './email/CategorySidebar';
import EmailList from './email/EmailList';

export default function InboxView() {
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'unassigned' | 'all'>('all');
  const [counts, setCounts] = useState<{ total: number; unread: number; important: number; unassigned: number } | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null);

  // Initialize unified state management and error handling
  const inboxState = useInboxState();
  const errorHandler = useErrorHandler();

  // Fetch data with enhanced error handling - memoized to prevent recreations
  const fetchData = useCallback(async () => {
    
    const result = await errorHandler.handleAsyncOperation(
      async () => {
        inboxState.setLoading();

        const [emailsResponse, tagsResponse] = await Promise.all([
          fetch('/api/emails?limit=200'),
          fetch('/api/tags?includeStats=true')
        ]);

        if (!emailsResponse.ok || !tagsResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const emailsData = await emailsResponse.json();
        const tagsData = await tagsResponse.json();

        setEmails(emailsData.emails || []);
        setTags(tagsData.tags || []);
        setCounts(emailsData.counts || null);
        
        return { emails: emailsData.emails, tags: tagsData.tags };
      },
      {
        context: 'fetch_data',
        retryAttempts: 2,
        retryDelay: 1000,
      }
    );

    inboxState.setIdle();
    return result;
  }, [errorHandler, inboxState]); // Minimal stable dependencies

  // Create stable refresh function that doesn't recreate
  const stableRefresh = useCallback(async () => {
    
    try {
      const [emailsResponse, tagsResponse] = await Promise.all([
        fetch('/api/emails?limit=200'),
        fetch('/api/tags?includeStats=true')
      ]);
      if (emailsResponse.ok && tagsResponse.ok) {
        const emailsData = await emailsResponse.json();
        const tagsData = await tagsResponse.json();
        setEmails(emailsData.emails || []);
        setTags(tagsData.tags || []);
        setCounts(emailsData.counts || null);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  }, []); // No dependencies to prevent infinite recreation

  // Initialize email actions hook with stable references to prevent re-renders
  const emailActions = useEmailActions({
    emails,
    tags,
    onDataRefresh: stableRefresh,
    onError: errorHandler.handleError,
    inboxState
  });

  // StrictMode-proof initialization guard
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    console.warn('🔄 InboxView: useEffect triggered - checking initialization guard');
    if (hasInitializedRef.current) {
      console.warn('🚫 InboxView: Initialization already completed, skipping');
      return; // Prevent re-entry in dev StrictMode
    }
    hasInitializedRef.current = true;
    console.warn('✅ InboxView: Starting one-time initialization');

    const runInitialSetup = async () => {
      try {
        inboxState.setLoading();
        errorHandler.clearError();

        // Step 1: Check if emails exist in database
        const emailCheckResponse = await fetch('/api/emails?limit=1');
        const { emails: existingEmails } = await emailCheckResponse.json();
        
        if (!existingEmails || existingEmails.length === 0) {
          console.warn('🔄 No emails found - syncing from Gmail...');
          // Step 2: Sync emails from Gmail if none exist
          const syncResponse = await fetch('/api/emails/sync', { 
            method: 'POST',
            credentials: 'include' 
          });
          
          if (!syncResponse.ok) {
            console.warn('📧 Email sync failed, continuing with empty inbox');
          } else {
            console.warn('✅ Email sync completed');
          }
        }

        // Step 3: Check for unclassified emails and start classification in background
        const classifyCheckResponse = await fetch('/api/classify/status', {
          credentials: 'include'
        });
        
        if (classifyCheckResponse.ok) {
          const { unclassifiedEmails } = await classifyCheckResponse.json();
          
          if (unclassifiedEmails > 0) {
            console.warn(`🤖 Starting background classification of ${unclassifiedEmails} unclassified emails...`);
            
            // Step 4: Start auto-classification in background (don't await)
            fetch('/api/classify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ force: true }),
              credentials: 'include'
            }).then(classifyResponse => {
              if (classifyResponse.ok) {
                return classifyResponse.json().then(classifyResult => {
                  console.warn(`✅ Background classification completed: ${classifyResult.classified} emails classified`);
                  // Refresh data when classification is done - inline to avoid fetchData dependency
                  const refreshData = async () => {
                    try {
                      const [emailsResponse, tagsResponse] = await Promise.all([
                        fetch('/api/emails?limit=200'),
                        fetch('/api/tags?includeStats=true')
                      ]);
                      if (emailsResponse.ok && tagsResponse.ok) {
                        const emailsData = await emailsResponse.json();
                        const tagsData = await tagsResponse.json();
                        setEmails(emailsData.emails || []);
                        setTags(tagsData.tags || []);
                        setCounts(emailsData.counts || null);
                      }
                    } catch (error) {
                      console.error('Failed to refresh after classification:', error);
                    }
                  };
                  refreshData();
                });
              } else {
                console.warn('⚠️ Background classification failed, emails will remain unclassified');
              }
            }).catch(error => {
              console.error('Background classification error:', error);
            });
          }
        }

        // Step 5: Load final data for display
        await fetchData();

      } catch (error) {
        console.error('Initial setup error:', error);
        // Fall back to regular data fetch
        await fetchData();
      }
    };

    runInitialSetup();
  }, []); // Run only once on mount - no dependencies
  
  // Add component lifecycle debugging
  useEffect(() => {
    console.warn('🎆 InboxView: Component mounted');
    return () => {
      console.warn('📍 InboxView: Component unmounting');
    };
  }, []);


  // Memoize expensive filtering operation to prevent recalculation on every render
  const filteredEmails = useMemo(() =>
    emails.filter(email => {
      if (selectedCategory === 'all') {
        return true; // Show all emails
      }
      if (selectedCategory === 'unassigned') {
        return !email.tags || email.tags.length === 0;
      }
      return email.tags?.some(tag => tag.id === selectedCategory);
    }),
    [emails, selectedCategory]
  );

  // Memoize selected category name lookup
  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === 'all') return 'All Emails';
    if (selectedCategory === 'unassigned') return 'Unassigned';
    return tags.find(t => t.id === selectedCategory)?.name || 'Category';
  }, [selectedCategory, tags]);



  if (inboxState.isLoading) {
    return (
      <div className="h-full flex bg-card">
        {/* Sidebar skeleton */}
        <div className="w-64 border-r border-border bg-muted p-4 hidden sm:block">
          <div className="h-5 w-28 bg-border rounded mb-4 animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg mb-2 bg-card animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-border" />
                <div className="h-4 w-36 bg-border rounded" />
              </div>
              <div className="h-4 w-6 bg-border rounded" />
            </div>
          ))}
        </div>
        {/* List skeleton */}
        <div className="flex-1 p-6 space-y-4 bg-card">
          <div className="h-6 w-48 bg-border rounded animate-pulse" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border border-border rounded p-4 space-y-2 animate-pulse">
              <div className="h-4 w-64 bg-border rounded" />
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-5/6 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">Inbox</h1>
            {/* Help tooltip */}
            <div className="relative group">
              <button
                aria-label="How to use Inbox"
                className="p-1 text-muted-foreground hover:text-foreground rounded"
              >
                <CircleHelp className="w-4 h-4" />
              </button>
              <div
                role="tooltip"
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 rounded-md border border-border bg-card p-3 text-xs text-foreground shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-20"
              >
                <p className="font-medium mb-1">How to use</p>
                <ul className="list-disc ps-4 space-y-1 text-muted-foreground">
                  <li>Hover over an email to tag or star as a training example</li>
                  <li>Click 🏷️ to change category; type to create a new one</li>
                  <li>Use “Run Classification” to auto-categorize unassigned emails</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Reclassify All Button (overwrite) */}
            <button
              onClick={emailActions.handleRunClassification}
              disabled={inboxState.isClassifying || !inboxState.canStartClassification}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {inboxState.isClassifying ? 'Reclassifying…' : 'Reclassify'}
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={stableRefresh}
              disabled={!inboxState.isIdle}
              className="p-2 text-muted-foreground hover:text-foreground border border-border rounded-lg disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Error Display */}
      {errorHandler.error && (
        <ErrorDisplay
          error={errorHandler.error}
          onClear={errorHandler.clearError}
          onRetry={stableRefresh}
        />
      )}

      <ClassificationProgress onComplete={stableRefresh} />

      {/* Bulk Actions Toolbar */}
      <BulkActionToolbar
        selectedCount={emailActions.selectedEmails.size}
        isRunningClassification={inboxState.isClassifying}
        onClearSelection={emailActions.clearSelection}
        onBulkReclassify={emailActions.handleBulkReclassify}
      />

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Categories Sidebar */}
        <CategorySidebar
          emails={emails}
          tags={tags}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          onCreateCategory={emailActions.handleCreateAndAssignCategory}
          counts={counts ?? undefined}
        />

        {/* Email List */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">
                {selectedCategoryName} ({selectedCategory === 'all' ? (counts?.total ?? filteredEmails.length) : filteredEmails.length})
              </h2>
              
              {/* Bulk Selection Controls */}
              {filteredEmails.length > 0 && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => emailActions.selectAllEmails(filteredEmails)}
                    disabled={emailActions.selectedEmails.size === filteredEmails.length}
                    className="text-sm text-primary hover:opacity-90 disabled:text-muted-foreground disabled:cursor-not-allowed"
                  >
                    Select all
                  </button>
                  {emailActions.selectedEmails.size > 0 && (
                    <button
                      onClick={emailActions.clearSelection}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Select none
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <EmailList
            filteredEmails={filteredEmails}
            selectedCategory={selectedCategory}
            emailActions={emailActions}
            formatEmailDate={formatEmailDate}
            getSenderName={getSenderName}
            selectedEmail={selectedEmail}
            onEmailSelect={setSelectedEmail}
            itemsPerPage={25}
          />
        </div>
      </div>
    </div>
  );
}