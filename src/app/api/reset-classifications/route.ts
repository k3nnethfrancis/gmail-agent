/**
 * Database Reset API Endpoint
 * 
 * Wipes all email classifications and tags to allow fresh auto-classification
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCookies } from '@/lib/auth';
import { tagService, getDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const tokens = await getTokensFromCookies();
    if (!tokens.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.warn('🗑️ Starting database reset - wiping all classifications...');

    const db = getDatabase();

    // Get counts before deletion for reporting
    const emailTagsCount = db.prepare('SELECT COUNT(*) as count FROM email_tags').get() as { count: number };
    const tagsCount = db.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number };
    const classificationHistoryCount = db.prepare('SELECT COUNT(*) as count FROM classification_history').get() as { count: number };

    // Start transaction for atomic operation
    const transaction = db.transaction(() => {
      // 1. Remove all email-tag associations
      db.prepare('DELETE FROM email_tags').run();
      
      // 2. Remove all tags (this will cascade to email_tags if there were foreign keys)
      db.prepare('DELETE FROM tags').run();
      
      // 3. Remove all classification history
      db.prepare('DELETE FROM classification_history').run();
    });

    // Execute the transaction
    transaction();

    console.warn(`✅ Database reset complete:
    - Removed ${emailTagsCount.count} email-tag associations
    - Removed ${tagsCount.count} tags/categories  
    - Removed ${classificationHistoryCount.count} classification history records`);

    return NextResponse.json({
      success: true,
      message: 'All classifications and categories have been reset',
      stats: {
        emailTagsRemoved: emailTagsCount.count,
        tagsRemoved: tagsCount.count,
        classificationHistoryRemoved: classificationHistoryCount.count
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Database reset API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}