import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Check, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { cn, getDaysInMonth, getFirstDayOfMonth, formatMonth, today, getMotivationalMessage } from '../lib/utils';
import type { CalendarDayData, DayData, DailyNote } from '../types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { stats, refreshStats } = useApp();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calendarData, setCalendarData] = useState<Record<string, CalendarDayData>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayData, setDayData] = useState<{ logs: DayData[]; note: DailyNote | null } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState(false);

  const todayStr = today();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const loadCalendar = useCallback(async () => {
    const data = await api.stats.calendar(year, month);
    setCalendarData(data);
  }, [year, month]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const navigateMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  };

  const openDay = async (dateStr: string) => {
    if (dateStr > todayStr) return;
    setSelectedDate(dateStr);
    const data = await api.logs.forDate(dateStr);
    setDayData(data);
    setNoteText(data.note?.notes || '');
    setEditingNote(false);
  };

  const toggleHabit = async (habitId: string) => {
    if (!selectedDate) return;
    await api.logs.toggle(habitId, selectedDate);
    const data = await api.logs.forDate(selectedDate);
    setDayData(data);
    await loadCalendar();
    await refreshStats();
  };

  const saveNote = async () => {
    if (!selectedDate) return;
    await api.logs.saveNote(selectedDate, noteText);
    const data = await api.logs.forDate(selectedDate);
    setDayData(data);
    setEditingNote(false);
  };

  const isPerfect = (dateStr: string) => calendarData[dateStr]?.isPerfect ?? false;
  const isToday = (dateStr: string) => dateStr === todayStr;
  const isFuture = (dateStr: string) => dateStr > todayStr;

  const streak = stats?.currentStreak ?? 0;
  const longest = stats?.longestStreak ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 md:pt-8">
        <div className="max-w-lg mx-auto">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-brand-500 dark:text-brand-400 text-sm font-medium mb-1"
          >
            {streak > 0 ? `🔥 ${streak}-day streak` : 'Start your streak today'}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-slate-500 dark:text-white/60 text-sm leading-relaxed"
          >
            {getMotivationalMessage(streak, longest)}
          </motion.h1>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 px-4 pb-6">
        <div className="max-w-lg mx-auto">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-slate-900 dark:text-white font-semibold text-lg">
              {formatMonth(year, month)}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              disabled={year === now.getFullYear() && month === now.getMonth() + 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-slate-400 dark:text-white/30 text-xs font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const perfect = isPerfect(dateStr);
              const future = isFuture(dateStr);
              const isCurrentDay = isToday(dateStr);

              return (
                <motion.button
                  key={day}
                  whileTap={!future ? { scale: 0.92 } : {}}
                  onClick={() => openDay(dateStr)}
                  disabled={future}
                  className={cn(
                    'aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200 relative',
                    perfect && 'bg-brand-600 text-white shadow-lg shadow-brand-600/30',
                    !perfect && !future && !isCurrentDay && 'text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/5',
                    !perfect && !future && isCurrentDay && 'text-slate-900 dark:text-white ring-2 ring-brand-500/60',
                    future && 'text-slate-200 dark:text-white/15 cursor-default',
                    isCurrentDay && perfect && 'ring-2 ring-brand-300/60',
                  )}
                >
                  {day}
                  {isCurrentDay && !perfect && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Month summary */}
          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-slate-800 dark:text-white font-semibold text-xl">
                {Object.values(calendarData).filter((d) => d.isPerfect).length}
              </div>
              <div className="text-slate-400 dark:text-white/40 text-xs mt-0.5">Perfect days</div>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
            <div className="text-center">
              <div className="text-brand-500 dark:text-brand-400 font-semibold text-xl">{streak}</div>
              <div className="text-slate-400 dark:text-white/40 text-xs mt-0.5">Current streak</div>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
            <div className="text-center">
              <div className="text-slate-800 dark:text-white font-semibold text-xl">{longest}</div>
              <div className="text-slate-400 dark:text-white/40 text-xs mt-0.5">Best streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Day detail modal */}
      <AnimatePresence>
        {selectedDate && dayData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedDate(null);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-full max-w-lg bg-white dark:bg-dark-900 rounded-t-3xl border border-slate-200 dark:border-white/10 border-b-0 max-h-[85vh] overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-slate-900 dark:text-white font-semibold text-lg">
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <p className="text-slate-400 dark:text-white/40 text-sm mt-0.5">
                      {dayData.logs.filter((d) => d.log.completed).length} of {dayData.logs.length} habits completed
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Habits list */}
                <div className="space-y-2 mb-6">
                  {dayData.logs.length === 0 ? (
                    <p className="text-slate-400 dark:text-white/30 text-sm text-center py-4">No habits tracked yet</p>
                  ) : (
                    dayData.logs.map(({ log, habit }) => (
                      <button
                        key={habit.id}
                        onClick={() => toggleHabit(habit.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                          log.completed
                            ? 'bg-brand-50 dark:bg-brand-600/20 border border-brand-200 dark:border-brand-500/30'
                            : 'bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10'
                        )}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0',
                            log.completed ? 'bg-brand-600' : 'bg-slate-100 dark:bg-white/10'
                          )}
                        >
                          {log.completed ? <Check size={14} className="text-white" /> : habit.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className={cn('text-sm font-medium', log.completed ? 'text-slate-700 dark:text-white' : 'text-slate-500 dark:text-white/60')}>
                            {habit.name}
                          </div>
                          {log.completedAt && (
                            <div className="text-slate-400 dark:text-white/30 text-xs mt-0.5">
                              Completed at {new Date(log.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                        {log.completed && (
                          <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                            <Check size={11} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Notes section */}
                <div className="border-t border-slate-100 dark:border-white/10 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-slate-500 dark:text-white/60 text-sm font-medium">Notes</h4>
                    {!editingNote && (
                      <button
                        onClick={() => setEditingNote(true)}
                        className="text-brand-500 dark:text-brand-400 text-xs flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
                      >
                        <Pencil size={12} />
                        {dayData.note?.notes ? 'Edit' : 'Add note'}
                      </button>
                    )}
                  </div>
                  {editingNote ? (
                    <div>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="How did today go?"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/30 resize-none focus:outline-none focus:border-brand-500/50 transition-colors"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={saveNote}
                          className="flex-1 bg-brand-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-brand-500 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingNote(false); setNoteText(dayData.note?.notes || ''); }}
                          className="flex-1 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/60 text-sm font-medium py-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 dark:text-white/40 text-sm">
                      {dayData.note?.notes || 'No notes for this day.'}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
