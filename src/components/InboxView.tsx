'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RefreshCw,
  Star
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
  const [selectedCategory, setSelectedCategory] = useState<number | 'unassigned'>('unassigned');
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null);

  // Initialize unified state management and error handling
  const inboxState = useInboxState();
  const errorHandler = useErrorHandler();

  // Fetch data with enhanced error handling
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
  }, []); // Remove all dependencies to prevent cascade re-renders

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
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  }, []); // No dependencies to prevent infinite recreation

  // Initialize email actions hook
  const emailActions = useEmailActions({
    emails,
    tags,
    onDataRefresh: stableRefresh,
    onError: errorHandler.handleError,
    inboxState
  });

  useEffect(() => {
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


  // Memoize expensive filtering operation to prevent recalculation on every render
  const filteredEmails = useMemo(() =>
    emails.filter(email => {
      if (selectedCategory === 'unassigned') {
        return !email.tags || email.tags.length === 0;
      }
      return email.tags?.some(tag => tag.id === selectedCategory);
    }),
    [emails, selectedCategory]
  );

  // Memoize selected category name lookup
  const selectedCategoryName = useMemo(() =>
    selectedCategory === 'unassigned'
      ? 'Unassigned'
      : tags.find(t => t.id === selectedCategory)?.name || 'Category',
    [selectedCategory, tags]
  );



  if (inboxState.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Inbox
          </h1>
          <div className="flex items-center space-x-3">
            {/* Run Classification Button */}
            <button
              onClick={emailActions.handleRunClassification}
              disabled={inboxState.isClassifying || !inboxState.canStartClassification}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inboxState.isClassifying ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Star className="w-4 h-4 mr-2" />
              )}
              {inboxState.isClassifying ? 'Classifying...' : 'Run Classification'}
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={fetchData}
              disabled={!inboxState.isIdle}
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg disabled:opacity-50"
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
          onRetry={fetchData}
        />
      )}

      {/* Classification Progress */}
      <ClassificationProgress onComplete={stableRefresh} />

      {/* Bulk Actions Toolbar */}
      <BulkActionToolbar
        selectedCount={emailActions.selectedEmails.size}
        isRunningClassification={inboxState.isClassifying}
        onClearSelection={emailActions.clearSelection}
        onBulkReclassify={emailActions.handleBulkReclassify}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <CategorySidebar
          emails={emails}
          tags={tags}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          onCreateCategory={emailActions.handleCreateAndAssignCategory}
        />

        {/* Email List */}
        <div className="flex-1 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                {selectedCategoryName} ({filteredEmails.length})
              </h2>
              
              {/* Bulk Selection Controls */}
              {filteredEmails.length > 0 && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => emailActions.selectAllEmails(filteredEmails)}
                    disabled={emailActions.selectedEmails.size === filteredEmails.length}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Select all
                  </button>
                  {emailActions.selectedEmails.size > 0 && (
                    <button
                      onClick={emailActions.clearSelection}
                      className="text-sm text-gray-600 hover:text-gray-800"
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
          />
        </div>
      </div>
    </div>
  );
}