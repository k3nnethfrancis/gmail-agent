'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, Inbox, Archive, Sparkles, RefreshCw, Loader, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface EmailThread {
  id: string;
  snippet: string;
  historyId: string;
  subject?: string;
  from?: string;
  category?: string;
  confidence?: number;
  reasoning?: string;
  unread?: boolean;
  important?: boolean;
}

interface EmailClassification {
  threadId: string;
  category: string;
  confidence: number;
  reasoning?: string;
}

interface EmailBucket {
  name: string;
  icon: React.ReactNode;
  color: string;
  emails: EmailThread[];
  count: number;
}

interface EmailBucketsProps {
  className?: string;
}

const DEFAULT_BUCKETS = [
  { name: 'Important', color: 'bg-red-100 text-red-800', icon: <CheckCircle2 className="w-4 h-4" /> },
  { name: 'Can wait', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" /> },
  { name: 'Auto-archive', color: 'bg-gray-100 text-gray-800', icon: <Archive className="w-4 h-4" /> },
  { name: 'Newsletter', color: 'bg-blue-100 text-blue-800', icon: <Mail className="w-4 h-4" /> },
];

export default function EmailBuckets({ className = '' }: EmailBucketsProps) {
  const [buckets, setBuckets] = useState<EmailBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

  // Fetch recent email threads
  const fetchEmailThreads = useCallback(async (): Promise<EmailThread[]> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: 'Get my recent email threads for classification. Use list_threads with maxResults of 20.',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract threads from Claude's response
      // This is a simplified extraction - in practice, we'd parse Claude's response
      // For now, we'll make a direct API call to get threads
      return [];
    } catch (error) {
      console.error('Failed to fetch email threads:', error);
      throw error;
    }
  }, []);

  // Classify emails using our enhanced Claude-powered function
  const classifyEmails = useCallback(async (threads: EmailThread[]): Promise<EmailClassification[]> => {
    if (threads.length === 0) return [];
    
    try {
      setIsClassifying(true);
      const threadIds = threads.map(t => t.id);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: `Classify these email thread IDs: ${threadIds.join(', ')}. Use the classify_emails tool.`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Classification failed: ${response.status}`);
      }

      const data = await response.json();
      // Parse Claude's response for classifications
      // For now, return empty array - we'll integrate this properly
      return [];
    } catch (error) {
      console.error('Email classification failed:', error);
      throw error;
    } finally {
      setIsClassifying(false);
    }
  }, []);

  // Organize emails into buckets
  const organizeBuckets = useCallback((threads: EmailThread[], classifications: EmailClassification[]): EmailBucket[] => {
    const bucketMap = new Map<string, EmailThread[]>();
    
    // Initialize buckets
    DEFAULT_BUCKETS.forEach(bucket => {
      bucketMap.set(bucket.name, []);
    });

    // Classify threads into buckets
    threads.forEach(thread => {
      const classification = classifications.find(c => c.threadId === thread.id);
      const category = classification?.category || 'Can wait';
      
      // Add classification info to thread
      const enhancedThread = {
        ...thread,
        category,
        confidence: classification?.confidence,
        reasoning: classification?.reasoning,
      };

      const bucket = bucketMap.get(category);
      if (bucket) {
        bucket.push(enhancedThread);
      } else {
        // If category doesn't exist, add to "Can wait"
        bucketMap.get('Can wait')?.push(enhancedThread);
      }
    });

    // Convert to bucket format
    return DEFAULT_BUCKETS.map(bucketDef => ({
      name: bucketDef.name,
      icon: bucketDef.icon,
      color: bucketDef.color,
      emails: bucketMap.get(bucketDef.name) || [],
      count: bucketMap.get(bucketDef.name)?.length || 0,
    }));
  }, []);

  // Main fetch and classify function
  const fetchAndClassifyEmails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // For now, let's create some sample data to test the UI
      // In the final implementation, this will fetch real emails
      const sampleThreads: EmailThread[] = [
        {
          id: 'thread1',
          snippet: 'Important meeting tomorrow at 2pm',
          historyId: 'hist1',
          subject: 'Team Meeting Tomorrow',
          from: 'boss@company.com',
          unread: true,
          important: true,
        },
        {
          id: 'thread2',
          snippet: 'Your monthly newsletter with updates',
          historyId: 'hist2',
          subject: 'Monthly Newsletter - August',
          from: 'newsletter@service.com',
          unread: false,
        },
        {
          id: 'thread3',
          snippet: 'Receipt for your recent purchase',
          historyId: 'hist3',
          subject: 'Receipt #12345',
          from: 'noreply@store.com',
          unread: false,
        },
      ];

      // Sample classifications
      const sampleClassifications: EmailClassification[] = [
        { threadId: 'thread1', category: 'Important', confidence: 0.9, reasoning: 'Meeting from supervisor' },
        { threadId: 'thread2', category: 'Newsletter', confidence: 0.8, reasoning: 'Marketing newsletter' },
        { threadId: 'thread3', category: 'Auto-archive', confidence: 0.7, reasoning: 'Automated receipt' },
      ];

      const organizedBuckets = organizeBuckets(sampleThreads, sampleClassifications);
      setBuckets(organizedBuckets);
      setLastUpdated(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load emails';
      setError(errorMessage);
      console.error('Email fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organizeBuckets]);

  // Auto-fetch on component mount
  useEffect(() => {
    fetchAndClassifyEmails();
  }, [fetchAndClassifyEmails]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    fetchAndClassifyEmails();
  }, [fetchAndClassifyEmails]);

  if (isLoading) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Email Categories</h2>
          <Loader className="w-5 h-5 animate-spin text-gray-400" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Email Categories</h2>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center py-6">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button
            onClick={handleRefresh}
            className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Email Categories</h2>
        <div className="flex items-center space-x-2">
          {isClassifying && (
            <div className="flex items-center text-sm text-blue-600">
              <Sparkles className="w-4 h-4 animate-pulse mr-1" />
              Classifying...
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isClassifying}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isClassifying ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-500 mb-4">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      <div className="space-y-3">
        {buckets.map(bucket => (
          <div key={bucket.name} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50">
              <div className="flex items-center space-x-2">
                {bucket.icon}
                <span className="font-medium text-gray-900">{bucket.name}</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bucket.color}`}>
                  {bucket.count}
                </span>
              </div>
              {bucket.count > 0 && (
                <button className="text-xs text-gray-500 hover:text-gray-700">
                  View all
                </button>
              )}
            </div>
            
            {bucket.count > 0 && (
              <div className="p-3 space-y-2 max-h-32 overflow-y-auto">
                {bucket.emails.slice(0, 3).map(email => (
                  <div key={email.id} className="text-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {email.subject || 'No subject'}
                        </p>
                        <p className="text-gray-600 text-xs truncate">
                          {email.from || 'Unknown sender'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                          {email.snippet}
                        </p>
                        {email.confidence && (
                          <div className="flex items-center mt-1 text-xs text-gray-400">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {Math.round(email.confidence * 100)}% confident
                            {email.reasoning && (
                              <span className="ml-1">• {email.reasoning}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {email.unread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-1"></div>
                      )}
                    </div>
                  </div>
                ))}
                {bucket.emails.length > 3 && (
                  <p className="text-xs text-gray-500 pt-1">
                    +{bucket.emails.length - 3} more emails
                  </p>
                )}
              </div>
            )}
            
            {bucket.count === 0 && (
              <div className="p-3 text-center text-gray-500 text-sm">
                No emails in this category
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
          Ask me to "Classify my recent emails" to refresh
        </button>
      </div>
    </div>
  );
}