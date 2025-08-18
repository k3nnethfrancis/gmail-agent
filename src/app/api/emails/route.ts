/**
 * Email Management API Endpoint
 * 
 * Provides CRUD operations for emails stored in the local SQLite database.
 * Part of the Inbox Concierge Phase 3 implementation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCookies } from '@/lib/auth';
import { emailService, tagService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get authentication tokens
    const tokens = await getTokensFromCookies();
    if (!tokens.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const tagId = searchParams.get('tagId') ? parseInt(searchParams.get('tagId')!) : undefined;
    const searchQuery = searchParams.get('q') || undefined;

    console.warn('📧 Fetching emails', { limit, offset, unreadOnly, tagId, searchQuery });

    // Get emails from database
    const emails = emailService.getEmails({
      limit,
      offset,
      unreadOnly,
      tagId,
      searchQuery,
    });

    // Get tags for each email (for categorization display)
    const emailsWithTags = emails.map((email: any) => {
      const tags = tagService.getEmailTags(email.id);
      return {
        // Only include the camelCase fields for frontend
        id: email.id,
        subject: email.subject,
        snippet: email.snippet,
        receivedAt: email.received_at,
        fromAddress: email.from_address,
        fromName: email.from_name,
        threadId: email.thread_id,
        isUnread: Boolean(email.is_unread),
        isImportant: Boolean(email.is_important),
        bodyText: email.body_text,
        bodyHtml: email.body_html,
        createdAt: email.created_at,
        updatedAt: email.updated_at,
        historyId: email.history_id,
        internalDate: email.internal_date,
        tags,
        // Parse labelIds back to array, handle null/undefined
        labelIds: email.label_ids ? JSON.parse(email.label_ids) : [],
      };
    });

    // Get email counts for pagination
    const counts = emailService.getEmailCounts();

    return NextResponse.json({
      success: true,
      emails: emailsWithTags,
      pagination: {
        limit,
        offset,
        total: counts.total,
        hasMore: offset + limit < counts.total,
      },
      counts,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email fetch API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get authentication tokens
    const tokens = await getTokensFromCookies();
    if (!tokens.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { emailId, action, tagId, isUnread } = body;

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: 'Email ID required' },
        { status: 400 }
      );
    }

    console.warn('📧 Email action requested', { emailId, action, tagId, isUnread });

    switch (action) {
      case 'toggleRead':
        if (typeof isUnread !== 'boolean') {
          return NextResponse.json(
            { success: false, error: 'isUnread boolean required for toggleRead action' },
            { status: 400 }
          );
        }
        emailService.updateEmailReadStatus(emailId, isUnread);
        break;

      case 'addTag':
        if (!tagId) {
          return NextResponse.json(
            { success: false, error: 'Tag ID required for addTag action' },
            { status: 400 }
          );
        }
        tagService.assignTagToEmail(emailId, tagId, 'user');
        break;

      case 'removeTag':
        if (!tagId) {
          return NextResponse.json(
            { success: false, error: 'Tag ID required for removeTag action' },
            { status: 400 }
          );
        }
        tagService.removeTagFromEmail(emailId, tagId);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Return updated email with tags
    const updatedEmail = emailService.getEmailById(emailId);
    if (!updatedEmail) {
      return NextResponse.json(
        { success: false, error: 'Email not found after update' },
        { status: 404 }
      );
    }

    const tags = tagService.getEmailTags(emailId);
    const emailWithTags = {
      // Only include the camelCase fields for frontend
      id: updatedEmail.id,
      subject: updatedEmail.subject,
      snippet: updatedEmail.snippet,
      receivedAt: updatedEmail.received_at,
      fromAddress: updatedEmail.from_address,
      fromName: updatedEmail.from_name,
      threadId: updatedEmail.thread_id,
      isUnread: Boolean(updatedEmail.is_unread),
      isImportant: Boolean(updatedEmail.is_important),
      bodyText: updatedEmail.body_text,
      bodyHtml: updatedEmail.body_html,
      createdAt: updatedEmail.created_at,
      updatedAt: updatedEmail.updated_at,
      historyId: updatedEmail.history_id,
      internalDate: updatedEmail.internal_date,
      tags,
      labelIds: updatedEmail.label_ids ? JSON.parse(updatedEmail.label_ids) : [],
    };

    return NextResponse.json({
      success: true,
      email: emailWithTags,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email update API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}