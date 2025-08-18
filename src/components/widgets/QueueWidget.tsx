'use client';

import { useState } from 'react';
import { Zap, CheckCircle, X, Eye, Mail, Calendar, FileText } from 'lucide-react';
import WidgetFrame, { WidgetMode } from './WidgetFrame';

interface AgentArtifact {
  id: string;
  type: 'email_draft' | 'calendar_proposal' | 'summary' | 'bulk_action';
  title: string;
  preview?: string;
  status: 'pending' | 'approved' | 'dismissed';
  createdAt: Date;
}

interface QueueWidgetProps {
  mode: WidgetMode;
  onModeChange: (mode: WidgetMode) => void;
}

export default function QueueWidget({ mode, onModeChange }: QueueWidgetProps) {
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

  const handleApproveAll = () => {
    setArtifacts(artifacts.map(artifact => 
      artifact.status === 'pending' ? { ...artifact, status: 'approved' as const } : artifact
    ));
  };

  const handleDismissAll = () => {
    setArtifacts(artifacts.filter(artifact => artifact.status !== 'pending'));
  };

  const getArtifactIcon = (type: AgentArtifact['type']) => {
    switch (type) {
      case 'email_draft':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'calendar_proposal':
        return <Calendar className="w-4 h-4 text-green-600" />;
      case 'summary':
        return <FileText className="w-4 h-4 text-purple-600" />;
      case 'bulk_action':
        return <Zap className="w-4 h-4 text-yellow-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const pendingArtifacts = artifacts.filter(artifact => artifact.status === 'pending');

  // Peek Content - shows pending count and latest artifacts
  const renderPeekContent = () => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">
            {pendingArtifacts.length} pending
          </span>
          <Zap className="w-4 h-4 text-yellow-500" />
        </div>
        
        {pendingArtifacts.length > 0 ? (
          <div className="space-y-2">
            {pendingArtifacts.slice(0, 2).map((artifact) => (
              <div key={artifact.id} className="flex items-start space-x-2">
                {getArtifactIcon(artifact.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{artifact.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {artifact.preview}
                  </p>
                </div>
              </div>
            ))}
            {pendingArtifacts.length > 2 && (
              <p className="text-xs text-gray-400">
                +{pendingArtifacts.length - 2} more artifacts
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No pending artifacts</p>
        )}
      </div>
    );
  };

  // Expanded Content - shows all artifacts with actions
  const renderExpandedContent = () => {
    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Agent Artifacts</h3>
          {pendingArtifacts.length > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleApproveAll}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Approve All
              </button>
              <button
                onClick={handleDismissAll}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Dismiss All
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className={`p-3 border rounded-lg ${
                artifact.status === 'approved' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                {getArtifactIcon(artifact.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {artifact.title}
                  </p>
                  {artifact.preview && (
                    <p className="text-xs text-gray-500 mt-1">
                      {artifact.preview}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {artifact.status === 'approved' ? 'Approved' : 'Pending approval'}
                  </p>
                </div>
                
                {artifact.status === 'pending' && (
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
                )}
              </div>
            </div>
          ))}
        </div>

        {artifacts.length === 0 && (
          <div className="text-center py-8">
            <Zap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No artifacts yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Agent-generated content will appear here
            </p>
          </div>
        )}
      </div>
    );
  };

  // Focused Content - detailed artifact management
  const renderFocusedContent = () => {
    return (
      <div className="h-full p-6">
        <h2 className="text-xl font-semibold mb-4">Agent Queue</h2>
        <p className="text-gray-600 mb-6">
          Manage AI-generated artifacts and approve actions.
        </p>
        
        <div className="space-y-4">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className={`p-4 border rounded-lg ${
                artifact.status === 'approved' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getArtifactIcon(artifact.type)}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{artifact.title}</h3>
                    {artifact.preview && (
                      <p className="text-sm text-gray-600 mt-2">{artifact.preview}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Created {artifact.createdAt.toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {artifact.status === 'pending' && (
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(artifact.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDismiss(artifact.id)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {artifact.status === 'approved' && (
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approved
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <WidgetFrame
      title="Queue"
      mode={mode}
      onModeChange={onModeChange}
      icon={<Zap className="w-4 h-4" />}
      peekContent={renderPeekContent()}
      expandedContent={renderExpandedContent()}
      focusedContent={renderFocusedContent()}
    />
  );
}