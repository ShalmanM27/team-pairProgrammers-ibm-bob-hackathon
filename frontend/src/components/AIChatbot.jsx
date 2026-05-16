import { useEffect, useRef, useState } from 'react';
import { requestChatCompletion } from '../lib/apiClient';

export default function AIChatbot({ isOpen, onClose, context, selectedModelId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi. Ask me any question about the workspace and I will help with API architecture, refactoring, and endpoint design.',
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
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const data = await requestChatCompletion({
        message: userMessage,
        context: context || {},
        conversation_history: messages.slice(-6),
        model_id: selectedModelId || undefined,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          code_snippets: data.code_snippets || [],
          actions: data.actions || [],
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error.message}. Make sure the unified backend is running on port 5000.`,
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
        <div className="flex items-center justify-between border-b border-[#3a3a4a] p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">AI</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Api-Architect Assistant</h2>
              <p className="text-xs text-slate-400">Ask any question about the workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-[#2a2d3b] hover:text-slate-200"
          >
            x
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user' ? 'bg-[#0f62fe] text-white' : 'bg-[#2a2d3b] text-slate-100'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{msg.content}</div>

                {msg.code_snippets?.map((snippet, i) => (
                  <div key={i} className="mt-2 rounded bg-[#161616] p-2">
                    <div className="mb-1 text-xs text-slate-400">{snippet.language}</div>
                    <pre className="overflow-x-auto text-xs">
                      <code>{snippet.code}</code>
                    </pre>
                  </div>
                ))}

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
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-[#3a3a4a] p-4">
          <div className="flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask any question about the workspace..."
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
          <div className="mt-2 text-xs text-slate-500">Press Enter to send, Shift+Enter for new line</div>
        </div>
      </div>
    </div>
  );
}
