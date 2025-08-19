/**
 * Email Synchronization Service
 * 
 * Handles syncing emails from Gmail API to local SQLite database.
 * Supports initial sync of 200 recent emails and incremental updates.
 */

import { google } from 'googleapis';
import { createAuthenticatedClient } from '@/lib/auth';
import { emailService, type EmailRecord } from '@/lib/database';

export interface SyncOptions {
  maxResults?: number;
  query?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
}

export interface SyncResult {
  success: boolean;
  emailsSynced?: number;
  errors?: string[];
  error?: string;
}

/**
 * Gmail message interface matching API response
 */
interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
      parts?: any[];
    }>;
  };
}

/**
 * Extract text content from Gmail message payload
 */
function extractMessageContent(payload: GmailMessage['payload']): { text?: string; html?: string } {
  let text: string | undefined;
  let html: string | undefined;

  // Helper to decode base64url
  const decode = (data: string): string => {
    try {
      return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    } catch {
      return '';
    }
  };

  // Check direct body
  if (payload.body?.data) {
    text = decode(payload.body.data);
  }

  // Check parts
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data && !text) {
        text = decode(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data && !html) {
        html = decode(part.body.data);
      }
      
      // Handle nested parts (multipart messages)
      if (part.parts) {
        for (const nestedPart of part.parts) {
          if (nestedPart.mimeType === 'text/plain' && nestedPart.body?.data && !text) {
            text = decode(nestedPart.body.data);
          } else if (nestedPart.mimeType === 'text/html' && nestedPart.body?.data && !html) {
            html = decode(nestedPart.body.data);
          }
        }
      }
    }
  }

  return { text, html };
}

/**
 * Convert Gmail message to EmailRecord format
 */
function convertGmailMessage(message: GmailMessage): Omit<EmailRecord, 'createdAt' | 'updatedAt'> {
  const headers = message.payload.headers;
  const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
  const fromHeader = headers.find(h => h.name === 'From')?.value || '';
  
  // Parse from field to extract email and name
  const fromMatch = fromHeader.match(/^(.+?)\s*<(.+?)>$/) || fromHeader.match(/^(.+)$/);
  const fromName = fromMatch?.[1]?.replace(/^"(.*)"$/, '$1').trim();
  const fromAddress = fromMatch?.[2]?.trim() || fromMatch?.[1]?.trim() || '';

  const { text, html } = extractMessageContent(message.payload);
  
  // Convert internal date to ISO string
  const receivedAt = new Date(parseInt(message.internalDate)).toISOString();
  
  // Check if unread (has UNREAD label in Gmail)
  const isUnread = message.labelIds.includes('UNREAD');
  
  // Check if important
  const isImportant = message.labelIds.includes('IMPORTANT');

  return {
    id: `${message.threadId}-${message.id}`, // Unique ID combining thread and message
    threadId: message.threadId,
    messageId: message.id,
    subject,
    fromAddress,
    fromName: fromName && fromName !== fromAddress ? fromName : undefined,
    snippet: message.snippet,
    bodyText: text,
    bodyHtml: html,
    receivedAt,
    isUnread,
    isImportant,
    labelIds: JSON.stringify(message.labelIds),
    historyId: message.historyId,
    internalDate: message.internalDate,
  };
}

/**
 * Sync emails from Gmail to local database
 */
