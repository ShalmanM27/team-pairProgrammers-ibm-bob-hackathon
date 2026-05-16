import { useState, useRef, useEffect } from 'react';

export default function AIChatbot({ isOpen, onClose, context }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m your Api-Architect assistant. I can help you generate endpoints, refactor code, and answer questions about your backend architecture.',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5001/mcp/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: context || {},
          conversation_history: messages.slice(-6), // Last 6 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      
      // Add assistant message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          code_snippets: data.code_snippets || [],
          actions: data.actions || [],
        },
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Error: ${error.message}. Make sure the MCP server is running on port 5001.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="flex h-[600px] w-[700px] flex-col rounded-lg bg-[#1a1d2b] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3a3a4a] p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Api-Architect Assistant</h2>
              <p className="text-xs text-slate-400">Powered by IBM Granite LLM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-[#2a2d3b] hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-[#0f62fe] text-white'
                    : 'bg-[#2a2d3b] text-slate-100'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                
                {/* Code Snippets */}
                {msg.code_snippets?.map((snippet, i) => (
                  <div key={i} className="mt-2 rounded bg-[#161616] p-2">
                    <div className="mb-1 text-xs text-slate-400">{snippet.language}</div>
                    <pre className="overflow-x-auto text-xs">
                      <code>{snippet.code}</code>
                    </pre>
                  </div>
                ))}

                {/* Action Buttons */}
                {msg.actions?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.actions.map((action, i) => (
                      <button
                        key={i}
                        className="rounded bg-[#0f62fe] px-3 py-1 text-xs text-white hover:bg-[#0353e9]"
                        title={action.description}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-[#2a2d3b] p-3">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0.2s' }}></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#3a3a4a] p-4">
          <div className="flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your API architecture..."
              className="flex-1 resize-none rounded-lg border border-[#3a3a4a] bg-[#2a2d3b] p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-[#0f62fe] focus:outline-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="rounded-lg bg-[#0f62fe] px-6 text-sm font-medium text-white hover:bg-[#0353e9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
