'use client';

import { ReactNode } from 'react';

interface ShellProps {
  children: ReactNode;
  leftRail: ReactNode;
  rightDock: ReactNode;
}

export default function Shell({ children, leftRail, rightDock }: ShellProps) {
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Main workspace grid - responsive layout */}
      <div className="flex-1 flex lg:grid lg:grid-cols-12 gap-0">
        {/* Left Rail - hidden on mobile, visible on tablet+ */}
        <div className="hidden md:flex md:w-64 lg:col-span-2 bg-white border-r border-gray-200 flex-col">
          {leftRail}
        </div>
        
        {/* Central Chat Surface - full width on mobile/tablet, constrained on desktop */}
        <div className="flex-1 lg:col-span-7 flex flex-col bg-white">
          {children}
        </div>
        
        {/* Right Dock - hidden on mobile/tablet, visible on desktop */}
        <div className="hidden xl:flex xl:col-span-3 bg-gray-50 border-l border-gray-200 flex-col">
          {rightDock}
        </div>
      </div>
    </div>
  );
}