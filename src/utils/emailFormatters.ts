/**
 * Email formatting utilities
 * Extracted from InboxView to prevent recreation on every render
 */

import { EmailThread } from '../hooks/useEmailActions';

/**
 * Safely format email date string
 */
export function formatEmailDate(dateString: string): string {
  if (!dateString) return 'No date';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Extract sender display name from email
 */
export function getSenderName(email: EmailThread): string {
  if (email.fromName && email.fromName.trim()) {
    return email.fromName;
  }
  if (email.fromAddress) {
    // Extract name from email address if it's in "Name <email@domain.com>" format
    const match = email.fromAddress.match(/^"?([^"<]+)"?\s*<?([^>]+)>?$/);
    if (match && match[1] && match[1].trim() && match[1] !== match[2]) {
      return match[1].trim();
    }
    return email.fromAddress;
  }
  return 'Unknown Sender';
}