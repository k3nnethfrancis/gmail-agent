'use client';

import EmailWidget from './widgets/EmailWidget';
import CalendarWidget from './widgets/CalendarWidget';

interface RightDockProps {
  className?: string;
  activeView?: string;
  onViewChange?: (view: string) => void;
}

export default function RightDock({ className = '', activeView, onViewChange }: RightDockProps) {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Widgets Stack */}
      <div className="flex-1 p-3 space-y-4 overflow-y-auto">
        {/* Chat view shows previews; other views show quick actions via EmailWidget */}
        <EmailWidget activeView={activeView} onViewChange={onViewChange} />
        <CalendarWidget mode="peek" onModeChange={() => {}} />
      </div>
    </div>
  );
}