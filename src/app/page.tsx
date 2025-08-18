'use client';

import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import ChatInterface from '@/components/ChatInterface';
import Shell from '@/components/Shell';
import LeftRail from '@/components/LeftRail';
import RightDock from '@/components/RightDock';
import MobileNav from '@/components/MobileNav';
import InboxView from '@/components/InboxView';
import CalendarView from '@/components/CalendarView';
import { CalendarRefreshProvider } from '@/contexts/CalendarRefreshContext';

type View = 'chat' | 'inbox' | 'calendar';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('chat');

  const renderContent = () => {
    switch (activeView) {
      case 'inbox':
        return <InboxView />;
      case 'calendar':
        return <CalendarView />;
      default:
        return <ChatInterface className="h-full" />;
    }
  };


  return (
    <AuthGuard>
      <CalendarRefreshProvider>
        <div className="h-screen flex flex-col">
          {/* Desktop Layout */}
          <div className="hidden md:flex flex-1">
            <Shell
              leftRail={<LeftRail activeView={activeView} onViewChange={setActiveView} />}
              rightDock={<RightDock onViewChange={setActiveView} />}
            >
              {/* Central Content Surface */}
              {renderContent()}
            </Shell>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden flex flex-col h-full">
            {/* Mobile Content */}
            <div className="flex-1 bg-gray-50">
              {renderContent()}
            </div>

            {/* Mobile Bottom Navigation */}
            <MobileNav 
              activeView={activeView}
              onViewChange={setActiveView}
            />
          </div>
        </div>
      </CalendarRefreshProvider>
    </AuthGuard>
  );
}