'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Tag,
  Plus,
  Mail,
  CheckCircle2,
  X,
  RefreshCw,
  AlertCircle,
  Save
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

export default function ClassificationView() {
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAutoClassifying, setIsAutoClassifying] = useState(false);

  // Tag creation state
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const predefinedColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
  ];

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch emails (prioritize untagged emails)
      const emailsResponse = await fetch('/api/emails?limit=200');
      if (!emailsResponse.ok) throw new Error('Failed to fetch emails');
      const emailsData = await emailsResponse.json();
      
      // Fetch tags with stats
      const tagsResponse = await fetch('/api/tags?includeStats=true');
      if (!tagsResponse.ok) throw new Error('Failed to fetch tags');
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
    fetchData();
  }, [fetchData]);

  // Create new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      setIsCreatingTag(true);
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
          description: newTagDescription.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tag');
      }

      // Reset form and refresh data
      setNewTagName('');
      setNewTagColor('#3b82f6');
      setNewTagDescription('');
      setShowCreateTag(false);
      await fetchData();
    } catch (error) {
      console.error('Error creating tag:', error);
      setError(error instanceof Error ? error.message : 'Failed to create tag');
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Assign selected emails to tag
  const handleAssignToTag = async () => {
    if (!selectedTag || selectedEmails.size === 0) return;

    try {
      setIsAssigning(true);
      
      // Assign each selected email to the tag
      const promises = Array.from(selectedEmails).map(emailId =>
        fetch('/api/emails', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailId,
            action: 'addTag',
            tagId: selectedTag
          })
        })
      );

      await Promise.all(promises);
      
      // Clear selection and refresh data
      setSelectedEmails(new Set());
      setSelectedTag(null);
      await fetchData();
    } catch (error) {
      console.error('Error assigning tags:', error);
      setError('Failed to assign tags to emails');
    } finally {
      setIsAssigning(false);
    }
  };

  // Auto-classify emails using LLM
  const handleAutoClassify = async () => {
    try {
      setIsAutoClassifying(true);
      setError(null);
      
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Auto-classification failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Clear selection and refresh data to show new classifications
        setSelectedEmails(new Set());
        setSelectedTag(null);
        await fetchData();
      } else {
        throw new Error(result.message || 'Auto-classification failed');
      }
    } catch (error) {
      console.error('Error auto-classifying emails:', error);
      setError(error instanceof Error ? error.message : 'Auto-classification failed');
    } finally {
      setIsAutoClassifying(false);
    }
  };

  // Toggle email selection
  const toggleEmailSelection = (emailId: string) => {
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(emailId)) {
      newSelection.delete(emailId);
    } else {
      newSelection.add(emailId);
    }
    setSelectedEmails(newSelection);
  };

  // Get untagged emails for easy assignment
  const untaggedEmails = emails.filter(email => !email.tags || email.tags.length === 0);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading emails and categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Email Classification
          </h1>

          <div className="flex items-center space-x-3">
            {selectedEmails.size > 0 && selectedTag && (
              <button
                onClick={handleAssignToTag}
                disabled={isAssigning}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isAssigning ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Assign {selectedEmails.size} email{selectedEmails.size !== 1 ? 's' : ''}
              </button>
            )}

            {untaggedEmails.length > 0 && (
              <button
                onClick={handleAutoClassify}
                disabled={isAutoClassifying}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isAutoClassifying ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Auto-Classify {untaggedEmails.length} Emails
              </button>
            )}
            
            <button
              onClick={() => setShowCreateTag(true)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Category
            </button>

            <button
              onClick={fetchData}
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
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

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 h-full">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Categories</h2>
              
              <div className="space-y-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTag === tag.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <div>
                          <p className="font-medium text-gray-900">{tag.name}</p>
                          {tag.description && (
                            <p className="text-xs text-gray-600">{tag.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{tag.emailCount}</p>
                        <p className="text-xs text-gray-600">emails</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selection Info */}
              {selectedEmails.size > 0 && (
                <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    {selectedEmails.size} email{selectedEmails.size !== 1 ? 's' : ''} selected
                  </p>
                  {selectedTag && (
                    <p className="text-xs text-blue-700 mt-1">
                      Will be assigned to: {tags.find(t => t.id === selectedTag)?.name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Email List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow h-full flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    Untagged Emails ({untaggedEmails.length})
                  </h2>
                  {selectedEmails.size > 0 && (
                    <button
                      onClick={() => setSelectedEmails(new Set())}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {untaggedEmails.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        All emails are categorized!
                      </h3>
                      <p className="text-gray-600">
                        There are no untagged emails to classify.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {untaggedEmails.map((email) => (
                      <div
                        key={email.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          selectedEmails.has(email.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedEmails.has(email.id)}
                            onChange={() => toggleEmailSelection(email.id)}
                            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              {email.isUnread && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                              <p className={`text-sm truncate ${
                                email.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                              }`}>
                                {email.fromName || email.fromAddress}
                              </p>
                              <span className="text-xs text-gray-400">
                                {new Date(email.receivedAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <h3 className={`text-sm truncate mb-1 ${
                              email.isUnread ? 'font-medium text-gray-900' : 'text-gray-700'
                            }`}>
                              {email.subject}
                            </h3>
                            
                            <p className="text-sm text-gray-600 truncate">
                              {email.snippet}
                            </p>
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
      </div>

      {/* Create Tag Modal */}
      {showCreateTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Category</h3>
              <button
                onClick={() => setShowCreateTag(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Work, Personal, Newsletters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newTagColor === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newTagDescription}
                  onChange={(e) => setNewTagDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of this category..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateTag(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || isCreatingTag}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {isCreatingTag ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Create Category'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}