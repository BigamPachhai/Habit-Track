import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, GripVertical, Pencil, Trash2, Check, Flame } from 'lucide-react';
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
      className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 mb-4 shadow-sm"
    >
      <div className="mb-4">
        <label className="text-slate-500 dark:text-white/50 text-xs font-medium mb-2 block">Habit name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning run"
          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-brand-500/50 transition-colors"
          autoFocus
        />
      </div>
      <div className="mb-5">
        <label className="text-slate-500 dark:text-white/50 text-xs font-medium mb-2 block">Icon</label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className={cn(
                'w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all',
                icon === ic ? 'bg-brand-600 ring-2 ring-brand-400/50 scale-110' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'
              )}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => name.trim() && onSave({ name: name.trim(), icon, dailyTarget })}
          disabled={!name.trim()}
          className="flex-1 bg-brand-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-brand-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {initial ? 'Save changes' : 'Add habit'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60 text-sm font-semibold py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
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
  // optimistic set: habitIds toggled immediately for instant UI feedback
  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const todayStr = today();

  const loadLogs = useCallback(async () => {
    const dayData = await api.logs.forDate(todayStr);
    const serverLogs = dayData.logs.map((d) => d.log);
    setTodayLogs(serverLogs);
    // reconcile optimistic state with server truth
    setOptimisticDone(new Set(serverLogs.filter((l) => l.completed).map((l) => l.habitId)));

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

  const isCompletedToday = (habitId: string) => optimisticDone.has(habitId);

  const handleToggle = async (habitId: string) => {
    // Optimistic update — flip immediately
    setOptimisticDone((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) next.delete(habitId);
      else next.add(habitId);
      return next;
    });
    await api.logs.toggle(habitId, todayStr);
    // Sync real state in background without blocking UI
    loadLogs();
    refreshStats();
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
    setConfirmDelete(null);
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
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 px-4 pt-10 pb-24 md:pt-8 md:pb-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-slate-900 dark:text-white font-bold text-2xl md:text-3xl">Today</h1>
            <p className="text-slate-400 dark:text-white/40 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); }}
            className="flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl hover:bg-brand-500 active:scale-95 transition-all shadow-sm shadow-brand-600/30"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add habit</span>
            <span className="sm:hidden">Add</span>
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
            <div className="flex justify-between text-xs text-slate-500 dark:text-white/40 mb-2 font-medium">
              <span>{completedCount} of {totalCount} done</span>
              <span>{Math.round((completedCount / totalCount) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
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

        {/* Delete confirm overlay */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm px-6"
              onClick={() => setConfirmDelete(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-dark-900 rounded-2xl p-6 w-full max-w-sm shadow-xl"
              >
                <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-1">Delete habit?</h3>
                <p className="text-slate-400 dark:text-white/40 text-sm mb-5">This will remove the habit and all its history. This can't be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDelete(confirmDelete)}
                    className="flex-1 bg-red-500 text-white text-sm font-semibold py-3 rounded-xl hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60 text-sm font-semibold py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {localHabits.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="text-6xl mb-4">🌱</div>
            <h3 className="text-slate-800 dark:text-white font-semibold text-lg mb-2">No habits yet</h3>
            <p className="text-slate-400 dark:text-white/40 text-sm">Add your first habit to start building your streak.</p>
          </motion.div>
        ) : (
          <Reorder.Group axis="y" values={localHabits} onReorder={handleReorder} className="space-y-0">
            <AnimatePresence>
              {localHabits.map((habit, i) =>
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
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i }}
                      className={cn(
                        'flex items-center gap-3 border rounded-2xl p-3 mb-3 transition-all duration-150',
                        isCompletedToday(habit.id)
                          ? 'bg-brand-50 dark:bg-brand-600/15 border-brand-200 dark:border-brand-500/30'
                          : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 shadow-sm'
                      )}
                    >
                      {/* Drag handle */}
                      <div className="text-slate-200 dark:text-white/15 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 p-1">
                        <GripVertical size={16} />
                      </div>

                      {/* Mark done button — large, easy to tap */}
                      <button
                        onClick={() => handleToggle(habit.id)}
                        className={cn(
                          'w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150 border-2 active:scale-90',
                          isCompletedToday(habit.id)
                            ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-600/30'
                            : 'border-slate-300 dark:border-white/25 text-transparent hover:border-brand-500/70 hover:bg-brand-50 dark:hover:bg-brand-500/10'
                        )}
                      >
                        <Check size={17} strokeWidth={2.5} className={isCompletedToday(habit.id) ? 'text-white' : 'text-slate-300 dark:text-white/20'} />
                      </button>

                      {/* Icon */}
                      <div className="text-2xl flex-shrink-0 leading-none">{habit.icon}</div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'font-medium truncate text-base leading-tight',
                          isCompletedToday(habit.id)
                            ? 'text-slate-400 dark:text-white/40 line-through'
                            : 'text-slate-800 dark:text-white'
                        )}>
                          {habit.name}
                        </div>
                      </div>

                      {/* Streak badge */}
                      {(() => {
                        const streak = computeStreak(allLogs, habit.id);
                        const done = isCompletedToday(habit.id);
                        return (
                          <div className={cn(
                            'flex items-center gap-1 px-2.5 py-1.5 rounded-xl flex-shrink-0',
                            done || streak > 0
                              ? 'bg-orange-50 dark:bg-orange-500/10'
                              : 'bg-slate-50 dark:bg-white/5'
                          )}>
                            <Flame size={13} className={done || streak > 0 ? 'text-orange-400' : 'text-slate-300 dark:text-white/20'} />
                            <span className={cn(
                              'text-sm font-bold tabular-nums',
                              done || streak > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-slate-300 dark:text-white/20'
                            )}>
                              {streak}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Edit / Delete — larger touch targets */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => { setEditingId(habit.id); setShowAdd(false); }}
                          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 dark:text-white/30 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-600/10 active:scale-90 transition-all"
                          aria-label="Edit habit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(habit.id)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 dark:text-white/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-90 transition-all"
                          aria-label="Delete habit"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </motion.div>
                  </Reorder.Item>
                )
              )}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}
