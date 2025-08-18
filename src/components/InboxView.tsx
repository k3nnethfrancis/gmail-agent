'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Mail,
  Tag,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Edit3,
  Star,
  Archive
} from 'lucide-react';

interface EmailThread {
  id: string;
  subject: string;
  fromAddress: string;
  fromName?: string;
  snippet: string;
  receivedAt: string;
  isUnread: boolean;
  tags?: Array<{
    id: number;
    name: string;
    color: string;
    assignedBy?: string;
    confidence?: number;
    reasoning?: string;
  }>;
}

interface TagRecord {
  id: number;
  name: string;
  color: string;
  description?: string;
  isSystemTag: boolean;
  emailCount: number;
}

export default function InboxView() {
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'unassigned'>('unassigned');
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Email actions states
  const [editingEmailCategory, setEditingEmailCategory] = useState<string | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isRunningClassification, setIsRunningClassification] = useState(false);
  
  // Bulk selection states
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isSelectAllMode, setIsSelectAllMode] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const runInitialSetup = async () => {
      try {
        setIsLoading(true);
        setError(null);

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

        // Step 3: Check for unclassified emails and run classification
        const classifyCheckResponse = await fetch('/api/classify/status', {
          credentials: 'include'
        });
        
        if (classifyCheckResponse.ok) {
          const { unclassifiedEmails } = await classifyCheckResponse.json();
          
          if (unclassifiedEmails > 0) {
            console.warn(`🤖 Auto-classifying ${unclassifiedEmails} unclassified emails...`);
            
            // Step 4: Run auto-classification
            const classifyResponse = await fetch('/api/classify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ force: true }),
              credentials: 'include'
            });
            
            if (classifyResponse.ok) {
              const classifyResult = await classifyResponse.json();
              console.warn(`✅ Auto-classification completed: ${classifyResult.classified} emails classified`);
            } else {
              console.warn('⚠️ Auto-classification failed, emails will remain unclassified');
            }
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
  }, [fetchData]);

  // Helper function to format dates safely
  const formatEmailDate = (dateString: string): string => {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Helper function to get sender display name
  const getSenderName = (email: EmailThread): string => {
    if (email.fromName && email.fromName.trim()) {
      return email.fromName;
    }
    if (email.fromAddress) {
      // Extract name from email address if it's in "Name <email@domain.com>" format
      const match = email.fromAddress.match(/^"?([^"<]+)"?\s*<?([^>]+)>?$/);
      if (match && match[1] && match[1].trim() && match[1] !== match[2]) {
        return match[1].trim();
      }
      return email.fromAddress;
    }
    return 'Unknown Sender';
  };

  // Filter emails by selected category
  const filteredEmails = emails.filter(email => {
    if (selectedCategory === 'unassigned') {
      return !email.tags || email.tags.length === 0;
    }
    return email.tags?.some(tag => tag.id === selectedCategory);
  });

  // Handle creating new category and assigning email
  const handleCreateAndAssignCategory = async (emailId: string, categoryName: string, replaceExisting = false) => {
    if (!categoryName.trim()) return;

    try {
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      // If replacing existing tags, remove all current tags first
      if (replaceExisting && email.tags && email.tags.length > 0) {
        for (const tag of email.tags) {
          const removeResponse = await fetch('/api/emails', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emailId,
              action: 'removeTag',
              tagId: tag.id
            })
          });
          
          if (!removeResponse.ok) {
            console.warn(`Failed to remove tag ${tag.name}`);
          }
        }
      }

      // Check if category exists
      const existingTag = tags.find(tag => 
        tag.name.toLowerCase() === categoryName.trim().toLowerCase()
      );

      let tagId: number;

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        // Create new category
        const createResponse = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryName.trim(),
            color: '#3b82f6',
            description: `User-created category`
          })
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create category');
        }

        const newTag = await createResponse.json();
        tagId = newTag.tag.id;
      }

      // Assign email to category
      const assignResponse = await fetch('/api/emails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId,
          action: 'addTag',
          tagId
        })
      });

      if (!assignResponse.ok) {
        throw new Error('Failed to assign category');
      }

      // Refresh data and reset editing state
      await fetchData();
      setEditingEmailCategory(null);
      setNewCategoryInput('');
    } catch (error) {
      console.error('Error creating/assigning category:', error);
      setError(error instanceof Error ? error.message : 'Failed to assign category');
    }
  };

  // Handle marking email as training example
  const handleMarkAsExample = async (emailId: string) => {
    console.warn(`🌟 Star button clicked for email: ${emailId}`);
    try {
      const email = emails.find(e => e.id === emailId);
      console.warn(`📧 Email found: ${email?.subject}, Tags: ${email?.tags?.map(t => `${t.name}(${t.assignedBy})`).join(', ')}`);
      
      // Mark this email-tag combination as a training example
      const response = await fetch('/api/training-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
        credentials: 'include'
      });

      console.warn(`🔗 API response status: ${response.status}`);
      const responseData = await response.json();
      console.warn(`📊 API response:`, responseData);

      if (response.ok) {
        // Show visual feedback
        const tagNames = email?.tags?.map(t => t.name).join(', ') || 'untagged';
        console.warn(`✅ Email marked as training example: "${email?.subject}" → [${tagNames}]`);
        
        // Refresh to show updated state
        await fetchData();
      } else {
        throw new Error(responseData.error || 'Failed to mark as training example');
      }
    } catch (error) {
      console.error('Error marking as example:', error);
      setError(error instanceof Error ? error.message : 'Failed to mark as training example');
    }
  };

  // Handle running classification
  const handleRunClassification = async () => {
    try {
      setIsRunningClassification(true);
      setError(null);
      
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to run classification');
      }

      const result = await response.json();
      
      if (result.success) {
        // Refresh data to show new classifications
        await fetchData();
        alert(`Classification complete! ${result.classified || 0} emails classified.`);
      } else {
        throw new Error(result.message || 'Classification failed');
      }
    } catch (error) {
      console.error('Error running classification:', error);
      setError(error instanceof Error ? error.message : 'Classification failed');
    } finally {
      setIsRunningClassification(false);
    }
  };

  // Bulk selection helper functions
  const toggleEmailSelection = (emailId: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const selectAllEmails = () => {
    const allEmailIds = new Set(filteredEmails.map(email => email.id));
    setSelectedEmails(allEmailIds);
    setIsSelectAllMode(true);
  };

  const clearSelection = () => {
    setSelectedEmails(new Set());
    setIsSelectAllMode(false);
  };

  const handleBulkReclassify = async () => {
    if (selectedEmails.size === 0) return;
    
    try {
      setIsRunningClassification(true);
      
      // Run classification on selected emails
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emailIds: Array.from(selectedEmails),
          force: true 
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.warn(`✅ Bulk reclassification completed: ${result.classified} emails reclassified`);
        
        // Clear selection and refresh data
        clearSelection();
        await fetchData();
      } else {
        throw new Error('Bulk reclassification failed');
      }
      
    } catch (error) {
      console.error('Bulk reclassification error:', error);
      setError(error instanceof Error ? error.message : 'Bulk reclassification failed');
    } finally {
      setIsRunningClassification(false);
    }
  };

  if (isLoading) {
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
              onClick={handleRunClassification}
              disabled={isRunningClassification}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningClassification ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Star className="w-4 h-4 mr-2" />
              )}
              {isRunningClassification ? 'Classifying...' : 'Run Classification'}
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={fetchData}
              disabled={isRunningClassification}
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedEmails.size > 0 && (
        <div className="mx-4 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-blue-700 font-medium">
                {selectedEmails.size} email{selectedEmails.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkReclassify}
                disabled={isRunningClassification}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunningClassification ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Reclassifying...
                  </>
                ) : (
                  <>
                    <Tag className="w-4 h-4 mr-2" />
                    Reclassify Selected
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 border-r border-gray-200 bg-gray-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Categories</h2>
              <button
                onClick={() => {
                  const categoryName = prompt('Enter new category name:');
                  if (categoryName && categoryName.trim()) {
                    // Create a dummy email to trigger category creation
                    handleCreateAndAssignCategory('dummy', categoryName.trim());
                  }
                }}
                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                title="Create new category"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {/* Unassigned Category - Only show if there are unassigned emails */}
              {(() => {
                const unassignedCount = emails.filter(email => !email.tags || email.tags.length === 0).length;
                return unassignedCount > 0 ? (
                  <button
                    onClick={() => setSelectedCategory('unassigned')}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCategory === 'unassigned' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded-full bg-gray-400" />
                        <div>
                          <p className="font-medium">Unassigned</p>
                          <p className="text-xs text-gray-600">Needs categorization</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium">
                        {unassignedCount}
                      </span>
                    </div>
                  </button>
                ) : null;
              })()}

              {/* User Categories */}
              {tags
                .filter(tag => tag.emailCount > 0) // Hide empty categories
                .sort((a, b) => b.emailCount - a.emailCount) // Sort by email count (most to least)
                .map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedCategory(tag.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedCategory === tag.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div>
                        <p className="font-medium">{tag.name}</p>
                        {tag.description && (
                          <p className="text-xs text-gray-600">{tag.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium">{tag.emailCount}</span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Help Text */}
            <div className="mt-6 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <p className="font-medium mb-2">How to use:</p>
              <ul className="space-y-1">
                <li>• Hover over emails to see actions</li>
                <li>• Click 🏷️ to change category (type to create new)</li>
                <li>• Click ⭐ to mark as training example</li>
                <li>• Use "Run Classification" to auto-categorize</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                {selectedCategory === 'unassigned' 
                  ? `Unassigned (${filteredEmails.length})`
                  : `${tags.find(t => t.id === selectedCategory)?.name || 'Category'} (${filteredEmails.length})`
                }
              </h2>
              
              {/* Bulk Selection Controls */}
              {filteredEmails.length > 0 && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={selectAllEmails}
                    disabled={selectedEmails.size === filteredEmails.length}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Select all
                  </button>
                  {selectedEmails.size > 0 && (
                    <button
                      onClick={clearSelection}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Select none
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredEmails.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No emails in this category
                  </h3>
                  <p className="text-gray-600">
                    {selectedCategory === 'unassigned' 
                      ? 'All emails have been categorized!'
                      : 'No emails found in this category.'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`p-4 hover:bg-gray-50 transition-colors group relative ${
                      selectedEmails.has(email.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Checkbox */}
                      <div className="mt-1 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedEmails.has(email.id)}
                          onChange={() => toggleEmailSelection(email.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      {/* Email Content */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedEmail(selectedEmail?.id === email.id ? null : email)}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          {email.isUnread && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                          <p className={`text-sm truncate ${
                            email.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                          }`}>
                            {getSenderName(email)}
                          </p>
                          <span className="text-xs text-gray-400">
                            {formatEmailDate(email.receivedAt)}
                          </span>
                          {/* Training Example Indicator */}
                          {email.tags?.some(tag => tag.assignedBy === 'user') && (
                            <div className="w-3 h-3 bg-yellow-400 rounded-full" 
                                 title="Training example" />
                          )}
                        </div>
                        
                        <h3 className={`text-sm truncate mb-1 ${
                          email.isUnread ? 'font-medium text-gray-900' : 'text-gray-700'
                        }`}>
                          {email.subject}
                        </h3>
                        
                        <p className="text-sm text-gray-600 truncate">
                          {email.snippet}
                        </p>

                        {/* Tags */}
                        {email.tags && email.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {email.tags.map(tag => (
                              <button
                                key={tag.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEmailCategory(email.id);
                                  setNewCategoryInput(tag.name);
                                }}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium hover:opacity-80 transition-opacity"
                                style={{ 
                                  backgroundColor: `${tag.color}20`,
                                  color: tag.color
                                }}
                                title="Click to edit category"
                              >
                                {tag.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Hover Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2 ml-4 flex-shrink-0">
                        {/* Change Category */}
                        {editingEmailCategory === email.id ? (
                          <div className="absolute right-4 top-4 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-10">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={newCategoryInput}
                                onChange={(e) => setNewCategoryInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCreateAndAssignCategory(email.id, newCategoryInput, true);
                                  } else if (e.key === 'Escape') {
                                    setEditingEmailCategory(null);
                                    setNewCategoryInput('');
                                  }
                                }}
                                placeholder="Type category name..."
                                className="text-xs px-3 py-1 border border-gray-300 rounded w-32"
                                autoFocus
                              />
                              <button
                                onClick={() => handleCreateAndAssignCategory(email.id, newCategoryInput, true)}
                                className="text-green-600 hover:text-green-700 p-1"
                                title="Save"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingEmailCategory(null);
                                  setNewCategoryInput('');
                                }}
                                className="text-gray-500 hover:text-gray-700 p-1"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEmailCategory(email.id);
                                setNewCategoryInput('');
                              }}
                              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Change category"
                            >
                              <Tag className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsExample(email.id);
                              }}
                              className="p-1 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                              title="Mark as training example"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open email (this would navigate to email detail view)
                                console.log('Opening email:', email.id);
                              }}
                              className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Open email"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}