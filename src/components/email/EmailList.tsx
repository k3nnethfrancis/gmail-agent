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
          <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No emails in this category
          </h3>
          <p className="text-gray-600">
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
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
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
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${page}`}
                    onClick={() => handlePageChange(page as number)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="flex flex-col h-full">
      <div className="flex-1 max-h-[65vh] overflow-y-auto divide-y divide-gray-200">
        {paginatedEmails.map((email) => (
        <div
          key={email.id}
          className={`px-4 py-3 hover:bg-gray-50 transition-colors group relative ${
            selectedEmails.has(email.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Action Buttons - positioned early in flex layout */}
            <div className="flex items-center space-x-2 flex-shrink-0 mt-0.5">
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
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    className={`p-1 rounded-full hover:bg-yellow-50 transition-colors ${
                      email.tags?.some(tag => tag.assignedBy === 'user')
                        ? 'text-yellow-600 bg-yellow-50'
                        : 'text-gray-600 hover:text-yellow-700'
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

              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
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
      
      {renderPaginationControls()}
    </div>
  );
}