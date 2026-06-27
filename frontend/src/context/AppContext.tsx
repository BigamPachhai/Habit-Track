import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Habit, OverviewStats } from '../types';

interface AppContextValue {
  habits: Habit[];
  stats: OverviewStats | null;
  refreshHabits: () => Promise<void>;
  refreshStats: () => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshHabits = useCallback(async () => {
    const data = await api.habits.list();
    setHabits(data);
  }, []);

  const refreshStats = useCallback(async () => {
    const data = await api.stats.overview();
    setStats(data);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([refreshHabits(), refreshStats()]).finally(() => setIsLoading(false));
  }, []);

  return (
    <AppContext.Provider value={{ habits, stats, refreshHabits, refreshStats, isLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
