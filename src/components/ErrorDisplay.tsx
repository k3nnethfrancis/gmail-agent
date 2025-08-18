/**
 * Enhanced Error Display Component
 * 
 * Shows actionable error messages with retry mechanisms and user guidance.
 * Addresses error handling gaps identified in the handoff document.
 */

import React from 'react';
import { AlertCircle, X, RefreshCw, AlertTriangle, Wifi, Lock } from 'lucide-react';
import { ErrorDetails } from '../hooks/useErrorHandler';

interface ErrorDisplayProps {
  error: ErrorDetails;
  onClear: () => void;
  onRetry?: () => void;
  className?: string;
}

const getErrorIcon = (type: ErrorDetails['type']) => {
  switch (type) {
    case 'network':
      return <Wifi className="w-5 h-5" />;
    case 'auth':
      return <Lock className="w-5 h-5" />;
    case 'validation':
      return <AlertTriangle className="w-5 h-5" />;
    case 'classification':
      return <AlertCircle className="w-5 h-5" />;
    default:
      return <AlertCircle className="w-5 h-5" />;
  }
};

const getErrorStyles = (type: ErrorDetails['type']) => {
  switch (type) {
    case 'network':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        icon: 'text-orange-500'
      };
    case 'auth':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        icon: 'text-red-500'
      };
    case 'validation':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        icon: 'text-yellow-500'
      };
    case 'classification':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        icon: 'text-blue-500'
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        icon: 'text-gray-500'
      };
  }
};

export default function ErrorDisplay({ 
  error, 
  onClear, 
  onRetry, 
  className = "mx-4 mt-4" 
}: ErrorDisplayProps) {
  const styles = getErrorStyles(error.type);
  const icon = getErrorIcon(error.type);

  return (
    <div className={className}>
      <div className={`${styles.bg} ${styles.border} border rounded-lg p-4`}>
        <div className="flex items-start">
          <div className={`${styles.icon} mr-3 mt-0.5`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`${styles.text} font-medium mb-1`}>
              {error.type === 'network' && 'Connection Problem'}
              {error.type === 'auth' && 'Authentication Required'}
              {error.type === 'validation' && 'Input Error'}
              {error.type === 'classification' && 'Classification Error'}
              {error.type === 'unknown' && 'Error'}
            </h4>
            <p className={`${styles.text} text-sm mb-3`}>
              {error.message}
            </p>
            
            {error.userAction && (
              <p className={`${styles.text} text-sm font-medium mb-3`}>
                💡 {error.userAction}
              </p>
            )}

            <div className="flex items-center space-x-3">
              {error.retryable && onRetry && (
                <button
                  onClick={onRetry}
                  className={`
                    flex items-center px-3 py-1.5 text-sm font-medium rounded-md
                    ${error.type === 'network' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                      error.type === 'auth' ? 'bg-red-600 hover:bg-red-700 text-white' :
                      error.type === 'validation' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                      error.type === 'classification' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                      'bg-gray-600 hover:bg-gray-700 text-white'
                    }
                    transition-colors
                  `}
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Try Again
                </button>
              )}
              
              {error.type === 'auth' && (
                <button
                  onClick={() => window.location.href = '/api/auth/google'}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                >
                  <Lock className="w-4 h-4 mr-1.5" />
                  Sign In
                </button>
              )}

              <button
                onClick={onClear}
                className={`${styles.text} hover:${styles.text.replace('700', '800')} text-sm underline`}
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={onClear}
            className={`${styles.icon} hover:${styles.icon.replace('500', '700')} p-1 rounded transition-colors`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}