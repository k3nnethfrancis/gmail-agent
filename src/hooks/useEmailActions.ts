/**
 * Email Actions Hook
 * 
 * Custom hook that encapsulates all email-related actions and state management.
 * Extracted from InboxView component to improve modularity and reusability.
 */

import { useState, useCallback } from 'react';
import { UseInboxStateReturn } from './useInboxState';

export interface EmailThread {
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
    assignedBy?: string;
    confidence?: number;
    reasoning?: string;
  }>;
}

export interface TagRecord {
  id: number;
  name: string;
  color: string;
  description?: string;
  isSystemTag: boolean;
  emailCount: number;
}

export interface UseEmailActionsProps {
  emails: EmailThread[];
  tags: TagRecord[];
  onDataRefresh: () => Promise<void>;
  onError: (error: string) => void;
  inboxState: UseInboxStateReturn;
}

export interface UseEmailActionsReturn {
  // States
  editingEmailCategory: string | null;
  newCategoryInput: string;
  selectedEmails: Set<string>;
  isSelectAllMode: boolean;

  // Action functions
  handleCreateAndAssignCategory: (emailId: string, categoryName: string, replaceExisting?: boolean) => Promise<void>;
  handleMarkAsExample: (emailId: string) => Promise<void>;
  handleRunClassification: () => Promise<void>;
  handleBulkReclassify: () => Promise<void>;
  
  // Selection functions
  toggleEmailSelection: (emailId: string) => void;
  selectAllEmails: (filteredEmails: EmailThread[]) => void;
  clearSelection: () => void;
  
  // Editing functions
  setEditingEmailCategory: (emailId: string | null) => void;
  setNewCategoryInput: (input: string) => void;
}

