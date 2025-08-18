/**
 * Pure LLM Email Classification Service
 * 
 * Automatically categorizes emails using Claude Sonnet 4 ONLY - no rule-based fallbacks.
 * Implements intelligent, contextual classification with training examples integration.
 */

import Anthropic from '@anthropic-ai/sdk';
import { emailService, tagService, classificationService } from './database';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ClassificationResult {
  emailId: string;
  suggestedTagId: number;
  confidence: number;
  reasoning: string;
  category: string;
  wasNewCategory: boolean;
}

interface EmailSummary {
  id: string;
  subject: string;
  fromAddress: string;
  fromName?: string;
  snippet: string;
  isImportant: boolean;
}

interface LLMClassificationResponse {
  category: string;
  reasoning: string;
  confidence: number;
}

interface TrainingExample {
  subject: string;
  fromAddress: string;
  snippet: string;
  categoryName: string;
}

/**
 * Create LLM prompt for email classification with training examples
 */
function createClassificationPrompt(email: EmailSummary, trainingExamples: TrainingExample[], existingCategories: string[]): string {
  const trainingExamplesText = trainingExamples.length > 0 
    ? trainingExamples.slice(0, 20).map(ex => 
        `Email: "${ex.subject}" from ${ex.fromAddress}\nSnippet: "${ex.snippet.substring(0, 100)}..."\nCategory: ${ex.categoryName}`
      ).join('\n\n')
    : 'No training examples yet.';

  const existingCategoriesText = existingCategories.length > 0
    ? existingCategories.join(', ')
    : 'No existing categories.';

  return `You are an expert email classifier. Analyze this email and assign it to the most appropriate category.

TRAINING EXAMPLES (learn from these user-approved patterns):
${trainingExamplesText}

EXISTING CATEGORIES (prefer these when appropriate):
${existingCategoriesText}

CLASSIFICATION GUIDELINES:
- Create meaningful, specific categories (not generic ones like "General")
- Consider sender reputation, subject patterns, and content context
- Use existing categories when the email clearly fits
- Learn from training examples above - they represent user preferences
- Be consistent with similar emails the user has already classified
- Categories should be actionable and help organize the user's workflow

EMAIL TO CLASSIFY:
Subject: ${email.subject}
From: ${email.fromAddress}${email.fromName ? ` (${email.fromName})` : ''}
Content: ${email.snippet}
${email.isImportant ? 'This email is marked as IMPORTANT.' : ''}

Respond with ONLY a JSON object in this exact format:
{"reasoning": "Brief explanation of why this category fits", "category": "Category Name", "confidence": 0.95}`;
}

/**
 * Classify a single email using Claude Sonnet 4
 */
async function classifySingleEmailWithLLM(
  email: EmailSummary, 
  trainingExamples: TrainingExample[], 
  existingCategories: string[]
): Promise<LLMClassificationResponse> {
  try {
    const prompt = createClassificationPrompt(email, trainingExamples, existingCategories);
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const textResponse = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Parse JSON response
    let classificationData: LLMClassificationResponse;
    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = textResponse.match(/\{[^}]+\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      classificationData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.warn('Failed to parse LLM response as JSON:', textResponse);
      // Fallback classification
      return {
        category: 'Unclassified',
        reasoning: 'Failed to parse LLM response',
        confidence: 0.3
      };
    }

    // Validate response structure
    if (!classificationData.reasoning || !classificationData.category || typeof classificationData.confidence !== 'number') {
      throw new Error('Invalid LLM response structure');
    }

    // Ensure confidence is between 0 and 1
    classificationData.confidence = Math.max(0, Math.min(1, classificationData.confidence));

    return classificationData;

  } catch (error) {
    console.error('LLM classification error for email:', email.id, error);
    // Fallback for API errors
    return {
      category: 'Unclassified',
      reasoning: 'Classification failed due to API error',
      confidence: 0.2
    };
  }
}

/**
 * Classify emails using pure LLM approach with training examples
 */
