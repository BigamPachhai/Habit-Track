import { Router } from 'express';
import { db } from '../db';
import { habits, habitLogs, dailyNotes } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

// GET logs for a date range
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    const logs = await db
      .select()
      .from(habitLogs)
      .where(
        and(
          gte(habitLogs.date, startDate),
          lte(habitLogs.date, endDate)
        )
      );
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// GET logs for a specific date
router.get('/date/:date', async (req, res) => {
  try {
    const logs = await db
      .select({
        log: habitLogs,
        habit: habits,
      })
      .from(habitLogs)
      .innerJoin(habits, eq(habitLogs.habitId, habits.id))
      .where(eq(habitLogs.date, req.params.date));

    const note = await db
      .select()
      .from(dailyNotes)
      .where(eq(dailyNotes.date, req.params.date));

    res.json({ logs, note: note[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs for date' });
  }
});

// POST toggle habit completion for a date
router.post('/toggle', async (req, res) => {
  try {
    const { habitId, date } = req.body;

    const existing = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));

    if (existing.length > 0) {
      const newCompleted = !existing[0].completed;
      const updated = await db
        .update(habitLogs)
        .set({
          completed: newCompleted,
          completedAt: newCompleted ? new Date() : null,
        })
        .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
        .returning();
      res.json(updated[0]);
    } else {
      const created = await db
        .insert(habitLogs)
        .values({
          id: randomUUID(),
          habitId,
          date,
          completed: true,
          completedAt: new Date(),
        })
        .returning();
      res.json(created[0]);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle habit log' });
  }
});

// PUT save daily note
router.put('/note/:date', async (req, res) => {
  try {
    const { notes } = req.body;
    const existing = await db
      .select()
      .from(dailyNotes)
      .where(eq(dailyNotes.date, req.params.date));

    if (existing.length > 0) {
      const updated = await db
        .update(dailyNotes)
        .set({ notes })
        .where(eq(dailyNotes.date, req.params.date))
        .returning();
      res.json(updated[0]);
    } else {
      const created = await db
        .insert(dailyNotes)
        .values({ id: randomUUID(), date: req.params.date, notes })
        .returning();
      res.json(created[0]);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to save note' });
  }
});

export default router;
