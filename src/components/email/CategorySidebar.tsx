'use client';
/**
 * Category Sidebar Component
 * 
 * Displays email categories/tags with counts and selection functionality.
 * Extracted from InboxView to improve component modularity.
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { EmailThread, TagRecord } from '../../hooks/useEmailActions';

interface CategorySidebarProps {
  emails: EmailThread[];
  tags: TagRecord[];
  selectedCategory: number | 'unassigned' | 'all';
  onCategorySelect: (categoryId: number | 'unassigned' | 'all') => void;
  onCreateCategory: (emailId: string, categoryName: string) => Promise<void>;
  counts?: { total: number; unread: number; important: number; unassigned: number };
}

export default function CategorySidebar({
  emails,
  tags,
  selectedCategory,
  onCategorySelect,
  onCreateCategory,
  counts
}: CategorySidebarProps) {
  const [showAll, setShowAll] = useState(false);
  const maxVisibleCategories = 8;
  const handleCreateNewCategory = () => {
    const categoryName = prompt('Enter new category name:');
    if (categoryName && categoryName.trim()) {
      // Create a dummy email to trigger category creation
      onCreateCategory('dummy', categoryName.trim());
    }
  };

  const unassignedCount = counts?.unassigned ?? emails.filter(email => !email.tags || email.tags.length === 0).length;

  // Sort once for stable rendering
  const sortedTags = [...tags]
    .filter(tag => tag.emailCount > 0)
    .sort((a, b) => b.emailCount - a.emailCount);

  const visibleTags = showAll ? sortedTags : sortedTags.slice(0, maxVisibleCategories);

  return (
    <div className="w-64 border-r border-border bg-muted flex flex-col">
      {/* Sticky header */}
      <div className="p-4 border-b border-border sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/75">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">Categories</h2>
          <button
            onClick={handleCreateNewCategory}
            className="p-1 text-primary hover:bg-primary/10 rounded"
            title="Create new category"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* When collapsed: no scroll; when expanded: scroll */}
      <div className={`${showAll ? 'flex-1 overflow-y-auto' : ''} p-4 pr-3`}>
        <div className="space-y-2">
          {/* All Emails Category */}
          <button
            onClick={() => onCategorySelect('all')}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              selectedCategory === 'all' 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-gray-500" />
                <div>
                  <p className="font-medium">All Emails</p>
                  <p className="text-xs text-muted-foreground">View all emails</p>
                </div>
              </div>
              <span className="text-sm font-medium tabular-nums" aria-label={`${counts?.total ?? emails.length} emails`}>
                {counts?.total ?? emails.length}
              </span>
            </div>
          </button>

          {/* Unassigned Category - Only show if there are unassigned emails */}
          {unassignedCount > 0 && (
            <button
              onClick={() => onCategorySelect('unassigned')}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedCategory === 'unassigned' 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-gray-400" />
                  <div>
                    <p className="font-medium">Unassigned</p>
                    <p className="text-xs text-muted-foreground">Needs categorization</p>
                  </div>
                </div>
                <span className="text-sm font-medium">
                  {unassignedCount}
                </span>
              </div>
            </button>
          )}

          {/* User Categories */}
          {visibleTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onCategorySelect(tag.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedCategory === tag.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-foreground hover:bg-muted'
              }`}
              title={tag.name}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-medium truncate max-w-[9rem]" title={tag.name}>{tag.name}</span>
                </div>
                <span className="text-sm font-medium tabular-nums" aria-label={`${tag.emailCount} emails`}>
                  {tag.emailCount}
                </span>
              </div>
            </button>
          ))}

          {/* Show more / less */}
          {sortedTags.length > maxVisibleCategories && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full mt-2 text-sm text-primary hover:opacity-90"
            >
              {showAll ? 'Show less' : `Show more (${sortedTags.length - maxVisibleCategories})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}