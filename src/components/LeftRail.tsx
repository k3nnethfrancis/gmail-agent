'use client';

import { MessageSquare, Mail, Calendar, Settings, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LeftRailProps {
  className?: string;
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function LeftRail({ className = '', activeView, onViewChange }: LeftRailProps) {
  const router = useRouter();

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* App Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Courier</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered calendar and inbox management</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-3">
        <nav className="space-y-1">
          <NavItem 
            icon={<MessageSquare className="w-4 h-4" />}
            label="Chat"
            active={activeView === 'chat'}
            onClick={() => onViewChange('chat')}
          />
          <NavItem 
            icon={<Mail className="w-4 h-4" />}
            label="Inbox"
            active={activeView === 'inbox'}
            onClick={() => onViewChange('inbox')}
          />
          <NavItem 
            icon={<Calendar className="w-4 h-4" />}
            label="Calendar"
            active={activeView === 'calendar'}
            onClick={() => onViewChange('calendar')}
          />
        </nav>

      </div>

      {/* System Status + Account */}
      <div className="p-3 border-t border-border space-y-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">System Status</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Uptime</span><span className="font-mono">99.9%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Active Tasks</span><span className="text-accent font-mono">3</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Unread</span><span className="text-destructive font-mono">3</span></div>
          </div>
        </div>
        <div className="flex items-center space-x-2 pt-2 border-t border-border">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-medium">K</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Kenneth Francis</p>
            <p className="text-xs text-muted-foreground">k3nnethfrancis@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, active = false, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

