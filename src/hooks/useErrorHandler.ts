/**
 * Enhanced Error Handling Hook
 * 
 * Provides comprehensive error handling with retry mechanisms and user feedback.
 * Addresses error handling gaps identified in the handoff document.
 */

import { useState, useCallback } from 'react';

export interface ErrorDetails {
  message: string;
  type: 'network' | 'auth' | 'validation' | 'classification' | 'unknown';
  retryable: boolean;
  actionable: boolean;
  userAction?: string;
}

export interface UseErrorHandlerReturn {
  error: ErrorDetails | null;
  clearError: () => void;
  handleError: (error: unknown, context?: string) => void;
  handleAsyncOperation: <T>(
    operation: () => Promise<T>,
    options?: {
      context?: string;
      retryAttempts?: number;
      retryDelay?: number;
    }
  ) => Promise<T | null>;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorDetails | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const categorizeError = useCallback((error: unknown, context?: string): ErrorDetails => {
    console.error('Error in context:', context, error);

    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: 'Network connection failed. Please check your internet connection.',
        type: 'network',
        retryable: true,
        actionable: true,
        userAction: 'Check your connection and try again'
      };
    }

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('401')) {
      return {
        message: 'Authentication required. Please sign in again.',
        type: 'auth',
        retryable: false,
        actionable: true,
        userAction: 'Sign in to continue'
      };
    }

    // Handle classification errors
    if (context?.includes('classif')) {
      return {
        message: 'Email classification failed. Some emails may not be categorized.',
        type: 'classification',
        retryable: true,
        actionable: true,
        userAction: 'Try running classification again or categorize emails manually'
      };
    }

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return {
        message: error.message,
        type: 'validation',
        retryable: false,
        actionable: true,
        userAction: 'Please check your input and try again'
      };
    }

    // Handle generic errors
    if (error instanceof Error) {
      return {
        message: error.message || 'An unexpected error occurred',
        type: 'unknown',
        retryable: true,
        actionable: false
      };
    }

    // Handle unknown error types
    return {
      message: 'An unexpected error occurred',
      type: 'unknown',
      retryable: true,
      actionable: false
    };
  }, []);

  const handleError = useCallback((error: unknown, context?: string) => {
    const errorDetails = categorizeError(error, context);
    setError(errorDetails);
  }, [categorizeError]);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      context?: string;
      retryAttempts?: number;
      retryDelay?: number;
    } = {}
  ): Promise<T | null> => {
    const {
      context = 'operation',
      retryAttempts = 2,
      retryDelay = 1000
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const result = await operation();
        // Clear any previous errors on success
        clearError();
        return result;
      } catch (err) {
        lastError = err;
        
        // Don't retry on the last attempt or for non-retryable errors
        if (attempt === retryAttempts) {
          break;
        }

        const errorDetails = categorizeError(err, context);
        if (!errorDetails.retryable) {
          break;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }

    // Handle the final error
    handleError(lastError, context);
    return null;
  }, [clearError, categorizeError, handleError]);

  return {
    error,
    clearError,
    handleError,
    handleAsyncOperation,
  };
}