'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, addDays, isSameDay, isToday } from 'date-fns';
import { CalendarDays, Loader, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarRefresh } from '@/contexts/CalendarRefreshContext';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  description?: string;
  location?: string;
  attendees?: string[];
  originalEvent?: any;
}

type ViewType = 'day' | 'week' | 'agenda';

interface CalendarWidgetProps {
  className?: string;
}

export default function CalendarWidget({ className = '' }: CalendarWidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get calendar refresh context
  const { registerRefreshFunction } = useCalendarRefresh();

  // Fetch calendar events
  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      
      // Calculate date range based on current view and date
      let timeMin: string;
      let timeMax: string;

      switch (view) {
        case 'day':
          timeMin = startOfDay(currentDate).toISOString();
          timeMax = endOfDay(currentDate).toISOString();
          break;
        case 'week':
          timeMin = startOfWeek(currentDate, { weekStartsOn: 0 }).toISOString();
          timeMax = endOfWeek(currentDate, { weekStartsOn: 0 }).toISOString();
          break;
        case 'agenda':
        default:
          // For agenda, show next 2 weeks
          timeMin = startOfDay(new Date()).toISOString();
          timeMax = endOfDay(addDays(new Date(), 14)).toISOString();
          break;
      }

      const params = new URLSearchParams({
        timeMin,
        timeMax,
        maxResults: '50',
      });

      const response = await fetch(`/api/calendar/events?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please authenticate with Google to view your calendar.');
        }
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      // Convert date strings back to Date objects
      const eventsWithDates = data.events.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));

      setEvents(eventsWithDates);
      console.warn(`📅 Calendar widget loaded ${eventsWithDates.length} events for ${view} view`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Calendar widget error:', error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [view, currentDate]);

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Polling for real-time updates (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Manual refresh
  const handleRefresh = () => {
    setIsLoading(true);
    fetchEvents();
  };

  // Register refresh function with context for external triggering
  useEffect(() => {
    registerRefreshFunction(handleRefresh);
  }, [registerRefreshFunction]);

  // Navigation functions
  const navigateToday = () => setCurrentDate(new Date());
  const navigatePrev = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    }
  };
  const navigateNext = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    }
  };

  // Format time for display
  const formatTime = (date: Date) => format(date, 'h:mm a');
  
  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.start, day));
  };

  // Render different views
  const renderView = () => {
    switch (view) {
      case 'day':
        return renderDayView();
      case 'week':
        return renderWeekView();
      case 'agenda':
      default:
        return renderAgendaView();
    }
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    
    return (
      <div className="space-y-2">
        <div className="text-center text-sm font-medium text-gray-700 py-2 border-b">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {dayEvents.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">No events</div>
          ) : (
            dayEvents.map(event => (
              <div key={event.id} className="p-2 bg-blue-50 rounded border-l-4 border-blue-500">
                <div className="font-medium text-sm">{event.title}</div>
                <div className="text-xs text-gray-600">
                  {formatTime(event.start)} - {formatTime(event.end)}
                </div>
                {event.location && (
                  <div className="text-xs text-gray-500">{event.location}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    return (
      <div className="space-y-2">
        <div className="text-center text-sm font-medium text-gray-700 py-2 border-b">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs max-h-64 overflow-y-auto">
          {weekDays.map(day => {
            const dayEvents = getEventsForDay(day);
            const dayIsToday = isToday(day);
            
            return (
              <div key={day.toISOString()} className="border rounded">
                <div className={`text-center p-1 font-medium ${
                  dayIsToday ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-700'
                }`}>
                  {format(day, 'EEE d')}
                </div>
                <div className="p-1 space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div key={event.id} className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs truncate">
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-gray-500 text-xs">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const upcomingEvents = events
      .filter(event => event.start >= new Date())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 10);
    
    return (
      <div className="space-y-2">
        <div className="text-center text-sm font-medium text-gray-700 py-2 border-b">
          Upcoming Events
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {upcomingEvents.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">No upcoming events</div>
          ) : (
            upcomingEvents.map(event => (
              <div key={event.id} className="p-2 bg-gray-50 rounded border">
                <div className="font-medium text-sm">{event.title}</div>
                <div className="text-xs text-gray-600">
                  {format(event.start, 'EEE, MMM d')} • {formatTime(event.start)} - {formatTime(event.end)}
                </div>
                {event.location && (
                  <div className="text-xs text-gray-500">{event.location}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CalendarDays className="w-5 h-5 mr-2" />
            Calendar
          </h2>
          <button
            onClick={handleRefresh}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh calendar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-4 rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <CalendarDays className="w-5 h-5 mr-2" />
          Calendar
        </h2>
        <div className="flex items-center space-x-2">
          {isLoading && (
            <Loader className="w-4 h-4 animate-spin text-gray-400" />
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh calendar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex space-x-2 mb-4">
        {(['agenda', 'day', 'week'] as ViewType[]).map((viewOption) => (
          <button
            key={viewOption}
            onClick={() => setView(viewOption)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              view === viewOption
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {viewOption.charAt(0).toUpperCase() + viewOption.slice(1)}
          </button>
        ))}
      </div>

      {/* Navigation (only for day/week views) */}
      {(view === 'day' || view === 'week') && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={navigatePrev}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={navigateToday}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Today
          </button>
          <button
            onClick={navigateNext}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Calendar Content */}
      {renderView()}

      {/* Event Count */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        {events.length} event{events.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}