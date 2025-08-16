import { NextRequest, NextResponse } from 'next/server';
import { createOAuth2Client, getAuthUrl } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const oauth2Client = createOAuth2Client();
    const authUrl = getAuthUrl(oauth2Client);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}