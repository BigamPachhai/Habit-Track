import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

import habitsRouter from './routes/habits';
import logsRouter from './routes/logs';
import statsRouter from './routes/stats';
import tipRouter from './routes/tip';

async function ensureTables() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT NOT NULL DEFAULT '⭐',
    daily_target INTEGER NOT NULL DEFAULT 1, "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), is_active BOOLEAN NOT NULL DEFAULT TRUE
  )`;
  await sql`CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY, habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date DATE NOT NULL, completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP, notes TEXT, UNIQUE(habit_id, date)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS daily_notes (
    id TEXT PRIMARY KEY, date DATE NOT NULL UNIQUE,
    notes TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`;
}

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

app.use('/api/habits', habitsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/tip', tipRouter);
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;

ensureTables()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database tables:', err);
    process.exit(1);
  });
