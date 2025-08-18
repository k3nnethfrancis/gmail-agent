/**
 * Email Auto-Classification API Endpoint
 * 
 * Triggers LLM-powered email classification as required by the engineering project.
 * This endpoint implements the "on load, group emails into buckets using LLM" requirement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCookies } from '@/lib/auth';
import { autoClassifyEmails, checkAndTriggerAutoClassification, classifySpecificEmails } from '@/lib/emailClassifier';

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

    console.warn('🤖 Auto-classification API triggered');

    // Get request parameters
    const body = await request.json();
    const { force = false, emailIds = null } = body;

    let result;
    
    if (emailIds && Array.isArray(emailIds)) {
      // Bulk classification of specific emails
      console.warn(`🎯 Bulk classifying ${emailIds.length} selected emails`);
      result = await classifySpecificEmails(emailIds);
    } else if (force) {
      // Force classification of all untagged emails
      result = await autoClassifyEmails();
    } else {
      // Check if classification is needed and trigger if so
      const success = await checkAndTriggerAutoClassification();
      result = {
        success,
        message: success ? 'Auto-classification check completed' : 'Auto-classification failed'
      };
    }

    return NextResponse.json({
      success: result.success,
      ...result
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto-classification API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const tokens = await getTokensFromCookies();
    if (!tokens.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if auto-classification is needed
    const needed = await checkAndTriggerAutoClassification();
    
    return NextResponse.json({
      success: true,
      classificationNeeded: !needed,
      message: needed ? 'No classification needed' : 'Classification recommended'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto-classification check API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}