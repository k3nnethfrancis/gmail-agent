'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  Inbox, 
  Clock, 
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import WidgetFrame, { WidgetMode } from './WidgetFrame';

interface EmailThread {
  id: string;
  subject: string;
  fromAddress: string;
  fromName?: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
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
  emailCount: number;
}

interface InboxWidgetProps {
  mode: WidgetMode;
  onModeChange: (mode: WidgetMode) => void;
}

export default function InboxWidget({ mode, onModeChange }: InboxWidgetProps) {
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'unassigned'>('unassigned');
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch emails and tags
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch emails
      const emailsResponse = await fetch('/api/emails?limit=200');
      if (!emailsResponse.ok) throw new Error('Failed to fetch emails');
      const emailsData = await emailsResponse.json();
      
      // Fetch tags with stats
      const tagsResponse = await fetch('/api/tags?includeStats=true');
      if (!tagsResponse.ok) throw new Error('Failed to fetch tags');
      const tagsData = await tagsResponse.json();

      setEmails(emailsData.emails || []);
      setTags(tagsData.tags || []);

      // Check if auto-classification is needed (engineering requirement)
      try {
        const classifyResponse = await fetch('/api/classify', { 
          method: 'GET',
          credentials: 'include'
        });
        if (classifyResponse.ok) {
          const classifyData = await classifyResponse.json();
          if (classifyData.classificationNeeded) {
            console.warn('🤖 Auto-classification needed, triggering background classification...');
            // Trigger auto-classification in background
            fetch('/api/classify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ force: false })
            }).catch(err => console.error('Background classification failed:', err));
          }
        }
      } catch (classifyError) {
        console.warn('Auto-classification check failed:', classifyError);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []); // Only run once on mount

  // Get emails for selected category
  const getFilteredEmails = () => {
    if (selectedCategory === 'unassigned') {
      return emails.filter(email => !email.tags || email.tags.length === 0);
    }
    return emails.filter(email => 
      email.tags && email.tags.some(tag => tag.id === selectedCategory)
    );
  };

  // Get unread count for category
  const getUnreadCount = (categoryId: number | 'unassigned') => {
    const categoryEmails = categoryId === 'unassigned' 
      ? emails.filter(email => !email.tags || email.tags.length === 0)
      : emails.filter(email => email.tags && email.tags.some(tag => tag.id === categoryId));
    
    return categoryEmails.filter(email => email.isUnread).length;
  };

  // Render email list for peek/expanded modes
  const renderEmailList = (limit?: number) => {
    const filteredEmails = getFilteredEmails();
    const displayEmails = limit ? filteredEmails.slice(0, limit) : filteredEmails;

    if (displayEmails.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No emails in this category</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {displayEmails.map((email) => (
          <div
            key={email.id}
            onClick={() => {
              setSelectedEmail(email);
              if (mode !== 'focused') onModeChange('focused');
            }}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  {email.isUnread && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                  <p className={`text-sm truncate ${email.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {email.fromName || email.fromAddress}
                  </p>
                </div>
                <p className={`text-sm truncate mt-1 ${email.isUnread ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                  {email.subject}
                </p>
                <p className="text-xs text-gray-600 truncate mt-1">
                  {email.snippet}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                <span className="text-xs text-gray-400">
                  {new Date(email.receivedAt).toLocaleDateString()}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render email reader for focused mode
  const renderEmailReader = () => {
    if (!selectedEmail) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select an email to read</p>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <button
            onClick={() => setSelectedEmail(null)}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-3"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to emails
          </button>
          
          <h2 className="text-lg font-semibold">{selectedEmail.subject}</h2>
          <p className="text-sm text-gray-600 mt-1">
            From: {selectedEmail.fromName || selectedEmail.fromAddress}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(selectedEmail.receivedAt).toLocaleString()}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {selectedEmail.bodyText ? (
            <div className="whitespace-pre-wrap text-sm">
              {selectedEmail.bodyText}
            </div>
          ) : selectedEmail.bodyHtml ? (
            <div 
              className="text-sm prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
            />
          ) : (
            <div className="text-sm text-gray-600">
              {selectedEmail.snippet}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <WidgetFrame
        title="Inbox"
        mode={mode}
        onModeChange={onModeChange}
        icon={<Mail className="w-4 h-4" />}
      >
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </WidgetFrame>
    );
  }

  if (error) {
    return (
      <WidgetFrame
        title="Inbox"
        mode={mode}
        onModeChange={onModeChange}
        icon={<Mail className="w-4 h-4" />}
      >
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Try again
          </button>
        </div>
      </WidgetFrame>
    );
  }

  const categoryName = selectedCategory === 'unassigned' 
    ? 'Unassigned' 
    : tags.find(t => t.id === selectedCategory)?.name || 'Unknown';

  return (
    <WidgetFrame
      title={mode === 'focused' && selectedEmail ? selectedEmail.subject : `Inbox • ${categoryName}`}
      mode={mode}
      onModeChange={onModeChange}
      icon={<Mail className="w-4 h-4" />}
      actions={
        <button
          onClick={fetchData}
          className="p-1 text-gray-500 hover:text-gray-700"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      }
    >
      {mode === 'peek' && (
        <div className="space-y-3">
          {/* Category selector */}
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory('unassigned')}
              className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                selectedCategory === 'unassigned' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Inbox className="w-4 h-4" />
                  <span className="font-medium">Unassigned</span>
                </div>
                <span className="text-xs text-gray-500">{getUnreadCount('unassigned')}</span>
              </div>
            </button>
            
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedCategory(tag.id)}
                className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === tag.id 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-medium">{tag.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{getUnreadCount(tag.id)}</span>
                </div>
              </button>
            ))}
          </div>
          
          {/* Recent emails preview */}
          <div>
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
              Recent in {categoryName}
            </h4>
            {renderEmailList(3)}
          </div>
        </div>
      )}

      {mode === 'expanded' && (
        <div className="space-y-4">
          {/* Category selector */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('unassigned')}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === 'unassigned' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800'
              }`}
            >
              Unassigned ({getUnreadCount('unassigned')})
            </button>
            
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedCategory(tag.id)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === tag.id 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                {tag.name} ({getUnreadCount(tag.id)})
              </button>
            ))}
          </div>
          
          {/* Email list */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              {categoryName} ({getFilteredEmails().length})
            </h3>
            {renderEmailList()}
          </div>
        </div>
      )}

      {mode === 'focused' && renderEmailReader()}
    </WidgetFrame>
  );
}