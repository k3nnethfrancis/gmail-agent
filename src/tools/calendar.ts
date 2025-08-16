import { google } from 'googleapis';
import { createAuthenticatedClient } from '@/lib/auth';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export interface ListEventsOptions {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
  singleEvents?: boolean;
}

// Helper function to get calendar client with auth
function getCalendarClient(accessToken: string, refreshToken?: string) {
  const tokens = {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
  
  const auth = createAuthenticatedClient(tokens);
  return google.calendar({ version: 'v3', auth });
}

/**
 * List calendar events with optional filtering
 */
export async function listEvents(
  accessToken: string,
  options: ListEventsOptions = {},
  refreshToken?: string
) {
  try {
    const calendar = getCalendarClient(accessToken, refreshToken);
    
    const {
      calendarId = 'primary',
      timeMin,
      timeMax,
      maxResults = 50,
      orderBy = 'startTime',
      singleEvents = true,
    } = options;

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      maxResults,
      orderBy,
      singleEvents,
    });

    return {
      success: true,
      events: response.data.items || [],
      nextPageToken: response.data.nextPageToken,
    };
  } catch (error: any) {
    console.error('Calendar listEvents error:', error);
    return {
      success: false,
      error: error.message || 'Failed to list events',
    };
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(
  accessToken: string,
  eventData: CalendarEvent,
  calendarId: string = 'primary',
  refreshToken?: string
) {
  try {
    const calendar = getCalendarClient(accessToken, refreshToken);

    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventData,
    });

    return {
      success: true,
      event: response.data,
    };
  } catch (error: any) {
    console.error('Calendar createEvent error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create event',
    };
  }
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(
  accessToken: string,
  eventId: string,
  eventData: Partial<CalendarEvent>,
  calendarId: string = 'primary',
  refreshToken?: string
) {
  try {
    const calendar = getCalendarClient(accessToken, refreshToken);

    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: eventData,
    });

    return {
      success: true,
      event: response.data,
    };
  } catch (error: any) {
    console.error('Calendar updateEvent error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update event',
    };
  }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary',
  refreshToken?: string
) {
  try {
    const calendar = getCalendarClient(accessToken, refreshToken);

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Calendar deleteEvent error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete event',
    };
  }
}

/**
 * Get free/busy information for calendars
 */
export async function getFreeBusy(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  calendarIds: string[] = ['primary'],
  refreshToken?: string
) {
  try {
    const calendar = getCalendarClient(accessToken, refreshToken);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: calendarIds.map(id => ({ id })),
      },
    });

    return {
      success: true,
      calendars: response.data.calendars || {},
    };
  } catch (error: any) {
    console.error('Calendar getFreeBusy error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get free/busy information',
    };
  }
}

/**
 * Create a time block (simple event for blocking time)
 */
export async function createTimeBlock(
  accessToken: string,
  startTime: string,
  endTime: string,
  title: string,
  description?: string,
  calendarId: string = 'primary',
  refreshToken?: string
) {
  const eventData: CalendarEvent = {
    summary: title,
    description,
    start: { dateTime: startTime },
    end: { dateTime: endTime },
    reminders: { useDefault: false },
  };

  return createEvent(accessToken, eventData, calendarId, refreshToken);
}