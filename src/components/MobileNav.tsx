'use client';

import { useState } from 'react';
import { MessageSquare, Mail, CalendarDays, Menu, X, Zap } from 'lucide-react';

interface MobileNavProps {
  onViewChange: (view: 'chat' | 'inbox' | 'calendar') => void;
  activeView: 'chat' | 'inbox' | 'calendar';
}

export default function MobileNav({ onViewChange, activeView }: MobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">
          Agent Workspace
        </h1>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-gray-600 hover:text-gray-900"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
          <div className="bg-white w-64 h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
            </div>
            
            <div className="p-3">
              <nav className="space-y-1">
                <NavItem 
                  icon={<MessageSquare className="w-4 h-4" />}
                  label="Chat"
                  active={activeView === 'chat'}
                  onClick={() => {
                    onViewChange('chat');
                    setIsMenuOpen(false);
                  }}
                />
                <NavItem 
                  icon={<Mail className="w-4 h-4" />}
                  label="Inbox"
                  active={activeView === 'inbox'}
                  onClick={() => {
                    onViewChange('inbox');
                    setIsMenuOpen(false);
                  }}
                />
                <NavItem 
                  icon={<CalendarDays className="w-4 h-4" />}
                  label="Calendar"
                  active={activeView === 'calendar'}
                  onClick={() => {
                    onViewChange('calendar');
                    setIsMenuOpen(false);
                  }}
                />
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar for Mobile */}
      <div className="md:hidden bg-white border-t border-gray-200">
        <div className="grid grid-cols-3">
          <TabItem
            icon={<MessageSquare className="w-5 h-5" />}
            label="Chat"
            active={activeView === 'chat'}
            onClick={() => onViewChange('chat')}
          />
          <TabItem
            icon={<Mail className="w-5 h-5" />}
            label="Inbox"
            active={activeView === 'inbox'}
            onClick={() => onViewChange('inbox')}
          />
          <TabItem
            icon={<CalendarDays className="w-5 h-5" />}
            label="Calendar"
            active={activeView === 'calendar'}
            onClick={() => onViewChange('calendar')}
          />
        </div>
      </div>
    </>
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

interface TabItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function TabItem({ icon, label, active = false, onClick }: TabItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center py-2 px-1 text-xs font-medium transition-colors ${
        active
          ? 'text-blue-600'
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {icon}
      <span className="mt-1">{label}</span>
    </button>
  );
}