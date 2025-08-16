import { NextRequest, NextResponse } from 'next/server';
import { createOAuth2Client, getTokensFromCode } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=missing_code', request.url)
      );
    }

    const oauth2Client = createOAuth2Client();
    const tokens = await getTokensFromCode(oauth2Client, code);

    // Store tokens in secure HTTP-only cookies
    const cookieStore = cookies();
    
    // Set access token (shorter expiry)
    cookieStore.set('google_access_token', tokens.access_token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
    });

    // Set refresh token (longer expiry)
    if (tokens.refresh_token) {
      cookieStore.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    // Redirect to main app with success
    return NextResponse.redirect(new URL('/?auth=success', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=auth_failed', request.url)
    );
  }
}