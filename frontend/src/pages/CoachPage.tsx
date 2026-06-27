import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, AlertTriangle, Calendar, BarChart2, Flame, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

type ActionType = 'daily' | 'weekly' | 'monthly' | 'risk' | 'twenties';

interface CoachAction {
  id: ActionType;
  icon: React.ReactNode;
  label: string;
  description: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  iconColor: string;
  autoLoad?: boolean;
}

const ACTIONS: CoachAction[] = [
  {
    id: 'daily',
    icon: <Flame size={17} />,
    label: 'Daily motivation',
    description: 'Your personalized push for today',
    bgLight: 'bg-orange-50',
    bgDark: 'dark:bg-orange-500/[0.07]',
    borderLight: 'border-orange-200',
    borderDark: 'dark:border-orange-500/20',
    iconColor: 'text-orange-500 dark:text-orange-400',
    autoLoad: true,
  },
  {
    id: 'twenties',
    icon: <Zap size={17} />,
    label: 'Your 20s: 5 strict fixes',
    description: 'Blunt, no-fluff improvements for your daily life',
    bgLight: 'bg-rose-50',
    bgDark: 'dark:bg-rose-500/[0.07]',
    borderLight: 'border-rose-200',
    borderDark: 'dark:border-rose-500/20',
    iconColor: 'text-rose-500 dark:text-rose-400',
    autoLoad: true,
  },
  {
    id: 'risk',
    icon: <AlertTriangle size={17} />,
    label: 'Streak risk analysis',
    description: 'Find out which habits might break your streak',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-500/[0.07]',
    borderLight: 'border-amber-200',
    borderDark: 'dark:border-amber-500/20',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  {
    id: 'weekly',
    icon: <Calendar size={17} />,
    label: 'Weekly summary',
    description: 'Wins, gaps, and one tip for next week',
    bgLight: 'bg-brand-50',
    bgDark: 'dark:bg-brand-500/[0.07]',
    borderLight: 'border-brand-200',
    borderDark: 'dark:border-brand-500/20',
    iconColor: 'text-brand-500 dark:text-brand-400',
  },
  {
    id: 'monthly',
    icon: <BarChart2 size={17} />,
    label: 'Monthly review',
    description: 'Deep analysis with goals for next month',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-500/[0.07]',
    borderLight: 'border-purple-200',
    borderDark: 'dark:border-purple-500/20',
    iconColor: 'text-purple-500 dark:text-purple-400',
  },
];

function renderMarkdown(text: string): React.ReactNode[] {
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
    return <p key={i} className={i > 0 ? 'mt-2' : ''}>{parts}</p>;
  });
}

function MessageDisplay({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 bg-white/80 dark:bg-white/[0.04] border border-warm-200 dark:border-white/[0.07] rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={11} className="text-brand-500 dark:text-brand-400" />
        <span className="text-brand-500 dark:text-brand-400 text-xs font-medium">AI Coach</span>
      </div>
      <div className="text-stone-700 dark:text-[#c9d1d9] text-sm leading-relaxed">{renderMarkdown(message)}</div>
    </motion.div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1 mt-3 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-[#484f58]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

export default function CoachPage() {
  const { stats } = useApp();
  const [loading, setLoading] = useState<Set<ActionType>>(new Set());
  const [results, setResults] = useState<Partial<Record<ActionType, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<ActionType, string>>>({});

  const runAction = async (type: ActionType) => {
    setLoading((prev) => new Set(prev).add(type));
    setErrors((prev) => { const n = { ...prev }; delete n[type]; return n; });
    try {
      let res: { message: string };
      if (type === 'daily') {
        res = await api.ai.dailyMotivation(stats?.currentStreak ?? 0, stats?.longestStreak ?? 0);
      } else if (type === 'weekly') {
        res = await api.ai.weeklySummary();
      } else if (type === 'monthly') {
        res = await api.ai.monthlyReview();
      } else if (type === 'twenties') {
        res = await api.ai.twentiesSuggestions();
      } else {
        res = await api.ai.streakRisk();
      }
      setResults((prev) => ({ ...prev, [type]: res.message }));
    } catch (err: unknown) {
      setErrors((prev) => ({ ...prev, [type]: err instanceof Error ? err.message : 'AI request failed' }));
    } finally {
      setLoading((prev) => { const n = new Set(prev); n.delete(type); return n; });
    }
  };

  useEffect(() => {
    ACTIONS.filter((a) => a.autoLoad).forEach((a) => runAction(a.id));
  }, []);

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-[#0d1117] px-4 py-12 md:py-8">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-stone-900 dark:text-[#e6edf3] font-bold text-2xl flex items-center gap-2">
            <Sparkles size={22} className="text-brand-500 dark:text-brand-400" />
            AI Coach
          </h1>
          <p className="text-stone-400 dark:text-[#8b949e] text-sm mt-1">Powered by Mistral AI. Analyzes your actual habit data.</p>
        </motion.div>

        <div className="space-y-3">
          {ACTIONS.map((action, i) => {
            const isLoading = loading.has(action.id);
            const result = results[action.id];
            const error = errors[action.id];

            const cardClass = cn(
              'w-full text-left border rounded-2xl p-4 transition-all duration-200',
              action.bgLight, action.bgDark, action.borderLight, action.borderDark,
            );

            const content = (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex-shrink-0', action.iconColor)}>{action.icon}</div>
                    <div>
                      <div className="text-stone-800 dark:text-[#e6edf3] font-medium text-sm">{action.label}</div>
                      <div className="text-stone-400 dark:text-[#8b949e] text-xs mt-0.5">{action.description}</div>
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-stone-300 dark:border-[#484f58] border-t-stone-600 dark:border-t-[#8b949e] rounded-full animate-spin flex-shrink-0 ml-3" />
                  ) : !result && !action.autoLoad ? (
                    <ChevronRight size={16} className="text-stone-300 dark:text-[#484f58] flex-shrink-0 ml-3" />
                  ) : null}
                </div>
                {isLoading && <LoadingDots />}
                {result && <MessageDisplay message={result} />}
                {error && <p className="text-red-500 dark:text-red-400 text-xs mt-2">{error}</p>}
              </>
            );

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
              >
                <AnimatePresence>
                  {action.autoLoad ? (
                    <div className={cardClass}>{content}</div>
                  ) : (
                    <button
                      onClick={() => !result && runAction(action.id)}
                      disabled={isLoading || !!result}
                      className={cn(cardClass, !result && !isLoading && 'hover:brightness-[0.97] dark:hover:brightness-110 active:scale-[0.99]')}
                    >
                      {content}
                    </button>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
