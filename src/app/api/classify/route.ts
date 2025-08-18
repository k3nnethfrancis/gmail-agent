/**
 * Email Auto-Classification API Endpoint
 * 
 * Triggers LLM-powered email classification as required by the engineering project.
 * This endpoint implements the "on load, group emails into buckets using LLM" requirement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCookies } from '@/lib/auth';
import { autoClassifyEmails, checkAndTriggerAutoClassification, classifySpecificEmails } from '@/lib/emailClassifier';

// Simple in-memory lock to prevent concurrent classification
let isClassifying = false;

export async function POST(request: NextRequest) {
  try {
    // Check if classification is already in progress
    if (isClassifying) {
      console.warn('⏰ Classification already in progress, skipping duplicate request');
      return NextResponse.json(
        { success: false, error: 'Classification already in progress', isRunning: true },
        { status: 429 }
      );
    }

    // Check authentication
    const tokens = await getTokensFromCookies();
    if (!tokens.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.warn('🤖 Auto-classification API triggered');
    
    // Set the lock
    isClassifying = true;

    // Get request parameters
    const body = await request.json();
    const { 
      force = false, 
      emailIds = null, 
      overwriteExisting = false,
      unclassifiedOnly = true 
    } = body;

    let result;
    
    if (emailIds && Array.isArray(emailIds)) {
      // Bulk classification of specific emails
      console.warn(`🎯 Bulk classifying ${emailIds.length} selected emails (overwrite: ${overwriteExisting})`);
      result = await classifySpecificEmails(emailIds, overwriteExisting);
    } else if (force) {
      // Force classification with options
      console.warn(`🔄 Force classifying emails (overwrite: ${overwriteExisting})`);
      result = await autoClassifyEmails(overwriteExisting);
    } else {
      // Check if classification is needed and trigger if so
      const success = await checkAndTriggerAutoClassification();
      result = {
        success,
        classified: 0,
        errors: 0,
        message: success ? 'Auto-classification check completed' : 'Auto-classification failed'
      };
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto-classification API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  } finally {
    // Always release the lock
    isClassifying = false;
    console.warn('🔓 Classification lock released');
  }
}

export async function GET(_request: NextRequest) {
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