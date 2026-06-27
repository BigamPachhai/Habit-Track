import { Router } from 'express';

const router = Router();

router.get('/', async (_req, res) => {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'MISTRAL_API_KEY not configured' });
    return;
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        max_tokens: 80,
        temperature: 0.9,
        messages: [
          {
            role: 'user',
            content:
              'Give me one short, punchy life rule for someone in their 20s trying to build good habits. ' +
              'Reply with JSON only, no markdown, in this exact format: {"emoji":"<one emoji>","rule":"<the rule>"}. ' +
              'The rule must be under 15 words and motivational.',
          },
        ],
      }),
    });

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = (data.choices?.[0]?.message?.content?.trim() ?? '')
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(text) as { emoji: string; rule: string };
    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tip from Mistral' });
  }
});

export default router;
