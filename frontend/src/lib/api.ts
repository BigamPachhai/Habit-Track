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
  ai: {
    weeklySummary: () =>
      req<{ message: string }>('/ai/weekly-summary', { method: 'POST' }),
    monthlyReview: () =>
      req<{ message: string }>('/ai/monthly-review', { method: 'POST' }),
    dailyMotivation: (currentStreak: number, longestStreak: number) =>
      req<{ message: string }>('/ai/daily-motivation', {
        method: 'POST',
        body: JSON.stringify({ currentStreak, longestStreak }),
      }),
    streakRisk: () =>
      req<{ message: string }>('/ai/streak-risk', { method: 'POST' }),
    twentiesSuggestions: () =>
      req<{ message: string }>('/ai/twenties-suggestions', { method: 'POST' }),
  },
};
