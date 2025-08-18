'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Mail,
  RefreshCw,
  ArrowRight,
  Star
} from 'lucide-react';
import TrainingExamplesWidget from './TrainingExamplesWidget';

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
  activeView?: string;
  onViewChange?: (view: string) => void;
}

export default function EmailWidget({ className = '', activeView, onViewChange }: EmailWidgetProps) {
  const [tags, setTags] = useState<TagRecord[]>([]);
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
        
        // Debug email stats
        console.warn(`📊 Email Widget Stats: Total emails: ${(emailsData.emails || []).length}, Categories: ${(tagsData.tags || []).length}`);
      }
    } catch (error) {
      console.error('Error fetching email stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmailStats();
    
    // REMOVED: Auto-refresh to prevent infinite polling
    // Only fetch once on mount to avoid competing with InboxView
    // const interval = setInterval(fetchEmailStats, 5 * 60 * 1000);
    // return () => clearInterval(interval);
  }, []); // Only run once on mount

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
          {activeView === 'inbox' ? (
            <>
              <Star className="w-5 h-5 text-yellow-600" />
              <h3 className="font-medium text-gray-900">Training Examples</h3>
            </>
          ) : (
            <>
              <Mail className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">Inbox</h3>
            </>
          )}
        </div>
        <button
          onClick={fetchEmailStats}
          className="p-1 text-gray-500 hover:text-gray-700 rounded"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Widget Content */}
      <div className="p-4">
        {activeView === 'inbox' ? (
          <TrainingExamplesWidget />
        ) : (
          <div className="space-y-3">
            {/* Category Counts - Clean Design */}
            <div className="space-y-1">
              {tags
                .filter(tag => tag.emailCount > 0) // Hide empty categories
                .sort((a, b) => b.emailCount - a.emailCount) // Sort by email count (most to least)
                .slice(0, 5) // Show top 5 categories
                .map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => onViewChange?.('inbox')}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">
                      {tag.emailCount}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>

            {/* View All Button */}
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={() => onViewChange?.('inbox')}
                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Mail className="w-4 h-4" />
                <span>Open Inbox</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}