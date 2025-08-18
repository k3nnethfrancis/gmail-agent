/**
 * Tag Management API Endpoint
 * 
 * Provides CRUD operations for email tags in the local SQLite database.
 * Part of the Inbox Concierge Phase 3 implementation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCookies } from '@/lib/auth';
import { tagService } from '@/lib/database';

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
    const includeStats = searchParams.get('includeStats') === 'true';

    console.warn('📧 Fetching tags', { includeStats });

    if (includeStats) {
      // Get tags with email count statistics
      const tagsWithStats = tagService.getTagStats();
      return NextResponse.json({
        success: true,
        tags: tagsWithStats,
      });
    } else {
      // Get basic tag list
      const tags = tagService.getAllTags();
      return NextResponse.json({
        success: true,
        tags,
      });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tag fetch API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();
    const { name, color, description } = body;

    if (!name || !color) {
      return NextResponse.json(
        { success: false, error: 'Name and color are required' },
        { status: 400 }
      );
    }

    // Validate color format (hex color)
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json(
        { success: false, error: 'Color must be a valid hex color (e.g., #ff0000)' },
        { status: 400 }
      );
    }

    console.warn('📧 Creating new tag', { name, color, description });

    try {
      const newTag = tagService.createTag(name, color, description);
      
      return NextResponse.json({
        success: true,
        tag: newTag,
      });
    } catch (createError) {
      // Handle unique constraint violation
      if (createError instanceof Error && createError.message.includes('UNIQUE')) {
        return NextResponse.json(
          { success: false, error: 'A tag with this name already exists' },
          { status: 409 }
        );
      }
      throw createError;
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tag creation API error:', error);
    
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
    const { id, name, color, description } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    // Validate color format if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json(
        { success: false, error: 'Color must be a valid hex color (e.g., #ff0000)' },
        { status: 400 }
      );
    }

    console.warn('📧 Updating tag', { id, name, color, description });

    // Check if tag exists
    const existingTag = tagService.getTagById(id);
    if (!existingTag) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      );
    }

    // All tags can now be edited freely

    // Prepare updates
    const updates: { name?: string; color?: string; description?: string } = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (description !== undefined) updates.description = description;

    try {
      tagService.updateTag(id, updates);
      
      // Return updated tag
      const updatedTag = tagService.getTagById(id);
      
      return NextResponse.json({
        success: true,
        tag: updatedTag,
      });
    } catch (updateError) {
      // Handle unique constraint violation
      if (updateError instanceof Error && updateError.message.includes('UNIQUE')) {
        return NextResponse.json(
          { success: false, error: 'A tag with this name already exists' },
          { status: 409 }
        );
      }
      throw updateError;
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tag update API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    const tagId = parseInt(id);
    if (isNaN(tagId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tag ID' },
        { status: 400 }
      );
    }

    console.warn('📧 Deleting tag', { tagId });

    // Check if tag exists
    const existingTag = tagService.getTagById(tagId);
    if (!existingTag) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      );
    }

    // All tags can now be deleted freely

    const deleted = tagService.deleteTag(tagId);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete tag' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tag deleted successfully',
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tag deletion API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}