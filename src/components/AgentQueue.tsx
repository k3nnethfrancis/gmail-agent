'use client';

import { useState } from 'react';
import { CheckCircle, X, Eye, Mail, Calendar, FileText, Zap } from 'lucide-react';

interface AgentArtifact {
  id: string;
  type: 'email_draft' | 'calendar_proposal' | 'summary' | 'bulk_action';
  title: string;
  preview?: string;
  status: 'pending' | 'approved' | 'dismissed';
  createdAt: Date;
}

interface AgentQueueProps {
  className?: string;
}

export default function AgentQueue({ className = '' }: AgentQueueProps) {
  // Test artifacts to demonstrate the Agent Queue functionality
  const [artifacts, setArtifacts] = useState<AgentArtifact[]>([
    {
      id: '1',
      type: 'email_draft',
      title: 'Draft: Follow-up with Sarah',
      preview: 'Hi Sarah, Thank you for the productive meeting yesterday...',
      status: 'pending',
      createdAt: new Date()
    },
    {
      id: '2',
      type: 'calendar_proposal',
      title: 'Schedule: Team retrospective',
      preview: 'Friday 2:00 PM - 3:00 PM (3 attendees)',
      status: 'pending',
      createdAt: new Date()
    },
    {
      id: '3',
      type: 'summary',
      title: 'Weekly email summary',
      preview: 'Processed 47 emails: 12 important, 8 newsletters, 27 archived',
      status: 'pending',
      createdAt: new Date()
    }
  ]);

  const handleApprove = (id: string) => {
    setArtifacts(artifacts.map(artifact => 
      artifact.id === id ? { ...artifact, status: 'approved' as const } : artifact
    ));
  };

  const handleDismiss = (id: string) => {
    setArtifacts(artifacts.filter(artifact => artifact.id !== id));
  };

  const getArtifactIcon = (type: AgentArtifact['type']) => {
    switch (type) {
      case 'email_draft':
        return <Mail className="w-4 h-4" />;
      case 'calendar_proposal':
        return <Calendar className="w-4 h-4" />;
      case 'summary':
        return <FileText className="w-4 h-4" />;
      case 'bulk_action':
        return <Zap className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const pendingArtifacts = artifacts.filter(artifact => artifact.status === 'pending');

  if (pendingArtifacts.length === 0) {
    return null; // Don't render if no pending artifacts
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <Zap className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">
          {pendingArtifacts.length} pending
        </span>
      </div>

      <div className="flex items-center space-x-2 flex-1 overflow-x-auto">
        {pendingArtifacts.map((artifact) => (
          <div
            key={artifact.id}
            className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-0 flex-shrink-0"
          >
            <div className="flex items-center space-x-2 min-w-0">
              {getArtifactIcon(artifact.type)}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {artifact.title}
                </p>
                {artifact.preview && (
                  <p className="text-xs text-gray-500 truncate">
                    {artifact.preview}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={() => handleApprove(artifact.id)}
                className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                title="Approve"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDismiss(artifact.id)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {pendingArtifacts.length > 1 && (
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700">
            Approve All
          </button>
          <button className="px-3 py-1 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300">
            Dismiss All
          </button>
        </div>
      )}
    </div>
  );
}