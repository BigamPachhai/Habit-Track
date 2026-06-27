import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function today(): string {
  return formatDate(new Date());
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

const MOTIVATIONAL_MESSAGES = [
  "Don't break the chain.",
  "One blue day at a time.",
  "Future you is counting on today's effort.",
  "Discipline is the bridge between goals and accomplishment.",
  "Small steps. Consistent progress. Big results.",
  "Show up. Every single day.",
  "The only bad workout is the one that didn't happen.",
  "You are what you repeatedly do.",
  "Excellence is not a destination but a continuous journey.",
  "Every day you complete your habits, you become the person you want to be.",
  "Consistency beats intensity every time.",
  "The secret is starting. Then not stopping.",
];

export function getMotivationalMessage(streak: number, longestStreak: number): string {
  if (streak === 0) return "Start your streak today. Day one begins now.";
  if (streak >= longestStreak && streak > 0 && longestStreak > 0) {
    return `Day ${streak}. You're making history. This is your longest streak ever.`;
  }
  if (longestStreak - streak <= 3 && longestStreak > 0) {
    return `Only ${longestStreak - streak} day${longestStreak - streak !== 1 ? 's' : ''} until your longest streak. Don't stop now.`;
  }
  if (streak === 1) return "Day 1. The hardest part is starting. You did it.";
  if (streak === 7) return "One week strong. You're building something real.";
  if (streak === 14) return "Two weeks. Habits are forming. Keep going.";
  if (streak === 21) return "21 days. This is becoming who you are.";
  return `Day ${streak}. ${MOTIVATIONAL_MESSAGES[streak % MOTIVATIONAL_MESSAGES.length]}`;
}

export const MILESTONE_DAYS = [7, 30, 50, 100, 365, 500, 1000];

export function getNextMilestone(streak: number): number {
  return MILESTONE_DAYS.find((m) => m > streak) || 1000;
}

export function isMilestone(streak: number): boolean {
  return MILESTONE_DAYS.includes(streak);
}

export function formatMonth(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}
