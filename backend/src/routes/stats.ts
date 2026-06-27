import { Router } from 'express';
import { db } from '../db';
import { habits, habitLogs } from '../db/schema';
import { eq, and, gte, lte, asc } from 'drizzle-orm';

const router = Router();

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  return Math.abs(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// GET overall stats
router.get('/overview', async (req, res) => {
  try {
    const allHabits = await db.select().from(habits).where(eq(habits.isActive, true));
    if (allHabits.length === 0) {
      return res.json({
        currentStreak: 0,
        longestStreak: 0,
        perfectDaysThisMonth: 0,
        completionPercentage: 0,
        totalCompletedDays: 0,
        totalHabitsCompleted: 0,
        nextMilestoneDays: 30,
        nextMilestone: 30,
      });
    }

    const allLogs = await db.select().from(habitLogs).orderBy(asc(habitLogs.date));
    const today = toDateStr(new Date());
    const habitCount = allHabits.length;

    // Group logs by date
    const logsByDate: Record<string, number> = {};
    for (const log of allLogs) {
      if (log.completed) {
        logsByDate[log.date] = (logsByDate[log.date] || 0) + 1;
      }
    }

    // Perfect day = all habits completed
    const perfectDays = Object.entries(logsByDate)
      .filter(([, count]) => count >= habitCount)
      .map(([date]) => date)
      .sort();

    // Current streak
    let currentStreak = 0;
    const checkDate = new Date();
    // If today not perfect, start checking from yesterday
    const todayStr = toDateStr(checkDate);
    if (!perfectDays.includes(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const ds = toDateStr(checkDate);
      if (perfectDays.includes(ds)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: string | null = null;
    for (const d of perfectDays) {
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diff = daysBetween(prevDate, d);
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      prevDate = d;
    }

    // Perfect days this month
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const perfectDaysThisMonth = perfectDays.filter((d) => d >= monthStart).length;

    // Completion %
    const totalDays = perfectDays.length;
    const firstLog = allLogs[0]?.date;
    let totalPossibleDays = 0;
    if (firstLog) {
      totalPossibleDays = Math.floor(daysBetween(firstLog, today)) + 1;
    }
    const completionPercentage =
      totalPossibleDays > 0 ? Math.round((totalDays / totalPossibleDays) * 100) : 0;

    // Total habits completed
    const totalHabitsCompleted = allLogs.filter((l) => l.completed).length;

    // Next milestone
    const milestones = [7, 30, 50, 100, 365, 500, 1000];
    const nextMilestone = milestones.find((m) => m > currentStreak) || 1000;
    const nextMilestoneDays = nextMilestone - currentStreak;

    res.json({
      currentStreak,
      longestStreak,
      perfectDaysThisMonth,
      completionPercentage,
      totalCompletedDays: totalDays,
      totalHabitsCompleted,
      nextMilestoneDays,
      nextMilestone,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET calendar data for a month
router.get('/calendar/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const allHabits = await db.select().from(habits).where(eq(habits.isActive, true));
    const habitCount = allHabits.length;

    const logs = await db
      .select()
      .from(habitLogs)
      .where(and(gte(habitLogs.date, startDate), lte(habitLogs.date, endDate)));

    const logsByDate: Record<string, number> = {};
    for (const log of logs) {
      if (log.completed) {
        logsByDate[log.date] = (logsByDate[log.date] || 0) + 1;
      }
    }

    const calendarData: Record<string, { completed: number; total: number; isPerfect: boolean }> = {};
    for (const [date, completed] of Object.entries(logsByDate)) {
      calendarData[date] = {
        completed,
        total: habitCount,
        isPerfect: completed >= habitCount && habitCount > 0,
      };
    }

    res.json(calendarData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

// GET analytics data
router.get('/analytics', async (req, res) => {
  try {
    const allHabits = await db.select().from(habits).where(eq(habits.isActive, true));
    const allLogs = await db
      .select({ log: habitLogs, habit: habits })
      .from(habitLogs)
      .innerJoin(habits, eq(habitLogs.habitId, habits.id))
      .where(eq(habitLogs.completed, true))
      .orderBy(asc(habitLogs.date));

    const habitCount = allHabits.length;

    // Habit completion counts
    const habitCounts: Record<string, { name: string; icon: string; count: number }> = {};
    for (const { log, habit } of allLogs) {
      if (!habitCounts[habit.id]) {
        habitCounts[habit.id] = { name: habit.name, icon: habit.icon, count: 0 };
      }
      habitCounts[habit.id].count++;
    }

    const sorted = Object.values(habitCounts).sort((a, b) => b.count - a.count);
    const mostCompleted = sorted[0] || null;
    const mostSkipped = sorted[sorted.length - 1] || null;

    // Monthly data
    const monthlyData: Record<string, { perfect: number; total: number }> = {};
    const logsByDate: Record<string, number> = {};
    for (const { log } of allLogs) {
      logsByDate[log.date] = (logsByDate[log.date] || 0) + 1;
    }

    for (const [date, count] of Object.entries(logsByDate)) {
      const month = date.slice(0, 7);
      if (!monthlyData[month]) monthlyData[month] = { perfect: 0, total: 0 };
      monthlyData[month].total++;
      if (count >= habitCount && habitCount > 0) {
        monthlyData[month].perfect++;
      }
    }

    // Weekly completion for last 12 weeks
    const weeklyData: { week: string; rate: number }[] = [];
    const now = new Date();
    for (let w = 11; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      const ws = toDateStr(weekStart);
      const we = toDateStr(weekEnd);

      const perfectInWeek = Object.entries(logsByDate)
        .filter(([d, c]) => d >= ws && d <= we && c >= habitCount && habitCount > 0)
        .length;

      weeklyData.push({
        week: `${ws.slice(5)}`,
        rate: habitCount > 0 ? Math.round((perfectInWeek / 7) * 100) : 0,
      });
    }

    // Perfect months
    const perfectMonths = Object.entries(monthlyData)
      .filter(([month, data]) => {
        const [y, m] = month.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        return data.perfect >= daysInMonth;
      })
      .map(([month]) => month);

    const bestMonth = Object.entries(monthlyData)
      .sort(([, a], [, b]) => b.perfect - a.perfect)[0]?.[0] || null;

    res.json({
      mostCompleted,
      mostSkipped,
      monthlyData,
      weeklyData,
      perfectMonths,
      bestMonth,
      habitBreakdown: Object.values(habitCounts),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
