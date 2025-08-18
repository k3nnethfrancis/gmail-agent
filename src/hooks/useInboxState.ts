/**
 * Unified Inbox State Management Hook
 * 
 * Implements a state machine to prevent conflicting UI states and race conditions.
 * Addresses the state management conflicts identified in the handoff document.
 */

import { useState, useCallback } from 'react';

export type InboxState = 'loading' | 'classifying' | 'editing' | 'selecting' | 'idle';

export interface UseInboxStateReturn {
  // Current state
  currentState: InboxState;
  
  // State checkers
  isLoading: boolean;
  isClassifying: boolean;
  isEditing: boolean;
  isSelecting: boolean;
  isIdle: boolean;
  
  // State transitions
  setLoading: () => void;
  setClassifying: () => void;
  setEditing: () => void;
  setSelecting: () => void;
  setIdle: () => void;
  
  // Combined operations
  canStartClassification: boolean;
  canEditEmail: boolean;
  canSelectEmails: boolean;
}

export function useInboxState(): UseInboxStateReturn {
  const [currentState, setCurrentState] = useState<InboxState>('loading');

  // State checkers
  const isLoading = currentState === 'loading';
  const isClassifying = currentState === 'classifying';
  const isEditing = currentState === 'editing';
  const isSelecting = currentState === 'selecting';
  const isIdle = currentState === 'idle';

  // State transitions
  const setLoading = useCallback(() => setCurrentState('loading'), []);
  const setClassifying = useCallback(() => setCurrentState('classifying'), []);
  const setEditing = useCallback(() => setCurrentState('editing'), []);
  const setSelecting = useCallback(() => setCurrentState('selecting'), []);
  const setIdle = useCallback(() => setCurrentState('idle'), []);

  // Permission checks for operations
  const canStartClassification = isIdle || isSelecting;
  const canEditEmail = isIdle;
  const canSelectEmails = isIdle || isSelecting;

  return {
    // Current state
    currentState,
    
    // State checkers
    isLoading,
    isClassifying,
    isEditing,
    isSelecting,
    isIdle,
    
    // State transitions
    setLoading,
    setClassifying,
    setEditing,
    setSelecting,
    setIdle,
    
    // Combined operations
    canStartClassification,
    canEditEmail,
    canSelectEmails,
  };
}