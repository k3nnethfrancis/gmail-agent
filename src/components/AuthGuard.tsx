'use client';

import { useState, useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check URL params for auth status
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      setIsAuthenticated(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('error')) {
      setIsAuthenticated(false);
    } else {
      // Check if we have authentication by trying to access a protected endpoint
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/test/calendar');
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google/login';
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Calendar Assistant + Inbox Concierge
            </h1>
            <p className="text-gray-600 mb-6">
              Connect your Google account to get started with AI-powered calendar and email management.
            </p>
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Connect Google Account
            </button>
            <p className="mt-4 text-xs text-gray-500">
              We'll access your calendar and email to provide personalized assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}