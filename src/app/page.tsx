'use client';

import { useEffect, useState } from 'react';
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
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  // Render only one layout tree (desktop OR mobile) to avoid double-mounting
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(query.matches);
    update();
    try {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    } catch {
      // Safari fallback
      query.addListener(update);
      return () => query.removeListener(update);
    }
  }, []);

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
        {isDesktop ? (
          <div className="h-screen flex flex-col">
            <div className="flex-1">
              <Shell
                leftRail={<LeftRail activeView={activeView} onViewChange={setActiveView} />}
                rightDock={<RightDock activeView={activeView} onViewChange={setActiveView} />}
              >
                {renderContent()}
              </Shell>
            </div>
          </div>
        ) : (
          <div className="h-screen flex flex-col">
            <div className="flex-1 bg-gray-50">
              {renderContent()}
            </div>
            <MobileNav 
              activeView={activeView}
              onViewChange={setActiveView}
            />
          </div>
        )}
      </CalendarRefreshProvider>
    </AuthGuard>
  );
}