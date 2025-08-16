import { google } from 'googleapis';
import { createAuthenticatedClient } from '@/lib/auth';

export interface EmailThread {
  id: string;
  snippet: string;
  historyId: string;
  messages?: EmailMessage[];
}

export interface EmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ body?: { data?: string }; mimeType?: string }>;
  };
  internalDate: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface ListThreadsOptions {
  maxResults?: number;
  labelIds?: string[];
  q?: string; // Search query
  pageToken?: string;
}

// Helper function to get Gmail client with auth
function getGmailClient(accessToken: string, refreshToken?: string) {
  const tokens = {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
  
  const auth = createAuthenticatedClient(tokens);
  return google.gmail({ version: 'v1', auth });
}

/**
 * List email threads with optional filtering
 */
export async function listThreads(
  accessToken: string,
  options?: ListThreadsOptions,
  refreshToken?: string
) {
  const { maxResults = 50, labelIds, q, pageToken } = options ?? {};
  try {
    const gmail = getGmailClient(accessToken, refreshToken);

    const response = await gmail.users.threads.list({
      userId: 'me',
      maxResults,
      labelIds,
      q,
      pageToken,
    });

    return {
      success: true,
      threads: response.data.threads || [],
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gmail listThreads error:', error);
    return {
      success: false,
      error: errorMessage || 'Failed to list threads',
    };
  }
}

/**
 * Get a specific email thread with all messages
 */
export async function getThread(
  accessToken: string,
  threadId: string,
  refreshToken?: string
) {
  try {
    const gmail = getGmailClient(accessToken, refreshToken);

    const response = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
    });

    return {
      success: true,
      thread: response.data,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gmail getThread error:', error);
    return {
      success: false,
      error: errorMessage || 'Failed to get thread',
    };
  }
}

/**
 * Send an email
 */
export async function sendEmail(
  accessToken: string,
  emailOptions: SendEmailOptions,
  refreshToken?: string
) {
  try {
    const gmail = getGmailClient(accessToken, refreshToken);
    
    const { to, subject, body, html, cc, bcc } = emailOptions;
    
    // Build email headers
    const headers = [
      `To: ${Array.isArray(to) ? to.join(', ') : to}`,
      `Subject: ${subject}`,
    ];
    
    if (cc) {
      headers.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`);
    }
    
    if (bcc) {
      headers.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`);
    }
    
    // Build email body
    let emailBody = body;
    if (html) {
      headers.push('Content-Type: text/html; charset=utf-8');
      emailBody = html;
    } else {
      headers.push('Content-Type: text/plain; charset=utf-8');
    }
    
    const email = headers.join('\r\n') + '\r\n\r\n' + emailBody;
    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    return {
      success: true,
      message: response.data,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gmail sendEmail error:', error);
    return {
      success: false,
      error: errorMessage || 'Failed to send email',
    };
  }
}

/**
 * Create a label in Gmail
 */
export async function createLabel(
  accessToken: string,
  name: string,
  refreshToken?: string
) {
  try {
    const gmail = getGmailClient(accessToken, refreshToken);

    const response = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      },
    });

    return {
      success: true,
      label: response.data,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gmail createLabel error:', error);
    return {
      success: false,
      error: errorMessage || 'Failed to create label',
    };
  }
}

/**
 * Add label to a thread
 */
export async function addLabel(
  accessToken: string,
  threadId: string,
  labelIds: string[],
  refreshToken?: string
) {
  try {
    const gmail = getGmailClient(accessToken, refreshToken);

    const response = await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: {
        addLabelIds: labelIds,
      },
    });

    return {
      success: true,
      thread: response.data,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gmail addLabel error:', error);
    return {
      success: false,
      error: errorMessage || 'Failed to add label',
    };
  }
}

/**
 * Archive a thread (remove from inbox)
 */
export async function archiveThread(
  accessToken: string,
  threadId: string,
  refreshToken?: string
) {
  try {
    const gmail = getGmailClient(accessToken, refreshToken);

    const response = await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    });

    return {
      success: true,
      thread: response.data,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gmail archiveThread error:', error);
    return {
      success: false,
      error: errorMessage || 'Failed to archive thread',
    };
  }
}

/**
 * Classify emails into categories (this would use AI in a real implementation)
 * For now, returns a simple categorization based on keywords
 */
export async function classifyEmails(
  accessToken: string,
  threadIds: string[],
  categories?: string[],
  refreshToken?: string
): Promise<{ success: boolean; classifications?: Array<{ threadId: string; category: string; confidence: number }>; error?: string }> {
  const cats = categories ?? ['Important', 'Can wait', 'Auto-archive', 'Newsletter'];
  try {
    const gmail = getGmailClient(accessToken, refreshToken);
    const classifications = [];

    for (const threadId of threadIds) {
      // Get thread details for classification
      const threadResponse = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
      });

      const thread = threadResponse.data;
      const firstMessage = thread.messages?.[0];
      
      if (!firstMessage) continue;

      // Simple keyword-based classification (would be replaced with AI)
      const subject = firstMessage.payload.headers?.find(h => h.name === 'Subject')?.value || '';
      const snippet = thread.snippet || '';
      const text = (subject + ' ' + snippet).toLowerCase();

      let category = 'Can wait'; // default
      let confidence = 0.5;

      if (text.includes('urgent') || text.includes('important') || text.includes('asap')) {
        category = 'Important';
        confidence = 0.9;
      } else if (text.includes('newsletter') || text.includes('unsubscribe') || text.includes('marketing')) {
        category = 'Newsletter';
        confidence = 0.8;
      } else if (text.includes('automated') || text.includes('no-reply') || text.includes('notification')) {
        category = 'Auto-archive';
        confidence = 0.7;
      }

      classifications.push({
        threadId,
        category,
        confidence,
      });
    }

    return {
      success: true,
      classifications,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gmail classifyEmails error:', error);
    return {
      success: false,
      error: errorMessage || 'Failed to classify emails',
    };
  }
}