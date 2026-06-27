import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Running migrations...');

  await sql`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '⭐',
      daily_target INTEGER NOT NULL DEFAULT 1,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at TIMESTAMP,
      notes TEXT,
      UNIQUE(habit_id, date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_notes (
      id TEXT PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  console.log('Migrations complete!');
}

migrate().catch(console.error);
