import { Router } from 'express';
import { db } from '../db';
import { habits, habitLogs } from '../db/schema';
import { eq, gte, asc } from 'drizzle-orm';

const router = Router();

function getMistralKey(req: import('express').Request): string {
  const key = (req.headers['x-mistral-key'] as string) || process.env.MISTRAL_API_KEY || '';
  if (!key) throw new Error('Mistral API key not configured');
  return key;
}

async function callMistral(apiKey: string, messages: { role: string; content: string }[]) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages,
      max_tokens: 800,
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mistral API error: ${err}`);
  }
  const data = (await response.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

async function buildHabitContext() {
  const allHabits = await db.select().from(habits).where(eq(habits.isActive, true));
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];

  const logs = await db
    .select()
    .from(habitLogs)
    .where(gte(habitLogs.date, startDate))
    .orderBy(asc(habitLogs.date));

  const logsByHabit: Record<string, { date: string; completed: boolean }[]> = {};
  for (const log of logs) {
    if (!logsByHabit[log.habitId]) logsByHabit[log.habitId] = [];
    logsByHabit[log.habitId].push({ date: log.date, completed: log.completed });
  }

  const habitSummaries = allHabits.map((h) => {
    const hLogs = logsByHabit[h.id] || [];
    const completed = hLogs.filter((l) => l.completed).length;
    const rate = hLogs.length > 0 ? Math.round((completed / hLogs.length) * 100) : 0;
    return `- ${h.icon} ${h.name}: ${completed}/${hLogs.length} days completed (${rate}% rate)`;
  });

  return habitSummaries.join('\n');
}

router.post('/weekly-summary', async (req, res) => {
  try {
    const apiKey = getMistralKey(req);
    const context = await buildHabitContext();
    const message = await callMistral(apiKey, [
      {
        role: 'system',
        content:
          'You are a personal habit coach. Give concise, motivating insights. Keep responses under 200 words. Use bullet points. Focus on patterns, wins, and one actionable improvement.',
      },
      {
        role: 'user',
        content: `Here is my habit tracking data for the last 30 days:\n\n${context}\n\nGenerate a weekly summary with: key wins, areas to improve, and one specific action tip for next week.`,
      },
    ]);
    res.json({ message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    res.status(500).json({ error: message });
  }
});

router.post('/monthly-review', async (req, res) => {
  try {
    const apiKey = getMistralKey(req);
    const context = await buildHabitContext();
    const message = await callMistral(apiKey, [
      {
        role: 'system',
        content:
          'You are a personal habit coach. Give a monthly review that feels like a friend who genuinely cares. Keep it under 250 words. Celebrate wins, identify patterns, suggest improvements.',
      },
      {
        role: 'user',
        content: `Here is my habit tracking data:\n\n${context}\n\nGenerate a monthly review with: overall score (1-10), biggest win, biggest challenge, detected patterns, and three specific goals for next month.`,
      },
    ]);
    res.json({ message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    res.status(500).json({ error: message });
  }
});

router.post('/daily-motivation', async (req, res) => {
  try {
    const apiKey = getMistralKey(req);
    const { currentStreak, longestStreak } = req.body as {
      currentStreak: number;
      longestStreak: number;
    };
    const context = await buildHabitContext();
    const message = await callMistral(apiKey, [
      {
        role: 'system',
        content:
          "You are a personal habit coach. Give ONE short, powerful motivational message (2-3 sentences max). Make it specific to the user's data. Sound human, not robotic.",
      },
      {
        role: 'user',
        content: `Current streak: ${currentStreak} days. Longest streak: ${longestStreak} days.\n\nHabit data:\n${context}\n\nGive me a short, powerful message for today.`,
      },
    ]);
    res.json({ message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    res.status(500).json({ error: message });
  }
});

router.post('/streak-risk', async (req, res) => {
  try {
    const apiKey = getMistralKey(req);
    const context = await buildHabitContext();
    const message = await callMistral(apiKey, [
      {
        role: 'system',
        content:
          'You are a personal habit coach analyzing streak risk. Keep it under 150 words. Be direct and specific.',
      },
      {
        role: 'user',
        content: `Analyze my habit data and tell me: which habits are at risk of breaking my streak, what patterns do you see that might cause me to fail, and what should I do TODAY to protect my streak.\n\nHabit data:\n${context}`,
      },
    ]);
    res.json({ message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    res.status(500).json({ error: message });
  }
});

router.post('/twenties-suggestions', async (req, res) => {
  try {
    const apiKey = getMistralKey(req);
    const context = await buildHabitContext();
    const message = await callMistral(apiKey, [
      {
        role: 'system',
        content:
          'You are a no-nonsense coach for people in their 20s. Give exactly 5 strict, blunt, actionable daily habit improvements. No fluff. No encouragement. Each tip is one sentence. Focus on: sleep, exercise, money, learning, and cutting time-wasters. Format: numbered list only.',
      },
      {
        role: 'user',
        content: `My current habit data:\n${context}\n\nGive me 5 strict improvements for my daily life in my 20s. Be direct. No padding.`,
      },
    ]);
    res.json({ message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    res.status(500).json({ error: message });
  }
});

export default router;
