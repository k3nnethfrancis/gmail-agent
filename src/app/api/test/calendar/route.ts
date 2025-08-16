import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { listEvents } from '@/tools/calendar';

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

    // Test calendar API by listing next 10 events
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const result = await listEvents(
      accessToken,
      {
        timeMin: now.toISOString(),
        timeMax: nextWeek.toISOString(),
        maxResults: 10,
      },
      refreshToken
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Calendar API test successful',
        eventCount: result.events?.length || 0,
        events: result.events?.map(event => ({
          id: event.id,
          summary: event.summary,
          start: event.start,
          end: event.end,
        })),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Calendar test error:', error);
    return NextResponse.json(
      { error: 'Calendar test failed', details: error.message },
      { status: 500 }
    );
  }
}