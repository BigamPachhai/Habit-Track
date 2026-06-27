import { useState, useEffect } from 'react';
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
  color: string;
  autoLoad?: boolean;
}

const ACTIONS: CoachAction[] = [
  {
    id: 'daily',
    icon: <Flame size={18} />,
    label: 'Daily motivation',
    description: 'Your personalized push for today',
    color: 'from-orange-50 to-orange-100/50 dark:from-orange-600/20 dark:to-orange-800/10 border-orange-200 dark:border-orange-500/20',
    autoLoad: true,
  },
  {
    id: 'twenties',
    icon: <Zap size={18} />,
    label: 'Your 20s: 5 strict fixes',
    description: 'Blunt, no-fluff improvements for your daily life',
    color: 'from-rose-50 to-rose-100/50 dark:from-rose-600/20 dark:to-rose-800/10 border-rose-200 dark:border-rose-500/20',
    autoLoad: true,
  },
  {
    id: 'risk',
    icon: <AlertTriangle size={18} />,
    label: 'Streak risk analysis',
    description: 'Find out which habits might break your streak',
    color: 'from-yellow-50 to-yellow-100/50 dark:from-yellow-600/20 dark:to-yellow-800/10 border-yellow-200 dark:border-yellow-500/20',
  },
  {
    id: 'weekly',
    icon: <Calendar size={18} />,
    label: 'Weekly summary',
    description: 'Wins, gaps, and one tip for next week',
    color: 'from-brand-50 to-brand-100/50 dark:from-brand-600/20 dark:to-brand-800/10 border-brand-200 dark:border-brand-500/20',
  },
  {
    id: 'monthly',
    icon: <BarChart2 size={18} />,
    label: 'Monthly review',
    description: 'Deep analysis with goals for next month',
    color: 'from-purple-50 to-purple-100/50 dark:from-purple-600/20 dark:to-purple-800/10 border-purple-200 dark:border-purple-500/20',
  },
];

function MessageDisplay({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mt-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={12} className="text-brand-500 dark:text-brand-400" />
        <span className="text-brand-500 dark:text-brand-400 text-xs font-medium">AI Coach</span>
      </div>
      <div className="text-slate-700 dark:text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{message}</div>
    </motion.div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1 mt-3 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/30"
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
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 px-4 py-12 md:py-8">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-slate-900 dark:text-white font-bold text-2xl flex items-center gap-2">
            <Sparkles size={22} className="text-brand-500 dark:text-brand-400" />
            AI Coach
          </h1>
          <p className="text-slate-400 dark:text-white/40 text-sm mt-1">Powered by Mistral AI. Analyzes your actual habit data.</p>
        </motion.div>

        <div className="space-y-3">
          {ACTIONS.map((action, i) => {
            const isLoading = loading.has(action.id);
            const result = results[action.id];
            const error = errors[action.id];
            const isAuto = action.autoLoad;

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
              >
                {isAuto ? (
                  <div className={cn(
                    'w-full text-left bg-gradient-to-br border rounded-2xl p-4',
                    action.color
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="text-slate-600 dark:text-white/70">{action.icon}</div>
                      <div>
                        <div className="text-slate-800 dark:text-white font-medium text-sm">{action.label}</div>
                        <div className="text-slate-400 dark:text-white/40 text-xs mt-0.5">{action.description}</div>
                      </div>
                      {isLoading && (
                        <div className="ml-auto w-4 h-4 border-2 border-slate-300 dark:border-white/30 border-t-slate-600 dark:border-t-white/80 rounded-full animate-spin flex-shrink-0" />
                      )}
                    </div>
                    {isLoading && <LoadingDots />}
                    {result && <MessageDisplay message={result} />}
                    {error && (
                      <p className="text-red-500 text-xs mt-2">{error}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => !result && runAction(action.id)}
                      disabled={isLoading}
                      className={cn(
                        'w-full text-left bg-gradient-to-br border rounded-2xl p-4 transition-all duration-200',
                        action.color,
                        isLoading || result
                          ? 'opacity-100 cursor-default'
                          : 'hover:brightness-95 dark:hover:brightness-125 active:scale-[0.98]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-slate-600 dark:text-white/70">{action.icon}</div>
                          <div>
                            <div className="text-slate-800 dark:text-white font-medium text-sm">{action.label}</div>
                            <div className="text-slate-400 dark:text-white/40 text-xs mt-0.5">{action.description}</div>
                          </div>
                        </div>
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 border-t-slate-600 dark:border-t-white/80 rounded-full animate-spin flex-shrink-0" />
                        ) : !result ? (
                          <ChevronRight size={16} className="text-slate-300 dark:text-white/30 flex-shrink-0" />
                        ) : null}
                      </div>
                    </button>
                    <AnimatePresence>
                      {error && <p className="text-red-500 text-xs mt-2 px-1">{error}</p>}
                      {result && <MessageDisplay message={result} />}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
