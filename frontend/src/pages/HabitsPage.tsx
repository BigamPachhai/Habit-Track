import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, GripVertical, Pencil, Trash2, X, Check, Flame } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { cn, today } from '../lib/utils';
import type { Habit, HabitLog } from '../types';

const ICONS = ['⭐', '💪', '📚', '🧘', '🏃', '🍎', '💧', '🎯', '✍️', '🛌', '🧠', '🎨', '🎵', '🌿', '🏋️', '🚴', '🧹', '💊', '🙏', '💻'];

interface HabitFormProps {
  initial?: Partial<Habit>;
  onSave: (data: { name: string; icon: string; dailyTarget: number }) => void;
  onCancel: () => void;
}

function HabitForm({ initial, onSave, onCancel }: HabitFormProps) {
  const [name, setName] = useState(initial?.name || '');
  const [icon, setIcon] = useState(initial?.icon || '⭐');
  const [dailyTarget] = useState(initial?.dailyTarget || 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-3 shadow-sm"
    >
      <div className="mb-4">
        <label className="text-slate-500 dark:text-white/50 text-xs font-medium mb-1.5 block">Habit name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning run"
          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-brand-500/50 transition-colors"
          autoFocus
        />
      </div>
      <div className="mb-4">
        <label className="text-slate-500 dark:text-white/50 text-xs font-medium mb-1.5 block">Icon</label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className={cn(
                'w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all',
                icon === ic ? 'bg-brand-600 ring-2 ring-brand-400/50' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'
              )}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => name.trim() && onSave({ name: name.trim(), icon, dailyTarget })}
          disabled={!name.trim()}
          className="flex-1 bg-brand-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-brand-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {initial ? 'Save changes' : 'Add habit'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function computeStreak(logs: HabitLog[], habitId: string): number {
  const completed = new Set(
    logs.filter((l) => l.habitId === habitId && l.completed).map((l) => l.date)
  );
  let streak = 0;
  const d = new Date();
  const todayStr = today();
  if (!completed.has(todayStr)) {
    d.setDate(d.getDate() - 1);
  }
  while (true) {
    const ds = d.toISOString().split('T')[0];
    if (completed.has(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function HabitsPage() {
  const { habits, refreshHabits, refreshStats } = useApp();
  const [localHabits, setLocalHabits] = useState<Habit[]>(habits);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [todayLogs, setTodayLogs] = useState<HabitLog[]>([]);
  const [allLogs, setAllLogs] = useState<HabitLog[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

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

  useEffect(() => {
    setLocalHabits(habits);
  }, [habits]);

  useEffect(() => {
    if (habits.length > 0) loadLogs();
  }, [habits, loadLogs]);

  const isCompletedToday = (habitId: string) =>
    todayLogs.some((l) => l.habitId === habitId && l.completed);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 px-4 py-12 md:py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-slate-900 dark:text-white font-bold text-2xl">Today</h1>
            <p className="text-slate-400 dark:text-white/40 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-brand-500 transition-colors"
          >
            <Plus size={16} />
            Add
          </button>
        </motion.div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex justify-between text-xs text-slate-400 dark:text-white/40 mb-1.5">
              <span>{completedCount} of {totalCount} done</span>
              <span>{Math.round((completedCount / totalCount) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
              />
            </div>
          </motion.div>
        )}

        {/* Add form */}
        <AnimatePresence>
          {showAdd && (
            <HabitForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
          )}
        </AnimatePresence>

        {localHabits.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="text-5xl mb-4">🌱</div>
            <h3 className="text-slate-800 dark:text-white font-semibold text-lg mb-2">No habits yet</h3>
            <p className="text-slate-400 dark:text-white/40 text-sm">Add your first habit to start building your streak.</p>
          </motion.div>
        ) : (
          <div className="flex gap-3">
            {/* Habits list (left) */}
            <div className="flex-1 min-w-0">
              <Reorder.Group axis="y" values={localHabits} onReorder={handleReorder} className="space-y-0">
                <AnimatePresence>
                  {localHabits.map((habit) =>
                    editingId === habit.id ? (
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
                          className={cn(
                            'flex items-center gap-2 border rounded-2xl p-3 mb-2 transition-all duration-200',
                            isCompletedToday(habit.id)
                              ? 'bg-brand-50 dark:bg-brand-600/15 border-brand-200 dark:border-brand-500/30'
                              : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 shadow-sm'
                          )}
                        >
                          <div className="text-slate-300 dark:text-white/20 cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
                            <GripVertical size={14} />
                          </div>

                          {/* Done button */}
                          <button
                            onClick={() => handleToggle(habit.id)}
                            disabled={toggling === habit.id}
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 border-2',
                              isCompletedToday(habit.id)
                                ? 'bg-brand-600 border-brand-500 text-white'
                                : 'border-slate-200 dark:border-white/20 text-transparent hover:border-brand-500/60'
                            )}
                          >
                            <Check size={14} />
                          </button>

                          <div className="text-xl flex-shrink-0">{habit.icon}</div>

                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              'text-sm font-medium truncate',
                              isCompletedToday(habit.id)
                                ? 'text-slate-400 dark:text-white line-through opacity-60'
                                : 'text-slate-800 dark:text-white'
                            )}>
                              {habit.name}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => setEditingId(habit.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-white/20 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-600/10 transition-all"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(habit.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </motion.div>
                      </Reorder.Item>
                    )
                  )}
                </AnimatePresence>
              </Reorder.Group>
            </div>

            {/* Streak sidebar (right) */}
            <div className="w-20 flex-shrink-0 space-y-2 pt-0">
              {localHabits.map((habit, i) => {
                const streak = computeStreak(allLogs, habit.id);
                const done = isCompletedToday(habit.id);
                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className={cn(
                      'h-[52px] mb-2 rounded-2xl flex flex-col items-center justify-center border transition-all duration-200',
                      done
                        ? 'bg-brand-50 dark:bg-brand-600/20 border-brand-200 dark:border-brand-500/30'
                        : streak > 0
                        ? 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 shadow-sm'
                        : 'bg-slate-50 dark:bg-white/3 border-slate-100 dark:border-white/5'
                    )}
                  >
                    <div className="flex items-center gap-0.5">
                      <Flame size={11} className={done || streak > 0 ? 'text-orange-400' : 'text-slate-300 dark:text-white/20'} />
                      <span className={cn(
                        'text-sm font-bold',
                        done || streak > 0 ? 'text-slate-700 dark:text-white' : 'text-slate-300 dark:text-white/20'
                      )}>
                        {streak}
                      </span>
                    </div>
                    <span className="text-slate-400 dark:text-white/30 text-[9px] mt-0.5">daily</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
