'use client';

import { useState, useEffect } from 'react';
import { Star, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface TrainingExample {
  emailId: string;
  subject: string;
  fromAddress: string;
  snippet: string;
  tags: Array<{ id: number; name: string; color: string }>;
}

interface TrainingExamplesResponse {
  success: boolean;
  trainingExamples: TrainingExample[];
  count: number;
  error?: string;
}

export default function TrainingExamplesWidget() {
  const [trainingExamples, setTrainingExamples] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchTrainingExamples = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/training-examples');
      const data: TrainingExamplesResponse = await response.json();
      
      if (data.success) {
        setTrainingExamples(data.trainingExamples);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch training examples');
      }
    } catch (err) {
      setError('Network error fetching training examples');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainingExamples();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 text-center">
        <p className="text-destructive text-sm mb-2">{error}</p>
        <button 
          onClick={fetchTrainingExamples}
          className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (trainingExamples.length === 0) {
    return (
      <div className="text-center py-6">
        <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm mb-1">No training examples yet</p>
        <p className="text-xs text-muted-foreground">
          Click ⭐ on categorized emails to create training data
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {trainingExamples.length} Training Examples
        </span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground"
          title={showDetails ? 'Hide details' : 'Show details'}
        >
          {showDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      </div>

      {/* Compact scrollable list */}
      <div className="max-h-48 overflow-y-auto space-y-2">
        {trainingExamples.map((example) => (
          <div key={example.emailId} className="border border-border rounded p-2 bg-background">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground text-sm truncate">
                  {example.subject}
                </h4>
                {showDetails && (
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    From: {example.fromAddress}
                  </p>
                )}
              </div>
              <Star className="w-3 h-3 text-yellow-500 ml-2 flex-shrink-0" />
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {example.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: `${tag.color}20`,
                    color: tag.color 
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {example.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{example.tags.length - 2} more
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}