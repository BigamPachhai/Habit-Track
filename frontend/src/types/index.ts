export interface Habit {
  id: string;
  name: string;
  icon: string;
  dailyTarget: number;
  order: number;
  createdAt: string;
  isActive: boolean;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  completedAt: string | null;
  notes: string | null;
}

export interface DailyNote {
  id: string;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface DayData {
  log: HabitLog;
  habit: Habit;
}

export interface CalendarDayData {
  completed: number;
  total: number;
  isPerfect: boolean;
}

export interface OverviewStats {
  currentStreak: number;
  longestStreak: number;
  perfectDaysThisMonth: number;
  completionPercentage: number;
  totalCompletedDays: number;
  totalHabitsCompleted: number;
  nextMilestoneDays: number;
  nextMilestone: number;
}

export interface AnalyticsData {
  mostCompleted: { name: string; icon: string; count: number } | null;
  mostSkipped: { name: string; icon: string; count: number } | null;
  monthlyData: Record<string, { perfect: number; total: number }>;
  weeklyData: { week: string; rate: number }[];
  perfectMonths: string[];
  bestMonth: string | null;
  habitBreakdown: { name: string; icon: string; count: number }[];
}
