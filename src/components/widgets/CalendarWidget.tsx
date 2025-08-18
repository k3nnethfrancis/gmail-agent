'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { CalendarDays, Loader, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react';
import WidgetFrame, { WidgetMode } from './WidgetFrame';
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

interface CalendarWidgetProps {
  mode: WidgetMode;
  onModeChange: (mode: WidgetMode) => void;
}

export default function CalendarWidget({ mode, onModeChange }: CalendarWidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { registerRefreshFunction } = useCalendarRefresh();

  // Fetch calendar events
  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);

      const params = new URLSearchParams({
        timeMin: weekStart.toISOString(),
        timeMax: weekEnd.toISOString(),
        maxResults: '50'
      });

      const response = await fetch(`/api/calendar/events?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.events) {
        const parsedEvents: CalendarEvent[] = data.events.map((event: any) => ({
          id: event.id,
          title: event.summary || 'Untitled Event',
          start: new Date(event.start?.dateTime || event.start?.date),
          end: new Date(event.end?.dateTime || event.end?.date),
          allDay: !event.start?.dateTime,
          description: event.description,
          location: event.location,
          attendees: event.attendees?.map((a: any) => a.email) || [],
          originalEvent: event
        }));
        
        setEvents(parsedEvents);
      } else {
        throw new Error(data.error || 'Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setError(error instanceof Error ? error.message : 'Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    registerRefreshFunction(fetchEvents);
  }, [registerRefreshFunction, fetchEvents]);

  // Get upcoming events for peek mode
  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter(event => event.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 3);
  };

  // Get events for today
  const getTodayEvents = () => {
    const today = new Date();
    return events.filter(event => isSameDay(event.start, today));
  };

  // Calculate meeting hours for density meter
  const getMeetingHours = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    
    const weekEvents = events.filter(event => 
      event.start >= weekStart && event.start <= weekEnd && !event.allDay
    );

    const totalMinutes = weekEvents.reduce((sum, event) => {
      return sum + (event.end.getTime() - event.start.getTime()) / (1000 * 60);
    }, 0);

    return Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal
  };

  // Peek Content - shows next 3 events and free/busy bar
  const renderPeekContent = () => {
    const upcomingEvents = getUpcomingEvents();
    const todayEvents = getTodayEvents();

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">
            {todayEvents.length} today
          </span>
          <Clock className="w-4 h-4 text-gray-400" />
        </div>

        <div className="space-y-2">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{event.title}</p>
                  <p className="text-xs text-gray-500">
                    {format(event.start, 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No upcoming events</p>
          )}
        </div>

        {/* Free/busy bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>This week</span>
            <span>{getMeetingHours()}h meetings</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${Math.min(getMeetingHours() / 40 * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Expanded Content - shows week view with events
  const renderExpandedContent = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="p-3">
        {/* Week navigation */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            {format(weekStart, 'MMM d')} - {format(endOfWeek(currentDate), 'MMM d')}
          </h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={fetchEvents}
              className="p-1 text-gray-400 hover:text-gray-600 ml-2"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="text-center">
              <div className={`text-xs font-medium p-1 rounded ${
                isToday(day) ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
              }`}>
                {format(day, 'EEE')}
              </div>
              <div className={`text-sm font-semibold ${
                isToday(day) ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Events for each day */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {weekDays.map((day) => {
            const dayEvents = events.filter(event => isSameDay(event.start, day));
            
            if (dayEvents.length === 0) return null;

            return (
              <div key={day.toISOString()}>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  {format(day, 'EEE, MMM d')}
                </div>
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-2 bg-blue-50 border border-blue-200 rounded text-xs"
                  >
                    <div className="font-medium text-blue-900">{event.title}</div>
                    <div className="text-blue-600 mt-1">
                      {event.allDay ? 'All day' : `${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')}`}
                    </div>
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center text-blue-600 mt-1">
                        <Users className="w-3 h-3 mr-1" />
                        <span>{event.attendees.length} attendees</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Density meter */}
        <div className="mt-4 p-2 bg-gray-50 rounded">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Meeting density</span>
            <span>{getMeetingHours()}h this week</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                getMeetingHours() > 30 ? 'bg-red-500' :
                getMeetingHours() > 20 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(getMeetingHours() / 40 * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Focused Content - smart scheduling and event editor
  const renderFocusedContent = () => {
    return (
      <div className="h-full p-6">
        <h2 className="text-xl font-semibold mb-4">Smart Calendar</h2>
        <p className="text-gray-600 mb-6">
          Advanced calendar management features would go here...
        </p>
        
        <div className="space-y-4">
          <button className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
            <h3 className="font-medium text-blue-900">Smart Scheduling</h3>
            <p className="text-sm text-blue-600 mt-1">
              Find optimal meeting times based on attendee availability
            </p>
          </button>
          
          <button className="w-full p-3 bg-green-50 border border-green-200 rounded-lg text-left">
            <h3 className="font-medium text-green-900">Add Focus Block</h3>
            <p className="text-sm text-green-600 mt-1">
              Block time for deep work and important tasks
            </p>
          </button>
          
          <button className="w-full p-3 bg-purple-50 border border-purple-200 rounded-lg text-left">
            <h3 className="font-medium text-purple-900">Meeting Analytics</h3>
            <p className="text-sm text-purple-600 mt-1">
              Analyze time spent in meetings and get optimization suggestions
            </p>
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <WidgetFrame
        title="Calendar"
        mode={mode}
        onModeChange={onModeChange}
        icon={<CalendarDays className="w-4 h-4" />}
      >
        <div className="flex items-center justify-center p-4">
          <Loader className="w-4 h-4 animate-spin" />
          <span className="ml-2 text-sm text-gray-600">Loading events...</span>
        </div>
      </WidgetFrame>
    );
  }

  if (error) {
    return (
      <WidgetFrame
        title="Calendar"
        mode={mode}
        onModeChange={onModeChange}
        icon={<AlertCircle className="w-4 h-4 text-red-500" />}
      >
        <div className="flex items-center justify-center p-4">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="ml-2 text-sm text-red-600">{error}</span>
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame
      title="Calendar"
      mode={mode}
      onModeChange={onModeChange}
      icon={<CalendarDays className="w-4 h-4" />}
      peekContent={renderPeekContent()}
      expandedContent={renderExpandedContent()}
      focusedContent={renderFocusedContent()}
    />
  );
}