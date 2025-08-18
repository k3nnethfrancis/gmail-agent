/**
 * Email Sync API Endpoint
 * 
 * Handles initial and incremental email synchronization with Gmail API.
 * Part of the Inbox Concierge Phase 3 implementation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCookies } from '@/lib/auth';
import { syncEmails, incrementalSync, getSyncStatus, hasInitialSync } from '@/lib/emailSync';

export async function POST(request: NextRequest) {
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
    const body = await request.json().catch(() => ({}));
    const { 
      force = false, 
      maxResults = 200,
      historyId 
    }: { 
      force?: boolean; 
      maxResults?: number; 
      historyId?: string; 
    } = body;

    console.warn('📧 Email sync requested', { force, maxResults, hasHistoryId: !!historyId });

    let result;

    if (force || !hasInitialSync()) {
      // Perform initial or forced full sync
      console.warn('📧 Performing initial/full sync');
      result = await syncEmails(
        tokens.accessToken,
        { maxResults },
        tokens.refreshToken
      );
    } else if (historyId) {
      // Perform incremental sync
      console.warn('📧 Performing incremental sync');
      result = await incrementalSync(
        tokens.accessToken,
        historyId,
        tokens.refreshToken
      );
    } else {
      // Get current status without syncing
      const status = getSyncStatus();
      return NextResponse.json({
        success: true,
        message: 'Already synced',
        status,
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Get updated status
    const status = getSyncStatus();

    return NextResponse.json({
      success: true,
      emailsSynced: result.emailsSynced,
      errors: result.errors,
      status,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
    console.error('Email sync API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get authentication tokens
    const tokens = await getTokensFromCookies();
    if (!tokens.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Return current sync status
    const status = getSyncStatus();
    
    return NextResponse.json({
      success: true,
      status,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown status error';
    console.error('Email sync status API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}