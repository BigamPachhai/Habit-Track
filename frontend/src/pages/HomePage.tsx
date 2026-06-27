import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus, GripVertical, Pencil, Trash2, Check, Flame,
  Trophy, TrendingUp, Zap, CheckCircle2, Award, Sun, Moon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { cn, today, isMilestone, getMotivationalMessage } from '../lib/utils';
import type { Habit, HabitLog } from '../types';

const ICONS = [
  '⭐','💪','📚','🧘','🏃','🍎','💧','🎯','✍️','🛌',
  '🧠','🎨','🎵','🌿','🏋️','🚴','🧹','💊','🙏','💻',
];

const RULE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

function getCachedTip(): { emoji: string; rule: string } | null {
  try {
    const stored = localStorage.getItem('twenties_rule');
    if (stored) {
      const { emoji, rule, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp < RULE_TTL_MS && emoji && rule) return { emoji, rule };
    }
  } catch {}
  localStorage.removeItem('twenties_rule');
  return null;
}

function cacheTip(tip: { emoji: string; rule: string }) {
  localStorage.setItem('twenties_rule', JSON.stringify({ ...tip, timestamp: Date.now() }));
}

function computeStreak(logs: HabitLog[], habitId: string): number {
  const completed = new Set(
    logs.filter((l) => l.habitId === habitId && l.completed).map((l) => l.date)
  );
  let streak = 0;
  const d = new Date();
  if (!completed.has(today())) d.setDate(d.getDate() - 1);
  while (true) {
    const ds = d.toISOString().split('T')[0];
    if (completed.has(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

interface HabitFormProps {
  initial?: Partial<Habit>;
  onSave: (data: { name: string; icon: string; dailyTarget: number }) => void;
  onCancel: () => void;
}

function HabitForm({ initial, onSave, onCancel }: HabitFormProps) {
  const [name, setName] = useState(initial?.name || '');
  const [icon, setIcon] = useState(initial?.icon || '⭐');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white dark:bg-[#161b22] border border-warm-200 dark:border-white/[0.08] rounded-3xl p-5 mb-3 shadow-lg shadow-warm-200/50 dark:shadow-black/40"
    >
      <div className="mb-4">
        <label className="text-stone-400 dark:text-[#8b949e] text-xs font-medium mb-1.5 block">Habit name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning run"
          className="w-full bg-warm-50 dark:bg-[#0d1117] border border-warm-200 dark:border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-stone-800 dark:text-[#e6edf3] placeholder-stone-300 dark:placeholder-[#484f58] focus:outline-none focus:border-brand-400 dark:focus:border-brand-500 transition-colors"
          autoFocus
        />
      </div>
      <div className="mb-5">
        <label className="text-stone-400 dark:text-[#8b949e] text-xs font-medium mb-1.5 block">Icon</label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className={cn(
                'w-9 h-9 rounded-2xl text-lg flex items-center justify-center transition-all',
                icon === ic
                  ? 'bg-brand-500 ring-2 ring-brand-300/60 shadow-md shadow-brand-500/30'
                  : 'bg-warm-100 dark:bg-white/[0.05] hover:bg-warm-200 dark:hover:bg-white/[0.09]'
              )}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => name.trim() && onSave({ name: name.trim(), icon, dailyTarget: 1 })}
          disabled={!name.trim()}
          className="flex-1 bg-brand-500 text-white text-sm font-semibold py-3 rounded-2xl hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-brand-500/25"
        >
          {initial ? 'Save changes' : 'Add habit'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-warm-100 dark:bg-white/[0.06] text-stone-500 dark:text-[#8b949e] text-sm font-medium py-3 rounded-2xl hover:bg-warm-200 dark:hover:bg-white/[0.10] transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

const MILESTONE_LABELS: Record<number, string> = {
  7: '1 Week', 30: '1 Month', 50: '50 Days',
  100: '100 Days', 365: '1 Year', 500: '500 Days', 1000: '1000 Days',
};

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const { habits, stats, refreshHabits, refreshStats } = useApp();
  const [localHabits, setLocalHabits] = useState<Habit[]>(habits);
  const [todayLogs, setTodayLogs] = useState<HabitLog[]>([]);
  const [allLogs, setAllLogs] = useState<HabitLog[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneDay, setMilestoneDay] = useState(0);
  const [tip, setTip] = useState<{ emoji: string; rule: string } | null>(
    () => getCachedTip()
  );
  const celebratedRef = useRef<Set<number>>(new Set());

  const todayStr = today();

  const loadLogs = useCallback(async () => {
    const dayData = await api.logs.forDate(todayStr);
    setTodayLogs(dayData.logs.map((d) => d.log));
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    const startDate = past.toISOString().split('T')[0];
    const rangeLogs = await api.logs.range(startDate, todayStr);
    setAllLogs(rangeLogs);
  }, [todayStr]);

  useEffect(() => { setLocalHabits(habits); }, [habits]);
  useEffect(() => { if (habits.length > 0) loadLogs(); }, [habits, loadLogs]);

  useEffect(() => {
    if (getCachedTip()) return;
    api.tip.get()
      .then((t) => { cacheTip(t); setTip(t); })
      .catch(() => setTip({ emoji: '💪', rule: 'Show up every day — consistency beats perfection.' }));
  }, []);

  useEffect(() => {
    if (!stats) return;
    const streak = stats.currentStreak;
    if (isMilestone(streak) && !celebratedRef.current.has(streak)) {
      celebratedRef.current.add(streak);
      setMilestoneDay(streak);
      setShowMilestone(true);
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#f97316', '#fb923c', '#fdba74', '#ffffff'] });
      setTimeout(() => setShowMilestone(false), 4000);
    }
  }, [stats?.currentStreak]);

  const isCompletedToday = (id: string) => todayLogs.some((l) => l.habitId === id && l.completed);

  const handleToggle = async (habitId: string) => {
    setToggling(habitId);
    await api.logs.toggle(habitId, todayStr);
    await loadLogs();
    await refreshStats();
    setToggling(null);
  };

  const handleAdd = async (data: { name: string; icon: string; dailyTarget: number }) => {
    await api.habits.create(data);
    await refreshHabits();
    setShowAdd(false);
  };

  const handleEdit = async (id: string, data: { name: string; icon: string; dailyTarget: number }) => {
    await api.habits.update(id, data);
    await refreshHabits();
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await api.habits.delete(id);
    await refreshHabits();
    await refreshStats();
  };

  const handleReorder = async (newOrder: Habit[]) => {
    setLocalHabits(newOrder);
    await api.habits.reorder(newOrder.map((h, i) => ({ id: h.id, order: i })));
    await refreshHabits();
  };

  const completedCount = localHabits.filter((h) => isCompletedToday(h.id)).length;
  const totalCount = localHabits.length;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const streak = stats?.currentStreak ?? 0;
  const longest = stats?.longestStreak ?? 0;

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-[#0d1117] px-4 py-10 md:py-8">
      <div className="max-w-2xl mx-auto space-y-5">

        <AnimatePresence>
          {showMilestone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-brand-500 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-brand-500/40 flex items-center gap-3"
            >
              <Award size={20} />
              <span className="font-semibold">🎉 {MILESTONE_LABELS[milestoneDay] || `${milestoneDay} days`} achieved!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECTION 1 — Header + streak card */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-stone-900 dark:text-[#e6edf3] font-bold text-2xl">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </h1>
              <p className="text-stone-400 dark:text-[#8b949e] text-sm mt-0.5">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-2xl flex items-center justify-center bg-white dark:bg-[#161b22] border border-warm-200 dark:border-white/[0.08] text-stone-400 dark:text-[#8b949e] hover:text-stone-700 dark:hover:text-[#e6edf3] shadow-sm transition-all duration-200"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>

          {/* Streak card — light: vivid gradient / dark: rich solid with glow */}
          <div className="bg-gradient-to-br from-brand-500 to-orange-600 dark:from-[#1a1200] dark:to-[#1a0f00] dark:border dark:border-brand-500/20 rounded-3xl p-5 shadow-lg shadow-brand-500/20 dark:shadow-brand-500/10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl">🔥</span>
                  <span className="text-5xl font-black text-white">{streak}</span>
                </div>
                <div className="text-white/80 dark:text-brand-400 text-sm font-medium">day streak</div>
                <div className="text-white/55 dark:text-[#8b949e] text-xs mt-1">{getMotivationalMessage(streak, longest)}</div>
              </div>
              <div className="text-right">
                <div className={cn('text-3xl font-black text-white', allDone && 'text-yellow-200 dark:text-brand-300')}>
                  {completedCount}/{totalCount}
                </div>
                <div className="text-white/55 dark:text-[#8b949e] text-xs">today</div>
                {allDone && <div className="text-yellow-200 dark:text-brand-400 text-xs font-semibold mt-1">✓ Perfect day!</div>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <Trophy size={13} />, label: 'Best', value: `${longest}d` },
                { icon: <TrendingUp size={13} />, label: 'Rate', value: `${stats?.completionPercentage ?? 0}%` },
                { icon: <Zap size={13} />, label: 'Total', value: stats?.totalHabitsCompleted ?? 0 },
              ].map((s) => (
                <div key={s.label} className="bg-white/20 dark:bg-white/[0.05] rounded-2xl px-3 py-2.5 flex items-center gap-2">
                  <span className="text-white/70 dark:text-brand-400/80">{s.icon}</span>
                  <div>
                    <div className="text-white text-sm font-bold">{s.value}</div>
                    <div className="text-white/60 dark:text-[#8b949e] text-[10px]">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* SECTION 2 — Daily rule from Mistral AI */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#161b22] border border-warm-200 dark:border-white/[0.06] rounded-3xl px-4 py-3 flex items-center gap-3 shadow-sm dark:shadow-black/20"
        >
          {tip ? (
            <>
              <span className="text-xl flex-shrink-0">{tip.emoji}</span>
              <p className="text-stone-600 dark:text-[#c9d1d9] text-sm leading-snug">{tip.rule}</p>
            </>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <div className="w-7 h-7 rounded-full bg-warm-100 dark:bg-white/[0.06] animate-pulse flex-shrink-0" />
              <div className="h-4 bg-warm-100 dark:bg-white/[0.06] rounded-full animate-pulse flex-1" />
            </div>
          )}
        </motion.div>

        {/* SECTION 3 — Habits task board */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-stone-800 dark:text-[#e6edf3] font-semibold text-base">Today's habits</h2>
              {totalCount > 0 && (
                <p className="text-stone-400 dark:text-[#8b949e] text-xs mt-0.5">
                  {completedCount} of {totalCount} complete · {Math.round((completedCount / totalCount) * 100)}%
                </p>
              )}
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-2xl hover:bg-brand-600 transition-colors shadow-md shadow-brand-500/25"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {totalCount > 0 && (
            <div className="h-1.5 bg-warm-200 dark:bg-white/[0.06] rounded-full overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full',
                  allDone
                    ? 'bg-gradient-to-r from-brand-500 to-emerald-400'
                    : 'bg-gradient-to-r from-brand-500 to-brand-400'
                )}
              />
            </div>
          )}

          <AnimatePresence>
            {showAdd && (
              <HabitForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
            )}
          </AnimatePresence>

          {localHabits.length === 0 && !showAdd && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <div className="text-4xl mb-3">🌱</div>
              <h3 className="text-stone-700 dark:text-[#c9d1d9] font-semibold text-base mb-1">No habits yet</h3>
              <p className="text-stone-400 dark:text-[#8b949e] text-sm">Add your first habit to start building your streak.</p>
            </motion.div>
          )}

          {localHabits.length > 0 && (
            <Reorder.Group axis="y" values={localHabits} onReorder={handleReorder} className="space-y-0">
              <AnimatePresence>
                {localHabits.map((habit, idx) => {
                  const done = isCompletedToday(habit.id);
                  const habitStreak = computeStreak(allLogs, habit.id);

                  return editingId === habit.id ? (
                    <motion.div
                      key={`edit-${habit.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <HabitForm
                        initial={habit}
                        onSave={(data) => handleEdit(habit.id, data)}
                        onCancel={() => setEditingId(null)}
                      />
                    </motion.div>
                  ) : (
                    <Reorder.Item key={habit.id} value={habit} id={habit.id}>
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl px-4 py-3 mb-2 transition-all duration-200',
                          done
                            ? 'bg-brand-50 dark:bg-brand-500/[0.08] border border-brand-200 dark:border-brand-500/20'
                            : 'bg-white dark:bg-[#161b22] border border-warm-200 dark:border-white/[0.06] hover:border-warm-300 dark:hover:border-white/[0.10] shadow-sm dark:shadow-black/20'
                        )}
                      >
                        <div className="text-warm-300 dark:text-[#484f58] cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
                          <GripVertical size={14} />
                        </div>

                        <div className="text-xl flex-shrink-0 w-8 text-center">{habit.icon}</div>

                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            'text-sm font-medium truncate leading-tight',
                            done ? 'text-stone-400 dark:text-[#484f58] line-through' : 'text-stone-800 dark:text-[#e6edf3]'
                          )}>
                            {habit.name}
                          </div>
                          {habitStreak > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Flame size={10} className="text-orange-400" />
                              <span className="text-orange-500 dark:text-orange-400 text-[10px] font-medium">{habitStreak} day streak</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => setEditingId(habit.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-xl text-stone-300 dark:text-[#484f58] hover:text-stone-500 dark:hover:text-[#8b949e] hover:bg-warm-100 dark:hover:bg-white/[0.06] transition-all"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(habit.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-xl text-stone-300 dark:text-[#484f58] hover:text-red-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.08] transition-all"
                          >
                            <Trash2 size={12} />
                          </button>

                          <button
                            onClick={() => handleToggle(habit.id)}
                            disabled={toggling === habit.id}
                            className={cn(
                              'ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border',
                              done
                                ? 'bg-brand-100 dark:bg-brand-500/[0.12] border-brand-200 dark:border-brand-500/30 text-brand-600 dark:text-brand-400'
                                : 'bg-warm-50 dark:bg-white/[0.04] border-warm-200 dark:border-white/[0.07] text-stone-400 dark:text-[#8b949e] hover:bg-brand-50 dark:hover:bg-brand-500/[0.08] hover:border-brand-200 dark:hover:border-brand-500/20 hover:text-brand-600 dark:hover:text-brand-400'
                            )}
                          >
                            {toggling === habit.id ? (
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : done ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <Check size={13} />
                            )}
                            <span>{done ? 'Done' : 'Mark done'}</span>
                          </button>
                        </div>
                      </motion.div>
                    </Reorder.Item>
                  );
                })}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </motion.div>

      </div>
    </div>
  );
}
