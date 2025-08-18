'use client';

import { useState } from 'react';
import EmailWidget from './widgets/EmailWidget';
import CalendarWidget from './widgets/CalendarWidget';

interface RightDockProps {
  className?: string;
  onViewChange?: (view: string) => void;
}

export default function RightDock({ className = '', onViewChange }: RightDockProps) {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Widget Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Widgets</h2>
      </div>

      {/* Widgets Stack */}
      <div className="flex-1 p-3 space-y-4 overflow-y-auto">
        {/* Email Widget - Shows unread count by category */}
        <EmailWidget onViewChange={onViewChange} />
        
        {/* Calendar Widget - Shows week/day view */}
        <CalendarWidget mode="peek" onModeChange={() => {}} />
      </div>
    </div>
  );
}