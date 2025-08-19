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
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { EmailThread, UseEmailActionsReturn } from '../../hooks/useEmailActions';

interface EmailListProps {
  filteredEmails: EmailThread[];
  selectedCategory: number | 'unassigned' | 'all';
  emailActions: UseEmailActionsReturn;
  formatEmailDate: (dateString: string) => string;
  getSenderName: (email: EmailThread) => string;
  selectedEmail: EmailThread | null;
  onEmailSelect: (email: EmailThread | null) => void;
  itemsPerPage?: number;
}

export default function EmailList({
  filteredEmails,
  selectedCategory,
  emailActions,
  formatEmailDate,
  getSenderName,
  selectedEmail,
  onEmailSelect,
  itemsPerPage = 20
}: EmailListProps) {
  const [currentPage, setCurrentPage] = useState(1);
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredEmails.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmails = filteredEmails.slice(startIndex, endIndex);

  // Reset to page 1 when filtered emails change
  useMemo(() => {
    setCurrentPage(1);
  }, [filteredEmails.length, selectedCategory]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of email list when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (filteredEmails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No emails in this category
          </h3>
          <p className="text-muted-foreground">
            {selectedCategory === 'all'
              ? 'No emails found.'
              : selectedCategory === 'unassigned' 
                ? 'All emails have been categorized!'
                : 'No emails found in this category.'
            }
          </p>
        </div>
      </div>
    );
  }

  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      
      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Always show first page
        pages.push(1);
        
        if (currentPage > 3) {
          pages.push('...');
        }
        
        // Show pages around current page
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
          if (!pages.includes(i)) {
            pages.push(i);
          }
        }
        
        if (currentPage < totalPages - 2) {
          pages.push('...');
        }
        
        // Always show last page
        if (!pages.includes(totalPages)) {
          pages.push(totalPages);
        }
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-foreground">
              Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
              <span className="font-medium">{Math.min(endIndex, filteredEmails.length)}</span> of{' '}
              <span className="font-medium">{filteredEmails.length}</span> emails
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 border border-border bg-card text-sm font-medium text-foreground">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${page}`}
                    onClick={() => handlePageChange(page as number)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page
                        ? 'z-10 bg-primary/10 border-primary text-primary'
                        : 'bg-card border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
        {paginatedEmails.map((email) => (
        <div
          key={email.id}
          className={`px-4 py-3 hover:bg-muted transition-colors group relative ${
            selectedEmails.has(email.id) ? 'bg-primary/10 border-l-4 border-primary' : ''
          }`}
        >
          <div className="flex items-start space-x-4">
            {/* Checkbox */}
            <div className="mt-1 flex-shrink-0">
              <input
                type="checkbox"
                checked={selectedEmails.has(email.id)}
                onChange={() => toggleEmailSelection(email.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
              />
            </div>

            {/* Action Buttons - positioned early in flex layout */}
            <div className="flex items-center space-x-2 flex-shrink-0 mt-0.5">
              {editingEmailCategory === email.id ? (
                <div className="bg-card border border-border rounded-lg shadow-lg p-2">
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
                      className="text-xs px-2 py-1 border border-border rounded w-32 bg-background"
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
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingEmailCategory(email.id);
                      setNewCategoryInput('');
                    }}
                    className="text-muted-foreground hover:text-primary p-1 rounded-full hover:bg-primary/10"
                    title="Change category"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMarkAsExample(email.id)}
                    className={`p-1 rounded-full hover:bg-yellow-50 transition-colors ${
                      email.tags?.some(tag => tag.assignedBy === 'user')
                        ? 'text-yellow-600 bg-yellow-50'
                        : 'text-muted-foreground hover:text-yellow-700'
                    }`}
                    title={
                      email.tags?.some(tag => tag.assignedBy === 'user')
                        ? 'Remove from training examples'
                        : 'Mark as training example'
                    }
                  >
                    <Star 
                      className={`w-4 h-4 ${
                        email.tags?.some(tag => tag.assignedBy === 'user') 
                          ? 'fill-current' 
                          : ''
                      }`} 
                    />
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
                    <p className={`text-sm truncate ${email.isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                      {getSenderName(email)}
                    </p>
                    {email.isUnread && (
                      <span
                        className="inline-block w-2 h-2 bg-blue-600 rounded-full"
                        aria-label="Unread"
                        title="Unread"
                      />
                    )}
                  </div>
                  <p className={`text-sm mt-0.5 ${email.isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                    <span className="truncate inline-block max-w-[48ch] align-top">{email.subject}</span>
                  </p>
                </div>
                <div className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                  {formatEmailDate(email.receivedAt)}
                </div>
              </div>

              {/* Cleaner preview: remove noisy words like "Preview"; clamp, normalize whitespace */}
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 break-words">
                {email.snippet?.replace(/\s+/g, ' ').replace(/Preview:?\s*/i, '')}
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
      
      {renderPaginationControls()}
    </div>
  );
}