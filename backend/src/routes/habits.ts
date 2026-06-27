import { Router } from 'express';
import { db } from '../db';
import { habits } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

// GET all active habits
router.get('/', async (req, res) => {
  try {
    const allHabits = await db
      .select()
      .from(habits)
      .where(eq(habits.isActive, true))
      .orderBy(asc(habits.order));
    res.json(allHabits);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

// POST create habit
router.post('/', async (req, res) => {
  try {
    const { name, icon, dailyTarget } = req.body;
    const allHabits = await db.select().from(habits).where(eq(habits.isActive, true));
    const newHabit = await db
      .insert(habits)
      .values({
        id: randomUUID(),
        name,
        icon: icon || '⭐',
        dailyTarget: dailyTarget || 1,
        order: allHabits.length,
      })
      .returning();
    res.json(newHabit[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create habit' });
  }
});

// PUT reorder habits — must be before /:id to avoid param capture
router.put('/reorder/batch', async (req, res) => {
  try {
    const { order } = req.body as { order: { id: string; order: number }[] };
    await Promise.all(
      order.map((item) =>
        db.update(habits).set({ order: item.order }).where(eq(habits.id, item.id))
      )
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder habits' });
  }
});

// PUT update habit
router.put('/:id', async (req, res) => {
  try {
    const { name, icon, dailyTarget, order } = req.body;
    const updated = await db
      .update(habits)
      .set({ name, icon, dailyTarget, order })
      .where(eq(habits.id, req.params.id))
      .returning();
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update habit' });
  }
});

// DELETE (soft delete) habit
router.delete('/:id', async (req, res) => {
  try {
    await db
      .update(habits)
      .set({ isActive: false })
      .where(eq(habits.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete habit' });
  }
});

export default router;
