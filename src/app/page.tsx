'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [authStatus, setAuthStatus] = useState<'unknown' | 'authenticated' | 'unauthenticated'>('unknown');
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    // Check URL params for auth status
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      setAuthStatus('authenticated');
    } else if (urlParams.get('error')) {
      setAuthStatus('unauthenticated');
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google/login';
  };

  const testCalendar = async () => {
    try {
      const response = await fetch('/api/test/calendar');
      const result = await response.json();
      setTestResults(prev => [...prev, { type: 'Calendar', ...result }]);
    } catch (error) {
      setTestResults(prev => [...prev, { type: 'Calendar', error: 'Failed to test' }]);
    }
  };

  const testGmail = async () => {
    try {
      const response = await fetch('/api/test/gmail');
      const result = await response.json();
      setTestResults(prev => [...prev, { type: 'Gmail', ...result }]);
    } catch (error) {
      setTestResults(prev => [...prev, { type: 'Gmail', error: 'Failed to test' }]);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Calendar Assistant + Inbox Concierge
        </h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          
          {authStatus === 'unknown' && (
            <div className="text-gray-600">
              <p className="mb-4">Connect your Google account to get started</p>
              <button
                onClick={handleGoogleLogin}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Connect Google Account
              </button>
            </div>
          )}
          
          {authStatus === 'authenticated' && (
            <div className="text-green-600">
              <p className="mb-4">✅ Successfully authenticated with Google</p>
              <div className="space-x-4">
                <button
                  onClick={testCalendar}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Test Calendar API
                </button>
                <button
                  onClick={testGmail}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Test Gmail API
                </button>
              </div>
            </div>
          )}
          
          {authStatus === 'unauthenticated' && (
            <div className="text-red-600">
              <p className="mb-4">❌ Authentication failed</p>
              <button
                onClick={handleGoogleLogin}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {testResults.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold">{result.type} API Test</h3>
                  <pre className="text-sm text-gray-600 bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-gray-500">
          <p>Foundation testing - Google APIs without AI integration</p>
        </div>
      </div>
    </div>
  );
}