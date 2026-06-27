import { Router } from 'express';
import { db } from '../db';
import { habits, habitLogs, dailyNotes } from '../db/schema';
import { eq, and, gte, asc, desc } from 'drizzle-orm';

const router = Router();

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

async function groqChat(key: string, messages: MistralMessage[], maxTokens = 600): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: maxTokens,
      temperature: 0.7,
      messages,
    }),
  });
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// Chat uses Groq (fast, conversational). Falls back to Mistral if Groq key missing.
async function chatCompletion(messages: MistralMessage[], maxTokens = 600): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (groqKey) return groqChat(groqKey, messages, maxTokens);
  if (mistralKey) return mistral(mistralKey, messages[messages.length - 1].content, maxTokens);
  throw new Error('No AI API key configured');
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

router.post('/chat', async (req, res) => {
  if (!process.env.GROQ_API_KEY && !process.env.MISTRAL_API_KEY) {
    return res.status(500).json({ error: 'No AI API key configured' });
  }

  const { messages } = req.body as { messages?: MistralMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const now = new Date();
    const today = toDateStr(now);

    // Gather all habit data
    const allHabits = await db.select().from(habits).where(eq(habits.isActive, true)).orderBy(asc(habits.order));

    // Last 30 days completion per habit
    const thirtyDaysAgo = toDateStr(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = toDateStr(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

    const recentLogs = await db
      .select()
      .from(habitLogs)
      .where(and(gte(habitLogs.date, thirtyDaysAgo), eq(habitLogs.completed, true)))
      .orderBy(asc(habitLogs.date));

    // Counts per habit last 30 and 7 days
    const count30: Record<string, number> = {};
    const count7: Record<string, number> = {};
    for (const log of recentLogs) {
      count30[log.habitId] = (count30[log.habitId] || 0) + 1;
      if (log.date >= sevenDaysAgo) {
        count7[log.habitId] = (count7[log.habitId] || 0) + 1;
      }
    }

    // Perfect days streak: group completed logs by date, check if all habits done
    const allLogsAll = await db.select().from(habitLogs).orderBy(asc(habitLogs.date));
    const habitCount = allHabits.length;
    const logsByDate: Record<string, number> = {};
    for (const log of allLogsAll) {
      if (log.completed) logsByDate[log.date] = (logsByDate[log.date] || 0) + 1;
    }
    const perfectDays = Object.entries(logsByDate)
      .filter(([, c]) => c >= habitCount)
      .map(([d]) => d)
      .sort();

    // Current streak
    let currentStreak = 0;
    const checkDate = new Date();
    if (!perfectDays.includes(today)) checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const ds = toDateStr(checkDate);
      if (perfectDays.includes(ds)) { currentStreak++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }

    // Longest streak
    let longestStreak = 0, tempStreak = 0;
    let prevDate: string | null = null;
    for (const d of perfectDays) {
      if (!prevDate) { tempStreak = 1; }
      else {
        const diff = Math.abs((new Date(d).getTime() - new Date(prevDate).getTime()) / (1000 * 60 * 60 * 24));
        tempStreak = diff === 1 ? tempStreak + 1 : 1;
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      prevDate = d;
    }

    const totalHabitsCompleted = allLogsAll.filter((l) => l.completed).length;

    // Today's completion
    const todayLogs = await db.select().from(habitLogs).where(and(eq(habitLogs.date, today), eq(habitLogs.completed, true)));
    const completedTodayCount = todayLogs.length;

    // Recent daily notes (last 7)
    const recentNotes = await db
      .select()
      .from(dailyNotes)
      .where(gte(dailyNotes.date, sevenDaysAgo))
      .orderBy(desc(dailyNotes.date))
      .limit(7);

    // Build per-habit summary
    const habitSummary = allHabits.map((h) => {
      const done30 = count30[h.id] ?? 0;
      const done7 = count7[h.id] ?? 0;
      return `${h.icon} ${h.name}: ${done7}/7 this week, ${done30}/30 last month (${Math.round((done30 / 30) * 100)}%)`;
    }).join('\n');

    const notesSummary = recentNotes.length > 0
      ? recentNotes.map((n) => `${n.date}: "${n.notes ?? ''}"`).join('\n')
      : 'No recent notes.';

    const systemPrompt = `You are a personal AI habit coach with full access to the user's habit tracking data. You know everything about their progress and can answer any question about their habits, streaks, performance, and goals.

Today's date: ${today}

=== HABITS (${habitCount} active) ===
${habitSummary}

=== STREAK & STATS ===
Current streak: ${currentStreak} perfect days
Longest streak ever: ${longestStreak} perfect days
Total perfect days: ${perfectDays.length}
Total habit completions ever: ${totalHabitsCompleted}
Today so far: ${completedTodayCount}/${habitCount} habits done

=== RECENT DAILY NOTES (last 7 days) ===
${notesSummary}

You have the user's full history. Be direct, personal, and specific to their actual data. Reference their habit names, numbers, and trends. Don't be generic. Keep replies concise (2-5 sentences unless they ask for more detail). If they ask about their data, use the numbers above. Encourage but also be honest about gaps.`;

    const fullMessages: MistralMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const reply = await chatCompletion(fullMessages, 600);
    res.json({ message: reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

export default router;
