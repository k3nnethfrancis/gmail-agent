'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCalendarRefresh } from '@/contexts/CalendarRefreshContext';
import { useChatStore, type Message } from '@/store/chatStore';

interface ChatInterfaceProps {
  className?: string;
}

export default function ChatInterface({ className = '' }: ChatInterfaceProps) {
  // Use Zustand store for persistent state
  const { messages, input, isLoading, setMessages, addMessage, setInput, setIsLoading, clearChat } = useChatStore();
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Message consolidation state
  const consolidationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingConsolidationRef = useRef<Map<string, {count: number, firstMessage: Message}>>(new Map());
  
  // Get calendar refresh function
  const { refreshCalendar } = useCalendarRefresh();

  const refreshChat = () => {
    clearChat();
    // Cancel any ongoing request
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Cleanup consolidation timer on unmount
  useEffect(() => {
    return () => {
      if (consolidationTimerRef.current) {
        clearTimeout(consolidationTimerRef.current);
      }
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
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
                  addMessage(claudeMessage);
                  break;
                }
                case 'tool_call': {
                  const toolCallMessage: Message = {
                    id: crypto.randomUUID?.() ?? String(Date.now()),
                    role: 'assistant',
                    content: `⏺ ${data.data.display}`,
                    timestamp: new Date(),
                  };
                  addMessage(toolCallMessage);
                  break;
                }
                case 'tool_result': {
                  // Special handling for deletion safety guidance - consolidate multiple instances
                  const isGuidance = data.data.summary?.includes('📋 Need to check calendar first');
                  
                  if (isGuidance) {
                    // Consolidate guidance messages
                    const guidanceKey = 'calendar_guidance';
                    const pending = pendingConsolidationRef.current;
                    
                    if (pending.has(guidanceKey)) {
                      // Increment count for existing guidance
                      const existing = pending.get(guidanceKey)!;
                      existing.count++;
                    } else {
                      // First guidance message
                      const guidanceMessage: Message = {
                        id: crypto.randomUUID?.() ?? String(Date.now()),
                        role: 'assistant',
                        content: `  📋 Need to check calendar first...`,
                        timestamp: new Date(),
                      };
                      
                      pending.set(guidanceKey, {count: 1, firstMessage: guidanceMessage});
                      addMessage(guidanceMessage);
                      
                      // Set timer to finalize consolidation
                      if (consolidationTimerRef.current) {
                        clearTimeout(consolidationTimerRef.current);
                      }
                      
                      consolidationTimerRef.current = setTimeout(() => {
                        const final = pending.get(guidanceKey);
                        if (final && final.count > 1) {
                          // Update the message to show count
                          const updatedMessages = messages.map(msg => 
                            msg.id === final.firstMessage.id 
                              ? {...msg, content: `  📋 Need to check calendar first (${final.count} attempts)`}
                              : msg
                          );
                          setMessages(updatedMessages);
                        }
                        pending.clear();
                        consolidationTimerRef.current = null;
                      }, 1000); // 1 second consolidation window
                    }
                  } else {
                    // Regular tool result handling
                    const resultIcon = data.data.success ? '⎿' : '❌';
                    const toolResultMessage: Message = {
                      id: crypto.randomUUID?.() ?? String(Date.now()),
                      role: 'assistant',
                      content: `  ${resultIcon} ${data.data.summary}`,
                      timestamp: new Date(),
                    };
                    addMessage(toolResultMessage);
                  }
                  
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
                  addMessage(errorMessage);
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

      addMessage(errorMessage);
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
    <div className={`relative bg-white overflow-hidden h-full flex flex-col ${className}`}>
      {/* Floating Refresh Button */}
      <button
        onClick={refreshChat}
        className="absolute top-4 left-4 z-10 bg-white border border-gray-300 p-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        title="Refresh Chat"
      >
        <RotateCcw className="w-4 h-4 text-gray-600" />
      </button>

      {/* Messages Area - Flexible height using flexbox */}
      <div className="flex-1 overflow-y-auto p-4 pt-16 space-y-4" style={{ paddingBottom: '120px' }}>
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
                {new Date(message.timestamp).toLocaleTimeString([], {
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

      {/* Fixed Input Area at Bottom */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-300 rounded-xl shadow-sm p-4">
          <div className="flex space-x-3">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your calendar or emails..."
              className="flex-1 resize-none border-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none min-h-[40px] max-h-32 py-2"
              rows={1}
              disabled={isLoading}
              style={{ resize: 'none', overflow: 'hidden' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 self-end"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
            {messages.length === 0 && (
              <div className="mt-2 text-xs text-gray-500">
                <p>Try: "What meetings do I have today?" or "Classify my emails"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}