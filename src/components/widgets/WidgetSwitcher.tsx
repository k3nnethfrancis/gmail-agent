'use client';

import { useState } from 'react';
import { Mail, CalendarDays, Zap } from 'lucide-react';

type WidgetType = 'inbox' | 'calendar' | 'queue';

interface WidgetSwitcherProps {
  activeWidget: WidgetType;
  onWidgetChange: (widget: WidgetType) => void;
  queueCount?: number;
}

export default function WidgetSwitcher({ activeWidget, onWidgetChange, queueCount = 0 }: WidgetSwitcherProps) {
  return (
    <div className="p-3">
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onWidgetChange('inbox')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeWidget === 'inbox'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Inbox</span>
        </button>
        
        <button
          onClick={() => onWidgetChange('calendar')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeWidget === 'calendar'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Calendar</span>
        </button>

        <button
          onClick={() => onWidgetChange('queue')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
            activeWidget === 'queue'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Queue</span>
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {queueCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}