export async function classifyEmailsWithLLM(emails: EmailSummary[]): Promise<ClassificationResult[]> {
  try {
    console.warn(`🤖 Starting pure LLM classification for ${emails.length} emails...`);
    
    // Get existing tags and training examples
    const existingTags = tagService.getAllTags();
    const existingCategories = existingTags.map(tag => tag.name);
    const trainingExamples = getTrainingExamples();
    
    console.warn(`📚 Using ${trainingExamples.length} training examples and ${existingCategories.length} existing categories`);
    
    const results: ClassificationResult[] = [];
    
    // Process each email individually for better accuracy
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      console.warn(`🔍 Classifying email ${i + 1}/${emails.length}: "${email.subject.substring(0, 50)}..."`);
      
      try {
        // Get LLM classification
        const llmResponse = await classifySingleEmailWithLLM(email, trainingExamples, existingCategories);
        
        // Find or create the category
        let tag = existingTags.find(t => t.name.toLowerCase() === llmResponse.category.toLowerCase());
        let wasNewCategory = false;
        
        if (!tag) {
          // Create new category with LLM-suggested name
          const color = generateColorForCategory(llmResponse.category);
          tag = tagService.createTag(
            llmResponse.category,
            color,
            `AI-created category: ${llmResponse.reasoning}`
          );
          wasNewCategory = true;
          console.warn(`🏷️ Created new category: "${llmResponse.category}"`);
          
          // Add to existing categories for subsequent classifications in this batch
          existingCategories.push(llmResponse.category);
          existingTags.push(tag);
        }
        
        results.push({
          emailId: email.id,
          suggestedTagId: tag.id,
          confidence: llmResponse.confidence,
          reasoning: llmResponse.reasoning,
          category: llmResponse.category,
          wasNewCategory
        });
        
        // Small delay between API calls to be respectful
        if (i < emails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (emailError) {
        console.error(`Failed to classify email ${email.id}:`, emailError);
        // Create fallback classification
        let fallbackTag = existingTags.find(t => t.name === 'Unclassified');
        if (!fallbackTag) {
          fallbackTag = tagService.createTag('Unclassified', '#6b7280', 'Fallback category for classification failures');
        }
        
        results.push({
          emailId: email.id,
          suggestedTagId: fallbackTag.id,
          confidence: 0.1,
          reasoning: 'Classification failed - requires manual review',
          category: 'Unclassified',
          wasNewCategory: false
        });
      }
    }

    const newCategoriesCount = results.filter(r => r.wasNewCategory).length;
    console.warn(`✅ Pure LLM Classification completed: ${results.length} emails classified, ${newCategoriesCount} new categories created`);
    
    return results;

  } catch (error) {
    console.error('Email classification error:', error);
    throw new Error(error instanceof Error ? error.message : 'Classification failed');
  }
}


/**
 * Generate a color for a category based on its name
 */
function generateColorForCategory(categoryName: string): string {
  const colors = [
    '#dc2626', // red
    '#059669', // green
    '#3b82f6', // blue
    '#7c3aed', // purple
    '#d97706', // orange
    '#0891b2', // cyan
    '#be123c', // rose
    '#7c2d12', // brown
    '#4338ca', // indigo
    '#0d9488'  // teal
  ];
  
  // Simple hash function to consistently assign colors
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = ((hash << 5) - hash + categoryName.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length];
}


/**
 * Get training examples for improving classification
 */
function getTrainingExamples(): Array<{
  subject: string;
  fromAddress: string; 
  snippet: string;
  categoryName: string;
}> {
  try {
    const examples = classificationService.getTrainingExamples(undefined, 100);
    return examples.map(ex => ({
      subject: ex.emailSubject,
      fromAddress: ex.emailFrom,
      snippet: ex.emailSnippet,
      categoryName: ex.tagName
    }));
  } catch (error) {
    console.warn('Failed to get training examples:', error);
    return [];
  }
}


/**
 * Auto-classify all untagged emails in the database
 */
export async function autoClassifyEmails(overwriteExisting: boolean = false): Promise<{
  success: boolean;
  classified: number;
  errors: number;
  message: string;
}> {
  try {
    console.warn(`🚀 Starting auto-classification of emails (overwrite: ${overwriteExisting})...`);
    
    // Get emails based on overwrite setting
    const allEmails = emailService.getEmails({ limit: 200 });
    let targetEmails;
    
    if (overwriteExisting) {
      // Classify ALL emails, removing existing tags first
      targetEmails = allEmails;
      console.warn(`📧 Processing all ${targetEmails.length} emails (removing existing classifications)`);
      
      // Remove existing tags from all emails
      for (const email of targetEmails) {
        const existingTags = tagService.getEmailTags(email.id);
        for (const tag of existingTags) {
          tagService.removeTagFromEmail(email.id, tag.id);
        }
      }
    } else {
      // Only classify untagged emails
      targetEmails = allEmails.filter(email => {
        const tags = tagService.getEmailTags(email.id);
        return tags.length === 0;
      });
      
      if (targetEmails.length === 0) {
        return {
          success: true,
          classified: 0,
          errors: 0,
          message: 'No emails need classification'
        };
      }
      
      console.warn(`📧 Found ${targetEmails.length} untagged emails for classification`);
    }

    // Prepare email summaries for LLM
    const emailSummaries: EmailSummary[] = targetEmails.map(email => ({
      id: email.id,
      subject: email.subject,
      fromAddress: email.fromAddress,
      fromName: email.fromName,
      snippet: email.snippet,
      isImportant: email.isImportant
    }));

    // Classify in batches of 50 to avoid token limits
    const batchSize = 50;
    let totalClassified = 0;
    let totalErrors = 0;

    for (let i = 0; i < emailSummaries.length; i += batchSize) {
      const batch = emailSummaries.slice(i, i + batchSize);
      
      try {
        console.warn(`🔄 Classifying batch ${Math.floor(i/batchSize) + 1} (${batch.length} emails)`);
        
        const classifications = await classifyEmailsWithLLM(batch);
        
        // Apply classifications to database
        for (const classification of classifications) {
          try {
            tagService.assignTagToEmail(
              classification.emailId,
              classification.suggestedTagId,
              'ai',
              classification.confidence,
              classification.reasoning
            );
            totalClassified++;
          } catch (assignError) {
            console.error(`Failed to assign tag for email ${classification.emailId}:`, assignError);
            totalErrors++;
          }
        }

        // Small delay between batches to be respectful to the API
        if (i + batchSize < emailSummaries.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (batchError) {
        console.error(`Batch classification failed for emails ${i}-${i + batchSize - 1}:`, batchError);
        totalErrors += batch.length;
      }
    }

    const message = `Auto-classification complete: ${totalClassified} emails classified, ${totalErrors} errors${overwriteExisting ? ' (overwrote existing)' : ''}`;
    console.warn(`✅ ${message}`);

    return {
      success: totalClassified > 0,
      classified: totalClassified,
      errors: totalErrors,
      message
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Auto-classification failed';
    console.error('Auto-classification error:', error);
    
    return {
      success: false,
      classified: 0,
      errors: 1,
      message: errorMessage
    };
  }
}

/**
 * Classify specific emails by ID (for bulk operations)
 */
export async function classifySpecificEmails(
  emailIds: string[], 
  overwriteExisting: boolean = false
): Promise<{
  success: boolean;
  classified: number;
  errors: number;
  message: string;
}> {
  try {
    console.warn(`🎯 Starting classification of ${emailIds.length} specific emails (overwrite: ${overwriteExisting})...`);
    
    // Get the specific emails from database
    const allEmails = emailService.getEmails({ limit: 1000 });
    let targetEmails = allEmails.filter(email => emailIds.includes(email.id));

    if (targetEmails.length === 0) {
      return {
        success: false,
        classified: 0,
        errors: 0,
        message: 'No matching emails found'
      };
    }

    // Filter for unclassified only if overwriteExisting is false
    if (!overwriteExisting) {
      const unclassifiedEmails = targetEmails.filter(email => {
        const tags = tagService.getEmailTags(email.id);
        return tags.length === 0;
      });
      
      if (unclassifiedEmails.length === 0) {
        return {
          success: true,
          classified: 0,
          errors: 0,
          message: 'All selected emails are already classified. Use overwrite option to reclassify.'
        };
      }
      
      targetEmails = unclassifiedEmails;
      console.warn(`📧 Found ${targetEmails.length} unclassified emails out of ${emailIds.length} selected`);
    } else {
      console.warn(`📧 Processing all ${targetEmails.length} emails (including already classified)`);
      
      // Remove existing tags from these emails for re-classification
      for (const email of targetEmails) {
        const existingTags = tagService.getEmailTags(email.id);
        for (const tag of existingTags) {
          tagService.removeTagFromEmail(email.id, tag.id);
        }
      }
    }

    // Prepare email summaries for classification
    const emailSummaries: EmailSummary[] = targetEmails.map(email => ({
      id: email.id,
      subject: email.subject,
      fromAddress: email.fromAddress,
      fromName: email.fromName,
      snippet: email.snippet,
      isImportant: email.isImportant
    }));

    // Classify emails
    const classifications = await classifyEmailsWithLLM(emailSummaries);
    
    // Apply classifications to database
    let totalClassified = 0;
    let totalErrors = 0;

    for (const classification of classifications) {
      try {
        tagService.assignTagToEmail(
          classification.emailId,
          classification.suggestedTagId,
          'ai',
          classification.confidence,
          classification.reasoning
        );
        totalClassified++;
      } catch (assignError) {
        console.error(`Failed to assign tag for email ${classification.emailId}:`, assignError);
        totalErrors++;
      }
    }

    const message = `Bulk classification complete: ${totalClassified} emails classified, ${totalErrors} errors`;
    console.warn(`✅ ${message}`);

    return {
      success: totalClassified > 0,
      classified: totalClassified,
      errors: totalErrors,
      message
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bulk classification failed';
    console.error('Bulk classification error:', error);
    
    return {
      success: false,
      classified: 0,
      errors: emailIds.length,
      message: errorMessage
    };
  }
}

/**
 * Check if emails need auto-classification and trigger if needed
 */
export async function checkAndTriggerAutoClassification(): Promise<boolean> {
  try {
    // Check if user has untagged emails
    const allEmails = emailService.getEmails({ limit: 200 });
    const untaggedCount = allEmails.filter(email => {
      const tags = tagService.getEmailTags(email.id);
      return tags.length === 0;
    }).length;

    // If more than 10 emails are untagged, trigger auto-classification
    if (untaggedCount >= 10) {
      console.warn(`🎯 Triggering auto-classification for ${untaggedCount} untagged emails`);
      const result = await autoClassifyEmails();
      return result.success;
    }

    return true; // No classification needed
  } catch (error) {
    console.error('Auto-classification check failed:', error);
    return false;
  }
}

/**
 * Classify a single email using LLM (for real-time classification)
 */
export async function classifySingleEmail(email: EmailSummary): Promise<ClassificationResult> {
  try {
    const existingTags = tagService.getAllTags();
    const existingCategories = existingTags.map(tag => tag.name);
    const trainingExamples = getTrainingExamples();
    
    // Get LLM classification
    const llmResponse = await classifySingleEmailWithLLM(email, trainingExamples, existingCategories);
    
    // Find or create the category
    let tag = existingTags.find(t => t.name.toLowerCase() === llmResponse.category.toLowerCase());
    let wasNewCategory = false;
    
    if (!tag) {
      // Create new category
      const color = generateColorForCategory(llmResponse.category);
      tag = tagService.createTag(
        llmResponse.category,
        color,
        `AI-created category: ${llmResponse.reasoning}`
      );
      wasNewCategory = true;
      console.warn(`🏷️ Created new category for single email: "${llmResponse.category}"`);
    }
    
    return {
      emailId: email.id,
      suggestedTagId: tag.id,
      confidence: llmResponse.confidence,
      reasoning: llmResponse.reasoning,
      category: llmResponse.category,
      wasNewCategory
    };
    
  } catch (error) {
    console.error('Single email classification failed:', error);
    // Create fallback classification
    const existingTags = tagService.getAllTags();
    let fallbackTag = existingTags.find(t => t.name === 'Unclassified');
    if (!fallbackTag) {
      fallbackTag = tagService.createTag('Unclassified', '#6b7280', 'Fallback category for classification failures');
    }
    
    return {
      emailId: email.id,
      suggestedTagId: fallbackTag.id,
      confidence: 0.1,
      reasoning: 'Classification failed - requires manual review',
      category: 'Unclassified',
      wasNewCategory: false
    };
  }
}

/**
 * Classify new incoming emails automatically
 */
export async function classifyNewEmails(): Promise<{
  success: boolean;
  classified: number;
  errors: number;
  message: string;
}> {
  try {
    console.warn('🔄 Checking for new emails to classify...');
    
    // Get all emails without tags (new emails)
    const allEmails = emailService.getEmails({ limit: 50 }); // Check recent emails only
    const untaggedEmails = allEmails.filter(email => {
      const tags = tagService.getEmailTags(email.id);
      return tags.length === 0;
    });

    if (untaggedEmails.length === 0) {
      return {
        success: true,
        classified: 0,
        errors: 0,
        message: 'No new emails to classify'
      };
    }

    console.warn(`📧 Found ${untaggedEmails.length} new emails to classify`);

    // Classify each new email
    let totalClassified = 0;
    let totalErrors = 0;

    for (const email of untaggedEmails) {
      try {
        const emailSummary: EmailSummary = {
          id: email.id,
          subject: email.subject,
          fromAddress: email.fromAddress,
          fromName: email.fromName,
          snippet: email.snippet,
          isImportant: email.isImportant
        };

        const classification = await classifySingleEmail(emailSummary);
        
        // Apply classification
        tagService.assignTagToEmail(
          classification.emailId,
          classification.suggestedTagId,
          'ai',
          classification.confidence,
          classification.reasoning
        );
        
        totalClassified++;
        console.warn(`✅ Classified: "${email.subject.substring(0, 30)}..." → ${classification.category}`);
        
        // Small delay between classifications
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Failed to classify email ${email.id}:`, error);
        totalErrors++;
      }
    }

    const message = `New email classification complete: ${totalClassified} emails classified, ${totalErrors} errors`;
    console.warn(`✅ ${message}`);

    return {
      success: totalClassified > 0,
      classified: totalClassified,
      errors: totalErrors,
      message
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'New email classification failed';
    console.error('New email classification error:', error);
    
    return {
      success: false,
      classified: 0,
      errors: 1,
      message: errorMessage
    };
  }
}