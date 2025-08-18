'use client';

import { useState, useCallback } from 'react';

export type WidgetMode = 'peek' | 'expanded' | 'focused';

export function useWidgetMode(initialMode: WidgetMode = 'peek') {
  const [mode, setMode] = useState<WidgetMode>(initialMode);

  const setToPeek = useCallback(() => setMode('peek'), []);
  const setToExpanded = useCallback(() => setMode('expanded'), []);
  const setToFocused = useCallback(() => setMode('focused'), []);

  return {
    mode,
    setMode,
    setToPeek,
    setToExpanded,
    setToFocused,
    isPeek: mode === 'peek',
    isExpanded: mode === 'expanded',
    isFocused: mode === 'focused'
  };
}