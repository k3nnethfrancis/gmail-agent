'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Mail,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface TagRecord {
  id: number;
  name: string;
  color: string;
  description?: string;
  isSystemTag: boolean;
  emailCount: number;
}

interface EmailWidgetProps {
  className?: string;
  onViewChange?: (view: string) => void;
}

export default function EmailWidget({ className = '', onViewChange }: EmailWidgetProps) {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch email stats
  const fetchEmailStats = useCallback(async () => {
    try {
      setIsLoading(true);

      const [tagsResponse, emailsResponse] = await Promise.all([
        fetch('/api/tags?includeStats=true'),
        fetch('/api/emails?limit=200')
      ]);

      if (tagsResponse.ok && emailsResponse.ok) {
        const tagsData = await tagsResponse.json();
        const emailsData = await emailsResponse.json();
        
        setTags(tagsData.tags || []);
        
        // Count unread emails
        const unread = (emailsData.emails || []).filter((email: any) => email.isUnread).length;
        setUnreadCount(unread);
        
        // Debug unread count
        console.warn(`📊 Email Widget Stats: Total emails: ${(emailsData.emails || []).length}, Unread: ${unread}`);
      }
    } catch (error) {
      console.error('Error fetching email stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmailStats();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchEmailStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEmailStats]);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Widget Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Mail className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Inbox</h3>
        </div>
        <button
          onClick={fetchEmailStats}
          className="p-1 text-gray-500 hover:text-gray-700 rounded"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Email Categories */}
      <div className="p-4 space-y-3">
        {/* Unread Summary - Only show if there are actually unread emails */}
        {unreadCount > 0 && (
          <button
            onClick={() => onViewChange?.('inbox')}
            className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900">
                  {unreadCount} unread email{unreadCount !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-blue-700">Needs attention</p>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </div>
          </button>
        )}

        {/* Category Counts */}
        <div className="space-y-2">
          {tags
            .filter(tag => tag.emailCount > 0) // Hide empty categories
            .sort((a, b) => b.emailCount - a.emailCount) // Sort by email count (most to least)
            .slice(0, 5) // Show top 5 categories
            .map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-50 cursor-pointer group"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{tag.name}</p>
                  {tag.description && (
                    <p className="text-xs text-gray-600">{tag.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {tag.emailCount}
                </span>
                <ArrowRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={() => onViewChange?.('inbox')}
            className="w-full text-left text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all emails →
          </button>
        </div>
      </div>
    </div>
  );
}