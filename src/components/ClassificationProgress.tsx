/**
 * Simple Classification Progress Component
 * 
 * Shows real-time progress of email classification by polling the database.
 * Minimal and unobtrusive - appears only when classification is active.
 */

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface ClassificationStatus {
  totalEmails: number;
  classifiedEmails: number;
  unclassifiedEmails: number;
  isRunning: boolean;
}

interface ClassificationProgressProps {
  onComplete?: () => void;
}

export default function ClassificationProgress({ onComplete }: ClassificationProgressProps) {
  const [status, setStatus] = useState<ClassificationStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const onCompleteRef = useRef(onComplete);
  
  // TEMPORARY: Disable all polling to debug infinite loop
  console.warn('🚫 ClassificationProgress: Component mounted - POLLING DISABLED FOR DEBUGGING');
  return null; // Temporarily disable this component
  
  // Keep ref updated with latest callback
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let hasCompletedOnce = false;

    const checkStatus = async () => {
      try {
        const response = await fetch('/api/classify/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);

          // Show progress if classification is needed
          const shouldShow = data.unclassifiedEmails > 0 && data.totalEmails > 0;
          setIsVisible(shouldShow);

          // Call onComplete when finished and stop polling
          if (data.unclassifiedEmails === 0 && data.classifiedEmails > 0 && !hasCompletedOnce) {
            hasCompletedOnce = true;
            onCompleteRef.current?.();
            
            // Stop polling since classification is complete
            if (interval) {
              clearInterval(interval);
              interval = undefined;
              console.warn('🛑 ClassificationProgress: Stopped polling - classification complete');
            }
            return; // Exit early
          }
          
          // Stop polling if no classification is needed
          if (data.unclassifiedEmails === 0 && interval) {
            clearInterval(interval);
            interval = undefined;
            console.warn('🛑 ClassificationProgress: Stopped polling - no work needed');
            return; // Exit early
          }
        }
      } catch (error) {
        console.error('Error checking classification status:', error);
      }
    };

    // Check immediately to see if polling is even necessary
    checkStatus().then(() => {
      // Only start interval polling if component is still visible and work is needed
      if (interval === undefined) {
        // Don't start polling if initial check showed no work needed
        return;
      }
      
      // Only start polling if there might be classification work to do
      interval = setInterval(checkStatus, 3000); // Reduced frequency: every 3 seconds
      console.warn('▶️ ClassificationProgress: Started polling every 3 seconds');
    });

    return () => {
      if (interval) {
        clearInterval(interval);
        console.warn('🛑 ClassificationProgress: Cleanup - stopped polling');
      }
    };
  }, []); // Remove onComplete dependency to prevent constant recreation

  if (!isVisible || !status) {
    return null;
  }

  const progress = status.totalEmails > 0 
    ? (status.classifiedEmails / status.totalEmails) * 100 
    : 0;

  return (
    <div className="mx-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-blue-800">
            Classifying emails...
          </span>
        </div>
        <div className="text-sm text-blue-600">
          {status.classifiedEmails} / {status.totalEmails}
        </div>
      </div>
      
      <div className="mt-2">
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-blue-600 mt-1">
          <span>{Math.round(progress)}% complete</span>
          <span>{status.unclassifiedEmails} remaining</span>
        </div>
      </div>
    </div>
  );
}