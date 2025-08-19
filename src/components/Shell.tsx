'use client';

import { ReactNode } from 'react';

interface ShellProps {
  children: ReactNode;
  leftRail: ReactNode;
  rightDock: ReactNode;
}

export default function Shell({ children, leftRail, rightDock }: ShellProps) {
  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Main workspace grid - responsive layout */}
      <div className="flex-1 min-h-0 flex lg:grid lg:grid-cols-12 gap-0">
        {/* Left Rail - hidden on mobile, visible on tablet+ */}
        <div className="hidden md:flex md:w-56 lg:col-span-2 bg-card border-r border-border flex-col">
          {leftRail}
        </div>
        
        {/* Central Surface - full width on mobile/tablet, constrained on desktop */}
        <div className="flex-1 min-h-0 lg:col-span-7 flex flex-col bg-card">
          {children}
        </div>
        
        {/* Right Dock - hidden on mobile/tablet, visible on desktop */}
        <div className="hidden xl:flex xl:col-span-3 bg-background border-l border-border flex-col">
          {rightDock}
        </div>
      </div>
    </div>
  );
}