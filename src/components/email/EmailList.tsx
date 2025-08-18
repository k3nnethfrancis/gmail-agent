/**
 * Email List Component
 * 
 * Displays filtered emails with individual email cards, action buttons, and selection.
 * Extracted from InboxView to improve component modularity.
 */

import { 
  Mail,
  Tag,
  Plus,
  Star,
  Archive,
  X
} from 'lucide-react';
import { EmailThread, UseEmailActionsReturn } from '../../hooks/useEmailActions';

interface EmailListProps {
  filteredEmails: EmailThread[];
  selectedCategory: number | 'unassigned';
  emailActions: UseEmailActionsReturn;
  formatEmailDate: (dateString: string) => string;
  getSenderName: (email: EmailThread) => string;
  selectedEmail: EmailThread | null;
  onEmailSelect: (email: EmailThread | null) => void;
}

export default function EmailList({
  filteredEmails,
  selectedCategory,
  emailActions,
  formatEmailDate,
  getSenderName,
  selectedEmail,
  onEmailSelect
}: EmailListProps) {
  const {
    editingEmailCategory,
    newCategoryInput,
    selectedEmails,
    toggleEmailSelection,
    handleCreateAndAssignCategory,
    handleMarkAsExample,
    setEditingEmailCategory,
    setNewCategoryInput
  } = emailActions;

  if (filteredEmails.length === 0) {
    return (
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
    );
  }

  return (
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

            {/* Action Buttons - positioned early in flex layout */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              {editingEmailCategory === email.id ? (
                <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2">
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
                      className="text-xs px-2 py-1 border border-gray-300 rounded w-32"
                      autoFocus
                    />
                    <button
                      onClick={() => handleCreateAndAssignCategory(email.id, newCategoryInput, true)}
                      className="text-green-600 hover:text-green-700 p-1 rounded"
                      title="Save"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingEmailCategory(null);
                        setNewCategoryInput('');
                      }}
                      className="text-red-600 hover:text-red-700 p-1 rounded"
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingEmailCategory(email.id);
                      setNewCategoryInput('');
                    }}
                    className="text-gray-600 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50"
                    title="Change category"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMarkAsExample(email.id)}
                    className={`p-1 rounded-full hover:bg-yellow-50 ${
                      email.tags?.some(tag => tag.assignedBy === 'user')
                        ? 'text-yellow-600'
                        : 'text-gray-600 hover:text-yellow-700'
                    }`}
                    title={
                      email.tags?.some(tag => tag.assignedBy === 'user')
                        ? 'Remove from training examples'
                        : 'Mark as training example'
                    }
                  >
                    <Star className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Email Content */}
            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => onEmailSelect(selectedEmail?.id === email.id ? null : email)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getSenderName(email)}
                    </p>
                    {email.isUnread && (
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {email.subject}
                  </p>
                </div>
                <div className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {formatEmailDate(email.receivedAt)}
                </div>
              </div>

              <p className="text-sm text-gray-600 truncate">
                {email.snippet}
              </p>

              {/* Tags */}
              {email.tags && email.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {email.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      style={{ 
                        backgroundColor: `${tag.color}20`,
                        color: tag.color
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}