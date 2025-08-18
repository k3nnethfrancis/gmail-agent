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
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">
          Agent Workspace
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Calendar + Inbox Concierge
        </p>
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

      {/* Account Switcher */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">K</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              Kenneth Francis
            </p>
            <p className="text-xs text-gray-500">
              k3nnethfrancis@gmail.com
            </p>
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
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

