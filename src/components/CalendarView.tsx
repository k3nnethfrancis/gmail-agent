'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Clock,
  MapPin,
  Users
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch calendar events
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate date range based on current view
      const startDate = getViewStartDate(currentDate, viewMode);
      const endDate = getViewEndDate(currentDate, viewMode);

      const response = await fetch(`/api/calendar/events?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError(error instanceof Error ? error.message : 'Failed to load calendar');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Helper functions for date calculations
  function getViewStartDate(date: Date, mode: 'month' | 'week' | 'day'): Date {
    const start = new Date(date);
    switch (mode) {
      case 'month':
        start.setDate(1);
        start.setDate(start.getDate() - start.getDay()); // Start of week containing first day of month
        break;
      case 'week':
        start.setDate(start.getDate() - start.getDay()); // Start of current week
        break;
      case 'day':
        // Already the correct day
        break;
    }
    start.setHours(0, 0, 0, 0);
    return start;
  }

  function getViewEndDate(date: Date, mode: 'month' | 'week' | 'day'): Date {
    const end = new Date(date);
    switch (mode) {
      case 'month':
        end.setMonth(end.getMonth() + 1, 0); // Last day of month
        end.setDate(end.getDate() + (6 - end.getDay())); // End of week containing last day of month
        break;
      case 'week':
        end.setDate(end.getDate() + (6 - end.getDay())); // End of current week
        break;
      case 'day':
        // Same day
        break;
    }
    end.setHours(23, 59, 59, 999);
    return end;
  }

  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format date for display
  const formatDisplayDate = () => {
    const options: Intl.DateTimeFormatOptions = {};
    switch (viewMode) {
      case 'month':
        options.year = 'numeric';
        options.month = 'long';
        break;
      case 'week':
        const startOfWeek = getViewStartDate(currentDate, 'week');
        const endOfWeek = getViewEndDate(currentDate, 'week');
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'day':
        options.weekday = 'long';
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        break;
    }
    return currentDate.toLocaleDateString('en-US', options);
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date || '');
      return eventDate.toDateString() === date.toDateString();
    });
  };

  // Format event time
  const formatEventTime = (event: CalendarEvent): string => {
    if (event.start.dateTime) {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime || event.start.dateTime);
      return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    return 'All day';
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={navigatePrevious}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
              >
                Today
              </button>
              <button
                onClick={navigateNext}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-lg font-medium text-gray-900">
              {formatDisplayDate()}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Selector */}
            <div className="flex border border-gray-300 rounded-lg">
              {(['month', 'week', 'day'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-sm capitalize ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${mode === 'month' ? 'rounded-l-lg' : mode === 'day' ? 'rounded-r-lg' : ''}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              onClick={fetchEvents}
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                // This would open a create event modal
                console.log('Create new event');
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 p-4">
        {viewMode === 'month' && <MonthView currentDate={currentDate} events={events} />}
        {viewMode === 'week' && <WeekView currentDate={currentDate} events={events} />}
        {viewMode === 'day' && <DayView currentDate={currentDate} events={events} />}
      </div>

      {error && (
        <div className="mx-4 mb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Month View Component
function MonthView({ currentDate, events }: { currentDate: Date, events: CalendarEvent[] }) {
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Get first day of the month's week start
  const calendarStart = new Date(startDate);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
  
  // Generate calendar days
  const days = [];
  const current = new Date(calendarStart);
  
  for (let i = 0; i < 42; i++) { // 6 weeks
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const today = new Date();

  return (
    <div className="h-full flex flex-col">
      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 gap-px bg-gray-200">
        {days.map(day => {
          const dayEvents = events.filter(event => {
            const eventDate = new Date(event.start.dateTime || event.start.date || '');
            return eventDate.toDateString() === day.toDateString();
          });

          const isToday = day.toDateString() === today.toDateString();
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          return (
            <div
              key={day.toDateString()}
              className={`bg-white p-2 min-h-[120px] ${!isCurrentMonth ? 'text-gray-400' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="text-xs p-1 bg-blue-50 text-blue-700 rounded truncate"
                    title={event.summary}
                  >
                    {event.summary}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ currentDate, events }: { currentDate: Date, events: CalendarEvent[] }) {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    days.push(day);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Week header */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 mb-4">
        {days.map(day => {
          const dayEvents = events.filter(event => {
            const eventDate = new Date(event.start.dateTime || event.start.date || '');
            return eventDate.toDateString() === day.toDateString();
          });

          return (
            <div key={day.toDateString()} className="bg-white p-3">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {day.getDate()}
                </div>
                <div className="mt-2 space-y-1">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-1 bg-blue-50 text-blue-700 rounded"
                    >
                      {event.summary}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Day View Component
function DayView({ currentDate, events }: { currentDate: Date, events: CalendarEvent[] }) {
  const dayEvents = events.filter(event => {
    const eventDate = new Date(event.start.dateTime || event.start.date || '');
    return eventDate.toDateString() === currentDate.toDateString();
  });

  return (
    <div className="h-full">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h3>
        
        {dayEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No events scheduled for this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map(event => (
              <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{event.summary}</h4>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {event.start.dateTime ? (
                          `${new Date(event.start.dateTime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })} - ${new Date(event.end.dateTime || event.start.dateTime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}`
                        ) : 'All day'}
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {event.location}
                        </div>
                      )}
                      
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}