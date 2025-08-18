/**
 * Training Examples API Endpoint
 * 
 * Manages email training examples for improving classification accuracy
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCookies } from '@/lib/auth';
import { emailService, tagService } from '@/lib/database';

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

    const body = await request.json();
    const { emailId } = body;

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: 'Email ID is required' },
        { status: 400 }
      );
    }

    // Get the email and its current tags
    const email = emailService.getEmailById(emailId);
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }

    const currentTags = tagService.getEmailTags(emailId);
    
    if (currentTags.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Email must be tagged before marking as training example' },
        { status: 400 }
      );
    }

    // Mark all current email-tag combinations as user-assigned (training examples)
    for (const tag of currentTags) {
      // Update the assignment to be user-assigned if it's not already
      if (tag.assignedBy !== 'user') {
        tagService.assignTagToEmail(
          emailId,
          tag.id,
          'user', // Mark as user-assigned (training example)
          1.0,    // High confidence for user examples
          'Marked as training example by user'
        );
      }
    }

    console.warn(`🎯 Training example created: Email "${email.subject}" with tags [${currentTags.map(t => t.name).join(', ')}]`);

    return NextResponse.json({
      success: true,
      message: `Email marked as training example with ${currentTags.length} tag(s)`,
      emailId,
      tags: currentTags.map(tag => ({ id: tag.id, name: tag.name }))
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Training examples API error:', error);
    
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

    // Get all training examples (user-assigned tags)
    const trainingExamples = [];
    const allEmails = emailService.getEmails({ limit: 1000 });
    
    for (const email of allEmails) {
      const tags = tagService.getEmailTags(email.id);
      const userTags = tags.filter(tag => tag.assignedBy === 'user');
      
      if (userTags.length > 0) {
        trainingExamples.push({
          emailId: email.id,
          subject: email.subject,
          fromAddress: email.fromAddress,
          snippet: email.snippet,
          tags: userTags.map(tag => ({ id: tag.id, name: tag.name, color: tag.color }))
        });
      }
    }

    return NextResponse.json({
      success: true,
      trainingExamples,
      count: trainingExamples.length
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Training examples GET API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const tokens = await getTokensFromCookies();
    if (!tokens.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { emailId } = body;

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: 'Email ID is required' },
        { status: 400 }
      );
    }

    // Get the email and its current tags
    const email = emailService.getEmailById(emailId);
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }

    const currentTags = tagService.getEmailTags(emailId);
    const userTags = currentTags.filter(tag => tag.assignedBy === 'user');
    
    if (userTags.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Email is not marked as a training example' },
        { status: 400 }
      );
    }

    // Convert all user-assigned tags back to AI-assigned
    for (const tag of userTags) {
      tagService.assignTagToEmail(
        emailId,
        tag.id,
        'ai',  // Change back to AI-assigned
        0.8,   // Default AI confidence
        'Removed from training examples by user'
      );
    }

    console.warn(`🗑️ Training example removed: Email "${email.subject}" with tags [${userTags.map(t => t.name).join(', ')}]`);

    return NextResponse.json({
      success: true,
      message: `Email removed from training examples for ${userTags.length} tag(s)`,
      emailId,
      tags: userTags.map(tag => ({ id: tag.id, name: tag.name }))
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Training examples DELETE API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}