export async function syncEmails(
  accessToken: string,
  options: SyncOptions = {},
  refreshToken?: string
): Promise<SyncResult> {
  const {
    maxResults = 200,
    query = 'in:inbox',
    labelIds,
    includeSpamTrash = false,
  } = options;

  try {
    // Create authenticated Gmail client
    const tokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
    const auth = createAuthenticatedClient(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    console.warn('📧 Starting email sync...');

    // First, get list of messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
      labelIds,
      includeSpamTrash,
    });

    const messageIds = listResponse.data.messages?.map(m => m.id!) || [];
    
    if (messageIds.length === 0) {
      console.warn('📧 No messages found to sync');
      return { success: true, emailsSynced: 0 };
    }

    console.warn(`📧 Found ${messageIds.length} messages to sync`);

    // Batch get messages for efficiency
    const emails: Omit<EmailRecord, 'createdAt' | 'updatedAt'>[] = [];
    const errors: string[] = [];
    const batchSize = 10; // Gmail API rate limit friendly

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      
      // Get messages in parallel for this batch
      const messagePromises = batch.map(async (messageId) => {
        try {
          const response = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full', // Get full message including body
          });
          return response.data as GmailMessage;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to fetch message ${messageId}: ${errorMessage}`);
          return null;
        }
      });

      const batchMessages = await Promise.all(messagePromises);
      
      // Convert valid messages to EmailRecord format
      for (const message of batchMessages) {
        if (message) {
          try {
            const emailRecord = convertGmailMessage(message);
            emails.push(emailRecord);
          } catch (conversionError) {
            const errorMessage = conversionError instanceof Error ? conversionError.message : 'Unknown conversion error';
            errors.push(`Failed to convert message ${message.id}: ${errorMessage}`);
          }
        }
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < messageIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.warn(`📧 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(messageIds.length / batchSize)}`);
    }

    // Batch insert into database
    if (emails.length > 0) {
      emailService.batchInsertEmails(emails);
      console.warn(`📧 Successfully synced ${emails.length} emails to database`);
    }

    // Log any errors but don't fail the sync
    if (errors.length > 0) {
      console.warn(`📧 Sync completed with ${errors.length} errors:`, errors.slice(0, 5));
    }

    return {
      success: true,
      emailsSynced: emails.length,
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
    console.error('📧 Email sync failed:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Incremental sync to get new emails since last sync
 */
export async function incrementalSync(
  accessToken: string,
  historyId: string,
  refreshToken?: string
): Promise<SyncResult> {
  try {
    const tokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
    const auth = createAuthenticatedClient(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    console.warn('📧 Starting incremental sync...');

    // Get history since last sync
    const historyResponse = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      labelId: 'INBOX', // Focus on inbox changes
    });

    const history = historyResponse.data.history || [];
    
    if (history.length === 0) {
      console.warn('📧 No new messages in incremental sync');
      return { success: true, emailsSynced: 0 };
    }

    // Extract message IDs from history
    const messageIds = new Set<string>();
    for (const historyRecord of history) {
      // Messages added to inbox
      if (historyRecord.messagesAdded) {
        for (const added of historyRecord.messagesAdded) {
          if (added.message?.id) {
            messageIds.add(added.message.id);
          }
        }
      }
    }

    if (messageIds.size === 0) {
      console.warn('📧 No new messages to sync in incremental update');
      return { success: true, emailsSynced: 0 };
    }

    console.warn(`📧 Found ${messageIds.size} new messages in incremental sync`);

    // Sync the new messages
    const emails: Omit<EmailRecord, 'createdAt' | 'updatedAt'>[] = [];
    const errors: string[] = [];

    for (const messageId of messageIds) {
      try {
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        });

        const emailRecord = convertGmailMessage(response.data as GmailMessage);
        emails.push(emailRecord);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to sync new message ${messageId}: ${errorMessage}`);
      }
    }

    // Insert new emails
    if (emails.length > 0) {
      emailService.batchInsertEmails(emails);
      console.warn(`📧 Successfully synced ${emails.length} new emails`);
    }

    return {
      success: true,
      emailsSynced: emails.length,
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown incremental sync error';
    console.error('📧 Incremental sync failed:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if initial sync has been completed
 */
export function hasInitialSync(): boolean {
  const counts = emailService.getEmailCounts();
  return counts.total > 0;
}

/**
 * Get sync status and statistics
 */
export function getSyncStatus(): {
  hasInitialSync: boolean;
  totalEmails: number;
  unreadEmails: number;
  importantEmails: number;
  lastSyncTime?: string;
} {
  const counts = emailService.getEmailCounts();
  
  // Get most recent email timestamp as proxy for last sync
  const recentEmails = emailService.getEmails({ limit: 1 });
  const lastSyncTime = recentEmails.length > 0 ? recentEmails[0].receivedAt : undefined;

  return {
    hasInitialSync: counts.total > 0,
    totalEmails: counts.total,
    unreadEmails: counts.unread,
    importantEmails: counts.important,
    lastSyncTime,
  };
}

/**
 * Force a full resync (useful for testing or recovery)
 */
export async function fullResync(
  accessToken: string,
  refreshToken?: string
): Promise<SyncResult> {
  console.warn('📧 Starting full resync...');
  
  // Note: In a production system, you might want to clear existing data
  // For now, we'll just sync new emails which will update existing ones
  
  return await syncEmails(accessToken, { maxResults: 200 }, refreshToken);
}