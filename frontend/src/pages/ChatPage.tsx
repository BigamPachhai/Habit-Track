import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Sparkles, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STARTERS = [
  'How am I doing overall?',
  'Which habit needs the most work?',
  "What's my biggest streak risk?",
  'Give me a harsh honest review',
  "What should I focus on this week?",
];

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      const firstBold = boldMatch?.index ?? Infinity;
      const firstItalic = italicMatch?.index ?? Infinity;
      if (boldMatch && firstBold <= firstItalic) {
        if (firstBold > 0) parts.push(remaining.slice(0, firstBold));
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(firstBold + boldMatch[0].length);
      } else if (italicMatch && firstItalic < firstBold) {
        if (firstItalic > 0) parts.push(remaining.slice(0, firstItalic));
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(firstItalic + italicMatch[0].length);
      } else {
        parts.push(remaining);
        break;
      }
    }
    return <p key={i} className={i > 0 ? 'mt-1.5' : ''}>{parts}</p>;
  });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const { message } = await api.ai.chat(nextMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: message }]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: err instanceof Error ? err.message : 'Something went wrong. Try again.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const reset = () => {
    setMessages([]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-warm-50 dark:bg-[#0d1117]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 md:py-5 border-b border-warm-200 dark:border-white/[0.07] bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 dark:bg-brand-400/10 flex items-center justify-center">
              <MessageCircle size={16} className="text-brand-500 dark:text-brand-400" />
            </div>
            <div>
              <h1 className="text-stone-900 dark:text-[#e6edf3] font-semibold text-sm leading-none">Habit Chat</h1>
              <p className="text-stone-400 dark:text-[#8b949e] text-xs mt-0.5">Knows your full data</p>
            </div>
          </div>
          {!isEmpty && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-[#8b949e] hover:text-stone-600 dark:hover:text-[#c9d1d9] transition-colors px-2 py-1.5 rounded-lg hover:bg-warm-100 dark:hover:bg-white/[0.05]"
            >
              <RotateCcw size={13} />
              New chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <AnimatePresence initial={false}>
            {isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center pt-16 pb-8 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 dark:bg-brand-400/10 flex items-center justify-center mb-4">
                  <Sparkles size={24} className="text-brand-500 dark:text-brand-400" />
                </div>
                <h2 className="text-stone-800 dark:text-[#e6edf3] font-semibold text-lg mb-1">Ask me anything</h2>
                <p className="text-stone-400 dark:text-[#8b949e] text-sm max-w-xs">
                  I have access to all your habits, streaks, completion rates, and notes.
                </p>
                <div className="mt-6 flex flex-col gap-2 w-full max-w-sm">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-sm text-stone-600 dark:text-[#c9d1d9] px-4 py-2.5 rounded-xl border border-warm-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.03] hover:bg-warm-100 dark:hover:bg-white/[0.07] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-brand-500/10 dark:bg-brand-400/10 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                      <Sparkles size={12} className="text-brand-500 dark:text-brand-400" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-brand-500 text-white rounded-br-sm'
                        : 'bg-white dark:bg-white/[0.05] border border-warm-200 dark:border-white/[0.07] text-stone-700 dark:text-[#c9d1d9] rounded-bl-sm'
                    )}
                  >
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="w-6 h-6 rounded-lg bg-brand-500/10 dark:bg-brand-400/10 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                <Sparkles size={12} className="text-brand-500 dark:text-brand-400" />
              </div>
              <div className="bg-white dark:bg-white/[0.05] border border-warm-200 dark:border-white/[0.07] rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-[#484f58]"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-warm-200 dark:border-white/[0.07] bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your habits..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-warm-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.05] text-stone-900 dark:text-[#e6edf3] placeholder-stone-400 dark:placeholder-[#8b949e] text-sm px-4 py-3 focus:outline-none focus:border-brand-400 dark:focus:border-brand-500/50 transition-colors max-h-32 overflow-y-auto"
            style={{ minHeight: '46px' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-150',
              input.trim() && !loading
                ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/30 active:scale-95'
                : 'bg-warm-200 dark:bg-white/[0.07] text-stone-300 dark:text-[#484f58] cursor-not-allowed'
            )}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-stone-300 dark:text-[#484f58] text-[10px] mt-2 max-w-2xl mx-auto">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
