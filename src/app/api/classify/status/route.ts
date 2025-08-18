import { NextRequest, NextResponse } from 'next/server';
import { emailService, tagService } from '@/lib/database';

/**
 * GET /api/classify/status - Check classification status
 * Returns information about classified vs unclassified emails
 */
export async function GET(request: NextRequest) {
  
  try {
    // Get all emails
    const allEmails = emailService.getEmails({ limit: 1000 });
    
    // Count unclassified emails (emails without any tags)
    let unclassifiedCount = 0;
    let classifiedCount = 0;
    
    for (const email of allEmails) {
      const tags = tagService.getEmailTags(email.id);
      if (tags.length === 0) {
        unclassifiedCount++;
      } else {
        classifiedCount++;
      }
    }
    
    // Get available categories
    const allTags = tagService.getAllTags();
    
    const response = {
      success: true,
      totalEmails: allEmails.length,
      classifiedEmails: classifiedCount,
      unclassifiedEmails: unclassifiedCount,
      categories: allTags.length,
      classificationNeeded: unclassifiedCount > 0
    };
    
    console.warn('📊 Classification Status:', response);
    
    return NextResponse.json(response);
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Classification status check failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check classification status',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}