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
  const isPast = (dateStr: string) => dateStr < todayStr;
  const getDayData = (dateStr: string) => calendarData[dateStr] ?? null;

  const streak = stats?.currentStreak ?? 0;
  const longest = stats?.longestStreak ?? 0;

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-[#0d1117] flex flex-col">
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
            className="text-stone-500 dark:text-[#8b949e] text-sm leading-relaxed"
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
              className="w-10 h-10 flex items-center justify-center rounded-xl text-stone-500 dark:text-[#8b949e] hover:text-stone-800 dark:hover:text-[#e6edf3] hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-stone-900 dark:text-[#e6edf3] font-semibold text-lg">
              {formatMonth(year, month)}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              disabled={year === now.getFullYear() && month === now.getMonth() + 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-stone-500 dark:text-[#8b949e] hover:text-stone-800 dark:hover:text-[#e6edf3] hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-stone-400 dark:text-[#484f58] text-xs font-medium py-1">
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
              const past = isPast(dateStr);
              const dayInfo = getDayData(dateStr);
              const hasActivity = dayInfo && dayInfo.total > 0;
              const missed = past && hasActivity && dayInfo.completed === 0;
              const partial = past && hasActivity && !perfect && dayInfo.completed > 0;

              return (
                <motion.button
                  key={day}
                  whileTap={!future ? { scale: 0.92 } : {}}
                  onClick={() => openDay(dateStr)}
                  disabled={future}
                  className={cn(
                    'aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 relative gap-0.5',
                    perfect && 'bg-brand-500 text-white shadow-lg shadow-brand-500/30',
                    missed && 'bg-stone-100 dark:bg-white/[0.03] text-stone-400 dark:text-[#484f58]',
                    partial && !isCurrentDay && 'text-stone-700 dark:text-[#c9d1d9] hover:bg-stone-50 dark:hover:bg-white/[0.05]',
                    !perfect && !missed && !partial && !future && !isCurrentDay && 'text-stone-500 dark:text-[#8b949e] hover:bg-stone-100 dark:hover:bg-white/[0.05]',
                    !perfect && !future && isCurrentDay && 'text-stone-900 dark:text-[#e6edf3] ring-2 ring-brand-500/60',
                    future && 'text-stone-200 dark:text-[#30363d] cursor-default',
                    isCurrentDay && perfect && 'ring-2 ring-orange-300/60',
                  )}
                >
                  <span className={cn(partial && 'leading-none')}>{day}</span>

                  {/* Partial progress dots */}
                  {partial && (
                    <span className="flex gap-[2px] items-center">
                      {Array.from({ length: dayInfo!.total }).map((_, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            'rounded-full',
                            dayInfo!.total <= 4 ? 'w-1 h-1' : 'w-[3px] h-[3px]',
                            idx < dayInfo!.completed
                              ? 'bg-brand-500 dark:bg-brand-400'
                              : 'bg-stone-200 dark:bg-white/[0.12]'
                          )}
                        />
                      ))}
                    </span>
                  )}

                  {/* Missed day X mark */}
                  {missed && (
                    <span className="text-[8px] leading-none text-stone-300 dark:text-[#30363d] font-bold">✕</span>
                  )}

                  {/* Today indicator dot */}
                  {isCurrentDay && !perfect && !partial && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Month summary */}
          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-stone-800 dark:text-[#e6edf3] font-semibold text-xl">
                {Object.values(calendarData).filter((d) => d.isPerfect).length}
              </div>
              <div className="text-stone-400 dark:text-[#8b949e] text-xs mt-0.5">Perfect days</div>
            </div>
            <div className="w-px h-8 bg-stone-200 dark:bg-white/[0.08]" />
            <div className="text-center">
              <div className="text-brand-500 dark:text-brand-400 font-semibold text-xl">{streak}</div>
              <div className="text-stone-400 dark:text-[#8b949e] text-xs mt-0.5">Current streak</div>
            </div>
            <div className="w-px h-8 bg-stone-200 dark:bg-white/[0.08]" />
            <div className="text-center">
              <div className="text-stone-800 dark:text-[#e6edf3] font-semibold text-xl">{longest}</div>
              <div className="text-stone-400 dark:text-[#8b949e] text-xs mt-0.5">Best streak</div>
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 dark:bg-black/70 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedDate(null);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-full max-w-lg bg-white dark:bg-[#161b22] rounded-t-3xl border border-warm-200 dark:border-white/[0.08] border-b-0 max-h-[85vh] overflow-y-auto shadow-2xl dark:shadow-black/60"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-stone-900 dark:text-[#e6edf3] font-semibold text-lg">
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <p className="text-stone-400 dark:text-[#8b949e] text-sm mt-0.5">
                      {dayData.logs.filter((d) => d.log.completed).length} of {dayData.logs.length} habits completed
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 dark:bg-white/[0.07] text-stone-500 dark:text-[#8b949e] hover:text-stone-800 dark:hover:text-[#e6edf3] transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Habits list */}
                <div className="space-y-2 mb-6">
                  {dayData.logs.length === 0 ? (
                    <p className="text-stone-400 dark:text-[#8b949e] text-sm text-center py-4">No habits tracked yet</p>
                  ) : (
                    dayData.logs.map(({ log, habit }) => (
                      <button
                        key={habit.id}
                        onClick={() => toggleHabit(habit.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                          log.completed
                            ? 'bg-brand-50 dark:bg-brand-500/[0.10] border border-brand-200 dark:border-brand-500/25'
                            : 'bg-stone-50 dark:bg-white/[0.03] border border-stone-100 dark:border-white/[0.06] hover:border-stone-200 dark:hover:border-white/[0.10]'
                        )}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0',
                            log.completed ? 'bg-brand-500' : 'bg-stone-100 dark:bg-white/[0.07]'
                          )}
                        >
                          {log.completed ? <Check size={14} className="text-white" /> : habit.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className={cn('text-sm font-medium', log.completed ? 'text-stone-700 dark:text-[#c9d1d9]' : 'text-stone-500 dark:text-[#8b949e]')}>
                            {habit.name}
                          </div>
                          {log.completedAt && (
                            <div className="text-stone-400 dark:text-[#484f58] text-xs mt-0.5">
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
                <div className="border-t border-stone-100 dark:border-white/[0.07] pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-stone-500 dark:text-[#8b949e] text-sm font-medium">Notes</h4>
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
                        className="w-full bg-stone-50 dark:bg-[#0d1117] border border-stone-200 dark:border-white/[0.08] rounded-xl p-3 text-sm text-stone-800 dark:text-[#e6edf3] placeholder-stone-400 dark:placeholder-[#484f58] resize-none focus:outline-none focus:border-brand-500/50 transition-colors"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={saveNote}
                          className="flex-1 bg-brand-500 text-white text-sm font-medium py-2 rounded-xl hover:bg-brand-600 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingNote(false); setNoteText(dayData.note?.notes || ''); }}
                          className="flex-1 bg-stone-100 dark:bg-white/[0.07] text-stone-500 dark:text-[#8b949e] text-sm font-medium py-2 rounded-xl hover:bg-stone-200 dark:hover:bg-white/[0.10] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-stone-400 dark:text-[#8b949e] text-sm">
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
