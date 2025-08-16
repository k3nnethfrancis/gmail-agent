import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { listThreads } from '@/tools/gmail';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('google_access_token')?.value;
    const refreshToken = cookieStore.get('google_refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available. Please authenticate first.' },
        { status: 401 }
      );
    }

    // Test Gmail API by listing recent email threads
    const result = await listThreads(
      accessToken,
      {
        maxResults: 10,
        labelIds: ['INBOX'],
      },
      refreshToken
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Gmail API test successful',
        threadCount: result.threads?.length || 0,
        resultSizeEstimate: result.resultSizeEstimate,
        threads: result.threads?.map(thread => ({
          id: thread.id,
          snippet: thread.snippet,
        })),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Gmail test error:', error);
    return NextResponse.json(
      { error: 'Gmail test failed', details: error.message },
      { status: 500 }
    );
  }
}