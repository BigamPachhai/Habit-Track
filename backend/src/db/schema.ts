import { pgTable, text, integer, boolean, timestamp, date } from 'drizzle-orm/pg-core';

export const habits = pgTable('habits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('⭐'),
  dailyTarget: integer('daily_target').notNull().default(1),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
});

export const habitLogs = pgTable('habit_logs', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  completed: boolean('completed').notNull().default(false),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
});

export const dailyNotes = pgTable('daily_notes', {
  id: text('id').primaryKey(),
  date: date('date').notNull().unique(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type HabitLog = typeof habitLogs.$inferSelect;
export type NewHabitLog = typeof habitLogs.$inferInsert;
export type DailyNote = typeof dailyNotes.$inferSelect;
