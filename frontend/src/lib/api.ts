import type { Habit, HabitLog, OverviewStats, CalendarDayData, AnalyticsData, DayData, DailyNote } from '../types';

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  habits: {
    list: () => req<Habit[]>('/habits'),
    create: (data: { name: string; icon: string; dailyTarget: number }) =>
      req<Habit>('/habits', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Habit>) =>
      req<Habit>(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      req<{ success: boolean }>(`/habits/${id}`, { method: 'DELETE' }),
    reorder: (order: { id: string; order: number }[]) =>
      req<{ success: boolean }>('/habits/reorder/batch', {
        method: 'PUT',
        body: JSON.stringify({ order }),
      }),
  },
  logs: {
    range: (startDate: string, endDate: string) =>
      req<HabitLog[]>(`/logs?startDate=${startDate}&endDate=${endDate}`),
    forDate: (date: string) =>
      req<{ logs: DayData[]; note: DailyNote | null }>(`/logs/date/${date}`),
    toggle: (habitId: string, date: string) =>
      req<HabitLog>('/logs/toggle', { method: 'POST', body: JSON.stringify({ habitId, date }) }),
    saveNote: (date: string, notes: string) =>
      req<DailyNote>(`/logs/note/${date}`, { method: 'PUT', body: JSON.stringify({ notes }) }),
  },
  stats: {
    overview: () => req<OverviewStats>('/stats/overview'),
    calendar: (year: number, month: number) =>
      req<Record<string, CalendarDayData>>(`/stats/calendar/${year}/${month}`),
    analytics: () => req<AnalyticsData>('/stats/analytics'),
  },
  tip: {
    get: () => req<{ emoji: string; rule: string }>('/tip'),
  },
  ai: {
    dailyMotivation: (streak: number, longest: number) =>
      req<{ message: string }>(`/ai/daily?streak=${streak}&longest=${longest}`),
    weeklySummary: () => req<{ message: string }>('/ai/weekly'),
    monthlyReview: () => req<{ message: string }>('/ai/monthly'),
    twentiesSuggestions: () => req<{ message: string }>('/ai/twenties'),
    streakRisk: () => req<{ message: string }>('/ai/streak-risk'),
  },
};
