import { Router } from 'express';
import { db } from '../db';
import { habits, habitLogs } from '../db/schema';
import { eq, and, gte, asc } from 'drizzle-orm';

const router = Router();

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function mistral(key: string, prompt: string, maxTokens = 300): Promise<string> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      max_tokens: maxTokens,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function getHabitContext() {
  const allHabits = await db.select().from(habits).where(eq(habits.isActive, true));
  const now = new Date();
  const thirtyDaysAgo = toDateStr(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
  const logs = await db
    .select()
    .from(habitLogs)
    .where(and(gte(habitLogs.date, thirtyDaysAgo), eq(habitLogs.completed, true)))
    .orderBy(asc(habitLogs.date));

  const countByHabit: Record<string, number> = {};
  for (const log of logs) {
    countByHabit[log.habitId] = (countByHabit[log.habitId] || 0) + 1;
  }

  return allHabits.map((h) => ({
    name: h.name,
    completedLast30Days: countByHabit[h.id] ?? 0,
    completionRate: Math.round(((countByHabit[h.id] ?? 0) / 30) * 100),
  }));
}

router.get('/daily', async (req, res) => {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return res.status(500).json({ error: 'MISTRAL_API_KEY not configured' });
  try {
    const streak = Number(req.query.streak ?? 0);
    const longest = Number(req.query.longest ?? 0);
    const habits = await getHabitContext();
    const prompt =
      `You are a no-nonsense habit coach. The user has a ${streak}-day streak (longest: ${longest} days). ` +
      `Their habits (last 30 days completion rate): ${habits.map((h) => `${h.name} ${h.completionRate}%`).join(', ')}. ` +
      `Write 2-3 sentences of personalized daily motivation. Be direct, specific to their data, and encouraging. No filler phrases.`;
    const message = await mistral(key, prompt, 150);
    res.json({ message });
  } catch {
    res.status(500).json({ error: 'AI request failed' });
  }
});

router.get('/weekly', async (_req, res) => {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return res.status(500).json({ error: 'MISTRAL_API_KEY not configured' });
  try {
    const habitData = await getHabitContext();
    const now = new Date();
    const weekAgo = toDateStr(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const logs = await db
      .select()
      .from(habitLogs)
      .where(and(gte(habitLogs.date, weekAgo), eq(habitLogs.completed, true)));
    const countByHabit: Record<string, number> = {};
    for (const log of logs) countByHabit[log.habitId] = (countByHabit[log.habitId] || 0) + 1;

    const prompt =
      `You are a habit coach giving a weekly summary. Habits this week (completions out of 7 days): ` +
      `${habitData.map((h) => `${h.name}: ${countByHabit[Object.keys(countByHabit).find((k) => habitData.find((hd) => hd.name === h.name)) ?? ''] ?? 0}/7`).join(', ')}. ` +
      `Give: 1) wins (what went well), 2) gaps (what to improve), 3) one specific tip for next week. Be concise and honest. 3-4 sentences total.`;
    const message = await mistral(key, prompt, 200);
    res.json({ message });
  } catch {
    res.status(500).json({ error: 'AI request failed' });
  }
});

router.get('/monthly', async (_req, res) => {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return res.status(500).json({ error: 'MISTRAL_API_KEY not configured' });
  try {
    const habitData = await getHabitContext();
    const prompt =
      `You are a habit coach doing a monthly review. Last 30 days data: ` +
      `${habitData.map((h) => `${h.name}: ${h.completedLast30Days}/30 days (${h.completionRate}%)`).join(', ')}. ` +
      `Give a deep analysis: what's working, what needs focus, and 2 specific goals for next month. Be direct and actionable. 4-5 sentences.`;
    const message = await mistral(key, prompt, 250);
    res.json({ message });
  } catch {
    res.status(500).json({ error: 'AI request failed' });
  }
});

router.get('/twenties', async (_req, res) => {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return res.status(500).json({ error: 'MISTRAL_API_KEY not configured' });
  try {
    const habitData = await getHabitContext();
    const prompt =
      `You are a brutally honest mentor for someone in their 20s building habits. Their current habits: ${habitData.map((h) => h.name).join(', ')}. ` +
      `Completion rates: ${habitData.map((h) => `${h.name} ${h.completionRate}%`).join(', ')}. ` +
      `Give exactly 5 strict, blunt, no-fluff improvements they must make. Number them 1-5. ` +
      `Be specific to their data. No soft language. Each point max 20 words.`;
    const message = await mistral(key, prompt, 300);
    res.json({ message });
  } catch {
    res.status(500).json({ error: 'AI request failed' });
  }
});

router.get('/streak-risk', async (_req, res) => {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return res.status(500).json({ error: 'MISTRAL_API_KEY not configured' });
  try {
    const habitData = await getHabitContext();
    const allHabits = await db.select().from(habits).where(eq(habits.isActive, true));
    const now = new Date();
    const last7 = toDateStr(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const recentLogs = await db
      .select()
      .from(habitLogs)
      .where(and(gte(habitLogs.date, last7), eq(habitLogs.completed, true)));
    const recentByHabit: Record<string, number> = {};
    for (const log of recentLogs) recentByHabit[log.habitId] = (recentByHabit[log.habitId] || 0) + 1;

    const habitWithIds = allHabits.map((h) => ({
      name: h.name,
      last7: recentByHabit[h.id] ?? 0,
      last30Rate: habitData.find((hd) => hd.name === h.name)?.completionRate ?? 0,
    }));

    const prompt =
      `You are a habit streak analyst. Analyze these habits for streak risk based on recent performance. ` +
      `Last 7 days completions (out of 7): ${habitWithIds.map((h) => `${h.name}: ${h.last7}/7`).join(', ')}. ` +
      `30-day rates: ${habitWithIds.map((h) => `${h.name}: ${h.last30Rate}%`).join(', ')}. ` +
      `Identify which habits are at risk of breaking the streak and why. Give specific advice. 3-4 sentences. Be direct.`;
    const message = await mistral(key, prompt, 200);
    res.json({ message });
  } catch {
    res.status(500).json({ error: 'AI request failed' });
  }
});

export default router;
