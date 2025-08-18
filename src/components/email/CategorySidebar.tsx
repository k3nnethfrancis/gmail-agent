/**
 * Category Sidebar Component
 * 
 * Displays email categories/tags with counts and selection functionality.
 * Extracted from InboxView to improve component modularity.
 */

import { Plus } from 'lucide-react';
import { EmailThread, TagRecord } from '../../hooks/useEmailActions';

interface CategorySidebarProps {
  emails: EmailThread[];
  tags: TagRecord[];
  selectedCategory: number | 'unassigned';
  onCategorySelect: (categoryId: number | 'unassigned') => void;
  onCreateCategory: (emailId: string, categoryName: string) => Promise<void>;
}

export default function CategorySidebar({
  emails,
  tags,
  selectedCategory,
  onCategorySelect,
  onCreateCategory
}: CategorySidebarProps) {
  const handleCreateNewCategory = () => {
    const categoryName = prompt('Enter new category name:');
    if (categoryName && categoryName.trim()) {
      // Create a dummy email to trigger category creation
      onCreateCategory('dummy', categoryName.trim());
    }
  };

  const unassignedCount = emails.filter(email => !email.tags || email.tags.length === 0).length;

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Categories</h2>
          <button
            onClick={handleCreateNewCategory}
            className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
            title="Create new category"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-2">
          {/* Unassigned Category - Only show if there are unassigned emails */}
          {unassignedCount > 0 && (
            <button
              onClick={() => onCategorySelect('unassigned')}
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
          )}

          {/* User Categories */}
          {tags
            .filter(tag => tag.emailCount > 0) // Hide empty categories
            .sort((a, b) => b.emailCount - a.emailCount) // Sort by email count (most to least)
            .map((tag) => (
            <button
              key={tag.id}
              onClick={() => onCategorySelect(tag.id)}
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
  );
}