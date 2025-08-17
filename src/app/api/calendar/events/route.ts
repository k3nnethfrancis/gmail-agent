import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as calendarTools from '@/tools/calendar';
import { refreshAccessToken, createOAuth2Client } from '@/lib/auth';

// Helper to get tokens from cookies
async function getTokensFromCookies() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get('google_access_token')?.value,
    refreshToken: cookieStore.get('google_refresh_token')?.value,
  };
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] 📅 Calendar Events API: Incoming request`);

  try {
    // Get authentication tokens
    const tokens = await getTokensFromCookies();
    console.warn(`[${timestamp}] 🔐 Auth check:`, {
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken,
    });

    if (!tokens.accessToken) {
      // Try to refresh the access token if we have a refresh token
      if (tokens.refreshToken) {
        console.warn(`[${timestamp}] 🔄 Access token missing, attempting refresh...`);
        try {
          const oauth2Client = createOAuth2Client();
          const refreshedTokens = await refreshAccessToken(oauth2Client, tokens.refreshToken);
          
          if (refreshedTokens.access_token) {
            console.warn(`[${timestamp}] ✅ Access token refreshed successfully`);
            
            // Update the access token for this request
            tokens.accessToken = refreshedTokens.access_token;
          } else {
            throw new Error('No access token in refresh response');
          }
        } catch (refreshError) {
          console.warn(`[${timestamp}] ❌ Token refresh failed:`, refreshError);
          return NextResponse.json(
            { error: 'Authentication expired. Please login with Google again.' },
            { status: 401 }
          );
        }
      } else {
        console.warn(`[${timestamp}] ❌ No access token or refresh token found`);
        return NextResponse.json(
          { error: 'Authentication required. Please login with Google.' },
          { status: 401 }
        );
      }
    }

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    const maxResults = searchParams.get('maxResults');

    // Build options for listEvents
    const options: calendarTools.ListEventsOptions = {};
    
    if (timeMin) options.timeMin = timeMin;
    if (timeMax) options.timeMax = timeMax;
    if (maxResults) options.maxResults = parseInt(maxResults, 10);

    console.warn(`[${timestamp}] 📋 Fetching calendar events with options:`, options);

    // Call the existing calendar tool
    const result = await calendarTools.listEvents(
      tokens.accessToken,
      options,
      tokens.refreshToken
    );

    if (!result.success) {
      console.warn(`[${timestamp}] ❌ Calendar API failed:`, result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to fetch calendar events' },
        { status: 500 }
      );
    }

    const events = result.events || [];
    console.warn(`[${timestamp}] ✅ Calendar events retrieved:`, {
      eventCount: events.length,
      dateRange: timeMin && timeMax ? `${timeMin} to ${timeMax}` : 'all',
    });

    // Transform events to react-big-calendar format
    const transformedEvents = events.map((event: any) => ({
      id: event.id,
      title: event.summary || 'Untitled Event',
      start: new Date(event.start?.dateTime || event.start?.date),
      end: new Date(event.end?.dateTime || event.end?.date),
      allDay: !event.start?.dateTime, // All-day if no time specified
      description: event.description || '',
      location: event.location || '',
      attendees: event.attendees?.map((attendee: any) => attendee.email) || [],
      // Add original event data for reference
      originalEvent: event,
    }));

    const response = NextResponse.json({
      success: true,
      events: transformedEvents,
      count: transformedEvents.length,
    });

    // If we refreshed the token, update the cookie
    if (tokens.accessToken && tokens.accessToken !== (await getTokensFromCookies()).accessToken) {
      response.cookies.set('google_access_token', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600, // 1 hour
      });
    }

    return response;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${timestamp}] ❌ Calendar Events API error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events', details: errorMessage },
      { status: 500 }
    );
  }
}