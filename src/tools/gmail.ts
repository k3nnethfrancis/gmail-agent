import { google } from 'googleapis';
import { createAuthenticatedClient } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

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
 * Classify emails into categories using Claude AI for intelligent categorization
 */
export async function classifyEmails(
  accessToken: string,
  threadIds: string[],
  categories?: string[],
  refreshToken?: string
): Promise<{ success: boolean; classifications?: Array<{ threadId: string; category: string; confidence: number; reasoning?: string }>; error?: string }> {
  const cats = categories ?? ['Important', 'Can wait', 'Auto-archive', 'Newsletter'];
  
  try {
    const gmail = getGmailClient(accessToken, refreshToken);
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    
    const classifications = [];

    // Process emails in batches for efficiency
    const batchSize = 5;
    for (let i = 0; i < threadIds.length; i += batchSize) {
      const batch = threadIds.slice(i, i + batchSize);
      const emailContexts = [];
      
      // Gather email data for this batch
      for (const threadId of batch) {
        try {
          const threadResponse = await gmail.users.threads.get({
            userId: 'me',
            id: threadId,
          });

          const thread = threadResponse.data;
          const firstMessage = thread.messages?.[0];
          
          if (!firstMessage) continue;

          // Extract key email information
          const subject = firstMessage.payload.headers?.find(h => h.name === 'Subject')?.value || '';
          const from = firstMessage.payload.headers?.find(h => h.name === 'From')?.value || '';
          const snippet = thread.snippet || '';
          
          emailContexts.push({
            threadId,
            subject,
            from,
            snippet,
          });
        } catch (threadError) {
          console.warn(`Failed to fetch thread ${threadId}:`, threadError);
          continue;
        }
      }
      
      if (emailContexts.length === 0) continue;
      
      // Create classification prompt for this batch
      const classificationPrompt = `Classify these emails into the following categories: ${cats.join(', ')}

For each email, analyze the subject, sender, and content snippet to determine:
1. Which category best fits
2. Confidence level (0.0 to 1.0)
3. Brief reasoning

Categories explained:
- Important: Requires immediate attention, action items, urgent matters
- Can wait: Non-urgent but relevant emails that can be handled later
- Auto-archive: Automated notifications, receipts, confirmations that don't need attention
- Newsletter: Marketing emails, newsletters, promotional content

Emails to classify:
${emailContexts.map((email, idx) => `
${idx + 1}. Thread ID: ${email.threadId}
   Subject: ${email.subject}
   From: ${email.from}
   Snippet: ${email.snippet}
`).join('')}

Respond with ONLY a JSON array containing objects with threadId, category, confidence, and reasoning fields. No other text.`;

      try {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          system: 'You are an expert email classifier. Respond only with valid JSON as requested.',
          messages: [
            {
              role: 'user',
              content: classificationPrompt,
            },
          ],
        });

        const content = response.content[0];
        if (content.type === 'text') {
          try {
            const batchClassifications = JSON.parse(content.text);
            if (Array.isArray(batchClassifications)) {
              classifications.push(...batchClassifications);
            }
          } catch (parseError) {
            console.warn('Failed to parse Claude classification response:', parseError);
            // Fallback to default classification for this batch
            for (const email of emailContexts) {
              classifications.push({
                threadId: email.threadId,
                category: 'Can wait',
                confidence: 0.5,
                reasoning: 'AI classification failed, using default',
              });
            }
          }
        }
      } catch (claudeError) {
        console.warn('Claude classification failed for batch:', claudeError);
        // Fallback to default classification for this batch
        for (const email of emailContexts) {
          classifications.push({
            threadId: email.threadId,
            category: 'Can wait',
            confidence: 0.5,
            reasoning: 'AI service unavailable, using default',
          });
        }
      }
      
      // Small delay between batches to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
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