import AuthGuard from '@/components/AuthGuard';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Calendar Assistant + Inbox Concierge
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
            {/* Chat Interface - Takes up 2/3 on large screens */}
            <div className="lg:col-span-2">
              <ChatInterface className="h-full" />
            </div>
            
            {/* Side Panel for Calendar/Email widgets */}
            <div className="space-y-6">
              {/* Calendar Widget Placeholder */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Upcoming Events
                </h2>
                <p className="text-gray-600 text-sm">
                  Ask me "What meetings do I have today?" to see your calendar.
                </p>
              </div>
              
              {/* Email Buckets Placeholder */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Email Categories
                </h2>
                <p className="text-gray-600 text-sm">
                  Ask me "Classify my recent emails" to organize your inbox.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}