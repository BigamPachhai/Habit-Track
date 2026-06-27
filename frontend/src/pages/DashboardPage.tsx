import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Calendar, TrendingUp, CheckCircle, Zap, Target, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { getMotivationalMessage, isMilestone, MILESTONE_DAYS } from '../lib/utils';
import { cn } from '../lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  delay?: number;
}

function StatCard({ icon, label, value, sub, accent, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn(
        'rounded-2xl p-4 border',
        accent
          ? 'bg-brand-50 dark:bg-brand-600/15 border-brand-200 dark:border-brand-500/30'
          : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 shadow-sm'
      )}
    >
      <div className={cn('mb-3', accent ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-white/40')}>
        {icon}
      </div>
      <div className={cn('text-2xl font-bold', accent ? 'text-brand-600 dark:text-brand-300' : 'text-slate-800 dark:text-white')}>
        {value}
      </div>
      <div className="text-slate-400 dark:text-white/50 text-xs mt-0.5">{label}</div>
      {sub && <div className="text-slate-300 dark:text-white/30 text-xs mt-1">{sub}</div>}
    </motion.div>
  );
}

function MilestoneProgress({ current, next }: { current: number; next: number }) {
  const milestones = MILESTONE_DAYS;
  const prev = milestones.filter((m) => m <= current).pop() || 0;
  const progress = next > prev ? ((current - prev) / (next - prev)) * 100 : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-500 dark:text-white/60 text-sm font-medium">
          <Target size={16} />
          Next milestone
        </div>
        <span className="text-brand-500 dark:text-brand-400 font-bold text-sm">{next} days</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
        />
      </div>
      <div className="flex justify-between text-slate-400 dark:text-white/30 text-xs mt-2">
        <span>{prev} days</span>
        <span>{current} / {next}</span>
        <span>{next} days</span>
      </div>
    </motion.div>
  );
}

const MILESTONE_LABELS: Record<number, string> = {
  7: '1 Week',
  30: '1 Month',
  50: '50 Days',
  100: '100 Days',
  365: '1 Year',
  500: '500 Days',
  1000: '1000 Days',
};

export default function DashboardPage() {
  const { stats, refreshStats } = useApp();
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneDay, setMilestoneDay] = useState(0);
  const celebratedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    refreshStats();
  }, []);

  useEffect(() => {
    if (!stats) return;
    const streak = stats.currentStreak;
    if (isMilestone(streak) && !celebratedRef.current.has(streak)) {
      celebratedRef.current.add(streak);
      setMilestoneDay(streak);
      setShowMilestone(true);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff'],
      });
      setTimeout(() => setShowMilestone(false), 4000);
    }
  }, [stats?.currentStreak]);

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { currentStreak, longestStreak, perfectDaysThisMonth, completionPercentage, totalCompletedDays, totalHabitsCompleted, nextMilestoneDays, nextMilestone } = stats;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 px-4 py-12 md:py-8">
      <div className="max-w-lg mx-auto">
        {/* Milestone celebration */}
        <AnimatePresence>
          {showMilestone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-brand-600 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-brand-600/40 flex items-center gap-3"
            >
              <Award size={20} />
              <span className="font-semibold">🎉 {MILESTONE_LABELS[milestoneDay] || `${milestoneDay} days`} achieved!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-slate-900 dark:text-white font-bold text-2xl">Dashboard</h1>
          <p className="text-slate-400 dark:text-white/40 text-sm mt-1">
            {getMotivationalMessage(currentStreak, longestStreak)}
          </p>
        </motion.div>

        {/* Main streak card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-brand-50 to-brand-100/50 dark:from-brand-600/20 dark:to-brand-800/10 border border-brand-200 dark:border-brand-500/20 rounded-3xl p-6 mb-4 text-center"
        >
          <div className="text-5xl mb-2">🔥</div>
          <div className="text-6xl font-black text-slate-900 dark:text-white mb-1">{currentStreak}</div>
          <div className="text-brand-600 dark:text-brand-300 font-medium">day streak</div>
          {currentStreak > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 bg-brand-100 dark:bg-brand-600/20 px-3 py-1.5 rounded-full">
              <span className="text-brand-600 dark:text-brand-400 text-sm">
                {nextMilestoneDays} day{nextMilestoneDays !== 1 ? 's' : ''} until {nextMilestone}-day milestone
              </span>
            </div>
          )}
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard icon={<Trophy size={18} />} label="Longest streak" value={`${longestStreak}d`} delay={0.15} />
          <StatCard icon={<Calendar size={18} />} label="Perfect this month" value={perfectDaysThisMonth} delay={0.2} />
          <StatCard icon={<TrendingUp size={18} />} label="Completion rate" value={`${completionPercentage}%`} accent delay={0.25} />
          <StatCard icon={<Zap size={18} />} label="Habits completed" value={totalHabitsCompleted} delay={0.3} />
          <StatCard icon={<CheckCircle size={18} />} label="Perfect days total" value={totalCompletedDays} delay={0.35} />
          <StatCard icon={<Flame size={18} />} label="Best streak" value={`${longestStreak}d`} delay={0.4} />
        </div>

        {/* Milestone progress */}
        <MilestoneProgress current={currentStreak} next={nextMilestone} />

        {/* Milestone timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm"
        >
          <h3 className="text-slate-500 dark:text-white/60 text-sm font-medium mb-3">Milestones</h3>
          <div className="flex flex-wrap gap-2">
            {MILESTONE_DAYS.map((m) => (
              <div
                key={m}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  currentStreak >= m
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 border border-slate-200 dark:border-white/10'
                )}
              >
                {currentStreak >= m ? '✓ ' : ''}{MILESTONE_LABELS[m]}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