export function useEmailActions({ 
  emails, 
  tags, 
  onDataRefresh, 
  onError,
  inboxState
}: UseEmailActionsProps): UseEmailActionsReturn {
  // States
  const [editingEmailCategory, setEditingEmailCategory] = useState<string | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isSelectAllMode, setIsSelectAllMode] = useState(false);

  // Handle creating new category and assigning email
  const handleCreateAndAssignCategory = useCallback(async (
    emailId: string, 
    categoryName: string, 
    replaceExisting = false
  ) => {
    if (!categoryName.trim()) return;

    try {
      // Fetch fresh data instead of relying on potentially stale props
      const [emailsResponse, tagsResponse] = await Promise.all([
        fetch('/api/emails?limit=200'),
        fetch('/api/tags?includeStats=true')
      ]);
      
      if (!emailsResponse.ok || !tagsResponse.ok) {
        throw new Error('Failed to fetch current data');
      }
      
      const { emails: currentEmails } = await emailsResponse.json();
      const { tags: currentTags } = await tagsResponse.json();
      
      const email = currentEmails.find((e: EmailThread) => e.id === emailId);
      if (!email) return;

      // If replacing existing tags, remove all current tags first
      if (replaceExisting && email.tags && email.tags.length > 0) {
        for (const tag of email.tags) {
          const removeResponse = await fetch('/api/emails', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emailId,
              action: 'removeTag',
              tagId: tag.id
            })
          });
          
          if (!removeResponse.ok) {
            console.warn(`Failed to remove tag ${tag.name}`);
          }
        }
      }

      // Check if category exists
      const existingTag = currentTags.find((tag: TagRecord) => 
        tag.name.toLowerCase() === categoryName.trim().toLowerCase()
      );

      let tagId: number;

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        // Create new category
        const createResponse = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryName.trim(),
            color: '#3b82f6',
            description: `User-created category`
          })
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create category');
        }

        const newTag = await createResponse.json();
        tagId = newTag.tag.id;
      }

      // Assign email to category
      const assignResponse = await fetch('/api/emails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId,
          action: 'addTag',
          tagId
        })
      });

      if (!assignResponse.ok) {
        throw new Error('Failed to assign category');
      }

      // Refresh data and reset editing state
      await onDataRefresh();
      setEditingEmailCategory(null);
      setNewCategoryInput('');
    } catch (error) {
      console.error('Error creating/assigning category:', error);
      onError(error instanceof Error ? error.message : 'Failed to assign category');
    }
  }, [onDataRefresh, onError]);

  // Handle toggling training example status
  const handleMarkAsExample = useCallback(async (emailId: string) => {
    console.warn(`🌟 Star button clicked for email: ${emailId}`);
    try {
      // Fetch fresh email data instead of relying on potentially stale props
      const emailsResponse = await fetch('/api/emails?limit=200');
      if (!emailsResponse.ok) {
        throw new Error('Failed to fetch current emails');
      }
      
      const { emails: currentEmails } = await emailsResponse.json();
      const email = currentEmails.find((e: EmailThread) => e.id === emailId);
      
      console.warn(`📧 Email found: ${email?.subject}, Tags: ${email?.tags?.map(t => `${t.name}(${t.assignedBy})`).join(', ')}`);
      
      // Check if email has tags (requirement for training examples)
      if (!email?.tags || email.tags.length === 0) {
        const message = 'Email must be tagged before it can be marked as a training example';
        console.warn(`❌ Validation failed: ${message}`);
        onError(message);
        return;
      }

      // Check if email is already a training example
      const isTrainingExample = email.tags.some(tag => tag.assignedBy === 'user');
      const method = isTrainingExample ? 'DELETE' : 'POST';
      const action = isTrainingExample ? 'remove from' : 'mark as';
      
      console.warn(`🚀 Making ${method} request to /api/training-examples to ${action} training example`);
      
      const response = await fetch('/api/training-examples', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
        credentials: 'include'
      });

      console.warn(`🔗 API response status: ${response.status}`);
      const responseData = await response.json();
      console.warn(`📊 API response:`, responseData);

      if (response.ok) {
        const tagNames = email?.tags?.map(t => t.name).join(', ') || 'untagged';
        const successMessage = isTrainingExample 
          ? `🗑️ Email "${email.subject}" removed from training examples`
          : `✅ Email "${email.subject}" marked as training example for categories: ${tagNames}`;
        
        console.warn(successMessage);
        alert(successMessage);
        
        // Refresh to show updated state
        await onDataRefresh();
      } else {
        throw new Error(responseData.error || `Failed to ${action} training example`);
      }
    } catch (error) {
      console.error('Error toggling training example:', error);
      onError(error instanceof Error ? error.message : 'Failed to toggle training example');
    }
  }, [onDataRefresh, onError]);

  // Handle reclassify all (overwrite existing categories)
  const handleRunClassification = useCallback(async () => {
    if (!inboxState.canStartClassification) {
      onError('Cannot start reclassification while editing or loading');
      return;
    }

    const confirmText = 'You are about to reclassify ALL emails and overwrite existing categories.\n\nTip: To reclassify only specific emails, select them and use "Reclassify Selected" instead.\n\nProceed to reclassify all?';
    const confirmed = window.confirm(confirmText);
    if (!confirmed) return;

    try {
      inboxState.setClassifying();
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, overwriteExisting: true }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to reclassify');
      }

      const result = await response.json();
      await onDataRefresh();
      alert(result.message || `Reclassification complete! ${result.classified || 0} emails updated.`);
    } catch (error) {
      console.error('Error running reclassification:', error);
      onError(error instanceof Error ? error.message : 'Reclassification failed');
    } finally {
      inboxState.setIdle();
    }
  }, [onDataRefresh, onError, inboxState]);

  // Bulk selection helper functions
  const toggleEmailSelection = useCallback((emailId: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  }, [selectedEmails]);

  const selectAllEmails = useCallback((filteredEmails: EmailThread[]) => {
    const allEmailIds = new Set(filteredEmails.map(email => email.id));
    setSelectedEmails(allEmailIds);
    setIsSelectAllMode(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEmails(new Set());
    setIsSelectAllMode(false);
  }, []);

  const handleBulkReclassify = useCallback(async () => {
    if (selectedEmails.size === 0) return;
    
    if (!inboxState.canStartClassification) {
      onError('Cannot start bulk classification while editing or loading');
      return;
    }
    
    try {
      inboxState.setClassifying();
      
      // Run classification on selected emails (overwrite existing to actually reclassify)
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emailIds: Array.from(selectedEmails),
          force: true,
          overwriteExisting: true
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.warn(`✅ Bulk reclassification completed: ${result.classified} emails reclassified`);
        if (result.message) {
          alert(result.message);
        }
        
        // Clear selection and refresh data
        clearSelection();
        await onDataRefresh();
      } else {
        throw new Error('Bulk reclassification failed');
      }
      
    } catch (error) {
      console.error('Bulk reclassification error:', error);
      onError(error instanceof Error ? error.message : 'Bulk reclassification failed');
    } finally {
      inboxState.setIdle();
    }
  }, [selectedEmails, onDataRefresh, onError, clearSelection, inboxState]);

  return {
    // States
    editingEmailCategory,
    newCategoryInput,
    selectedEmails,
    isSelectAllMode,

    // Action functions
    handleCreateAndAssignCategory,
    handleMarkAsExample,
    handleRunClassification,
    handleBulkReclassify,
    
    // Selection functions
    toggleEmailSelection,
    selectAllEmails,
    clearSelection,
    
    // Editing functions
    setEditingEmailCategory,
    setNewCategoryInput,
  };
}