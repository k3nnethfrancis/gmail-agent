'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCalendarRefresh } from '@/contexts/CalendarRefreshContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  className?: string;
}

export default function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: `${Date.now()}-welcome`,
      role: 'assistant',
      content: 'Hi! I can help you manage your calendar and emails. Try asking me "What meetings do I have today?" or "Classify my recent emails".',
      timestamp: new Date(),
    },
  ]);
  const abortRef = useRef<AbortController | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get calendar refresh function
  const { refreshCalendar } = useCalendarRefresh();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Claude Code style - start conversation, Claude will respond first

    try {
      // Abort any previous stream
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversation: messages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: ac.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to start streaming');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      // Buffered SSE parsing
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const raw = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 2);
            if (!raw.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(raw.slice(6));
              switch (data.type) {
                case 'claude_response': {
                  const claudeMessage: Message = {
                    id: crypto.randomUUID?.() ?? String(Date.now()),
                    role: 'assistant',
                    content: data.data,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, claudeMessage]);
                  break;
                }
                case 'tool_call': {
                  const toolCallMessage: Message = {
                    id: crypto.randomUUID?.() ?? String(Date.now()),
                    role: 'assistant',
                    content: `⏺ ${data.data.display}`,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, toolCallMessage]);
                  break;
                }
                case 'tool_result': {
                  const resultIcon = data.data.success ? '⎿' : '❌';
                  const toolResultMessage: Message = {
                    id: crypto.randomUUID?.() ?? String(Date.now()),
                    role: 'assistant',
                    content: `  ${resultIcon} ${data.data.summary}`,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, toolResultMessage]);
                  
                  // Check if this was a calendar operation that succeeded
                  if (data.data.success && data.data.tool) {
                    const calendarTools = [
                      'create_event', 
                      'update_event', 
                      'delete_event', 
                      'create_time_block'
                    ];
                    if (calendarTools.includes(data.data.tool)) {
                      // Trigger immediate calendar refresh
                      console.warn(`🔄 Calendar operation ${data.data.tool} completed, refreshing calendar...`);
                      setTimeout(() => refreshCalendar(), 500); // Small delay to ensure operation completed
                    }
                  }
                  break;
                }
                case 'error': {
                  const errorMessage: Message = {
                    id: crypto.randomUUID?.() ?? String(Date.now()),
                    role: 'assistant',
                    content: `❌ Error: ${data.data}`,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, errorMessage]);
                  break;
                }
                case 'done':
                  break;
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
        abortRef.current = null;
      }

    } catch (error: any) {
      console.error('Streaming chat error:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please make sure you're authenticated with Google.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full max-h-full bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Calendar & Email Assistant
        </h2>
        <p className="text-sm text-gray-600">
          Ask me about your calendar or emails
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-full">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="text-sm prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children }) => (
                        <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-gray-200 p-2 rounded text-xs font-mono overflow-x-auto">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
              <p
                className={`text-xs mt-1 ${
                  message.role === 'user'
                    ? 'text-blue-100'
                    : 'text-gray-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Loader className="w-4 h-4 animate-spin" />
                <p className="text-sm">Thinking...</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your calendar or emails..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          <p>Try: "What meetings do I have today?" or "Classify my emails"</p>
        </div>
      </div>
    </div>
  );
}