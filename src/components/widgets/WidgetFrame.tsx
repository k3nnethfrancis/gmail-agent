'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp, Maximize2, X, Minimize2 } from 'lucide-react';

export type WidgetMode = 'peek' | 'expanded' | 'focused';

interface WidgetFrameProps {
  title: string;
  mode: WidgetMode;
  onModeChange: (mode: WidgetMode) => void;
  children: ReactNode;
  peekContent?: ReactNode;
  expandedContent?: ReactNode;
  focusedContent?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export default function WidgetFrame({
  title,
  mode,
  onModeChange,
  children,
  peekContent,
  expandedContent,
  focusedContent,
  icon,
  className = ''
}: WidgetFrameProps) {
  const handlePeekClick = () => {
    if (mode === 'peek') {
      onModeChange('expanded');
    }
  };

  const handleExpandClick = () => {
    onModeChange('focused');
  };

  const handleCloseClick = () => {
    onModeChange('peek');
  };

  // Focused mode - full screen modal
  if (mode === 'focused') {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col border border-border">
          {/* Focused Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-2">
              {icon}
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onModeChange('expanded')}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
                title="Minimize to expanded"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleCloseClick}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Focused Content */}
          <div className="flex-1 overflow-hidden">
            {focusedContent || children}
          </div>
        </div>
      </div>
    );
  }

  // Peek and Expanded modes - docked widget
  return (
    <div className={`bg-card rounded-lg border border-border ${className}`}>
      {/* Widget Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div 
          className="flex items-center space-x-2 cursor-pointer flex-1"
          onClick={handlePeekClick}
        >
          {icon}
          <h3 className="font-medium text-foreground">{title}</h3>
        </div>
        
        <div className="flex items-center space-x-1">
          {mode === 'expanded' && (
            <button
              onClick={handleExpandClick}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
              title="Open in focused mode"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={handlePeekClick}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
            title={mode === 'peek' ? 'Expand' : 'Collapse'}
          >
            {mode === 'peek' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* Widget Content */}
      <div className={`${mode === 'peek' ? 'p-3' : 'p-0'}`}>
        {mode === 'peek' && (peekContent || children)}
        {mode === 'expanded' && (
          <div className="max-h-96 overflow-y-auto">
            {expandedContent || children}
          </div>
        )}
      </div>
    </div>
  );
}