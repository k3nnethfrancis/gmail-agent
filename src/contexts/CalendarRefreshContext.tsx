'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CalendarRefreshContextType {
  refreshCalendar: () => void;
  registerRefreshFunction: (refreshFn: () => void) => void;
}

const CalendarRefreshContext = createContext<CalendarRefreshContextType | undefined>(undefined);

export function CalendarRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshFunction, setRefreshFunction] = useState<(() => void) | null>(null);

  const registerRefreshFunction = useCallback((refreshFn: () => void) => {
    setRefreshFunction(() => refreshFn);
  }, []);

  const refreshCalendar = useCallback(() => {
    if (refreshFunction) {
      console.warn('🔄 Triggering immediate calendar refresh from chat operation');
      refreshFunction();
    }
  }, [refreshFunction]);

  return (
    <CalendarRefreshContext.Provider value={{ refreshCalendar, registerRefreshFunction }}>
      {children}
    </CalendarRefreshContext.Provider>
  );
}

export function useCalendarRefresh() {
  const context = useContext(CalendarRefreshContext);
  if (context === undefined) {
    throw new Error('useCalendarRefresh must be used within a CalendarRefreshProvider');
  }
  return context;
}