import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import type { AnalyticsData } from '../types';
import { cn } from '../lib/utils';

const CHART_COLORS = {
  primary: '#f97316',
  primaryDark: '#f97316',
  grid: 'rgba(0,0,0,0.05)',
  gridDark: 'rgba(255,255,255,0.05)',
  text: 'rgba(0,0,0,0.4)',
  textDark: 'rgba(255,255,255,0.4)',
};

const HABIT_BAR_COLORS = ['#f97316', '#c2570a', '#6b7280', '#ec4899'];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-dark-800 border border-warm-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-stone-400 dark:text-white/50 text-xs mb-1">{label}</p>
      <p className="text-brand-500 dark:text-brand-400 font-semibold text-sm">{payload[0].value}%</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { stats } = useApp();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats.analytics()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-warm-50 dark:bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const monthlyChartData = Object.entries(data.monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, d]) => ({
      month: month.slice(5),
      rate: d.total > 0 ? Math.round((d.perfect / d.total) * 100) : 0,
      perfect: d.perfect,
    }));

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-dark-950 px-4 py-10 md:py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-stone-900 dark:text-white font-bold text-2xl">Analytics</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mt-1">Your progress over time</p>
        </motion.div>

        {/* Top stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Current streak', value: `${stats?.currentStreak ?? 0}d`, accent: true },
            { label: 'Longest streak', value: `${stats?.longestStreak ?? 0}d`, accent: false },
            { label: 'Perfect months', value: data.perfectMonths.length, accent: false },
            { label: 'Completion rate', value: `${stats?.completionPercentage ?? 0}%`, accent: false },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'rounded-2xl p-4 border',
                s.accent
                  ? 'bg-brand-50 dark:bg-brand-600/15 border-brand-200 dark:border-brand-500/30'
                  : 'bg-white dark:bg-white/5 border-warm-200 dark:border-white/5 shadow-sm dark:shadow-none'
              )}
            >
              <div className={cn('text-2xl font-bold', s.accent ? 'text-brand-500 dark:text-brand-300' : 'text-stone-800 dark:text-white')}>
                {s.value}
              </div>
              <div className="text-stone-400 dark:text-white/40 text-xs mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Weekly completion chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-white/5 border border-warm-200 dark:border-white/5 rounded-2xl p-4 mb-4 shadow-sm dark:shadow-none"
        >
          <h3 className="text-stone-500 dark:text-white/60 text-sm font-medium mb-4">Weekly completion rate</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="week"
                tick={{ fill: CHART_COLORS.text, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fill: CHART_COLORS.text, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="rate"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
                fill="url(#colorRate)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Monthly perfect days chart */}
        {monthlyChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-4"
          >
            <h3 className="text-white/60 text-sm font-medium mb-4">Monthly perfect days</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: CHART_COLORS.text, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: CHART_COLORS.text, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-dark-800 border border-white/10 rounded-xl px-3 py-2">
                        <p className="text-white/50 text-xs mb-1">{label}</p>
                        <p className="text-brand-400 font-semibold text-sm">{payload[0].value} perfect days</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="perfect" radius={[4, 4, 0, 0]}>
                  {monthlyChartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === monthlyChartData.length - 1 ? CHART_COLORS.primary : 'rgba(59,130,246,0.4)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Habit breakdown */}
        {data.habitBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-4"
          >
            <h3 className="text-white/60 text-sm font-medium mb-4">Habit breakdown</h3>
            <ResponsiveContainer width="100%" height={Math.max(data.habitBreakdown.length * 40, 120)}>
              <BarChart
                data={data.habitBreakdown}
                layout="vertical"
                margin={{ top: 0, right: 5, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: CHART_COLORS.text, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-dark-800 border border-white/10 rounded-xl px-3 py-2 shadow-xl">
                        <p className="text-white/50 text-xs mb-1">{label}</p>
                        <p className="text-brand-400 font-semibold text-sm">{payload[0].value} times</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={CHART_COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-3 mb-4"
        >
          {data.mostCompleted && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
              <div className="text-2xl mb-2">{data.mostCompleted.icon}</div>
              <div className="text-white text-sm font-medium truncate">{data.mostCompleted.name}</div>
              <div className="text-white/40 text-xs mt-0.5">Most consistent</div>
              <div className="text-brand-400 text-xs font-medium mt-1">{data.mostCompleted.count} times</div>
            </div>
          )}
          {data.bestMonth && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
              <div className="text-2xl mb-2">🏆</div>
              <div className="text-white text-sm font-medium">
                {new Date(data.bestMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="text-white/40 text-xs mt-0.5">Best month</div>
              <div className="text-brand-400 text-xs font-medium mt-1">
                {data.monthlyData[data.bestMonth]?.perfect} perfect days
              </div>
            </div>
          )}
        </motion.div>

        {/* Perfect months */}
        {data.perfectMonths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/5 border border-white/5 rounded-2xl p-4"
          >
            <h3 className="text-white/60 text-sm font-medium mb-3">🏆 Perfect months</h3>
            <div className="flex flex-wrap gap-2">
              {data.perfectMonths.map((m) => (
                <div key={m} className="bg-brand-600/20 text-brand-300 text-xs font-medium px-3 py-1 rounded-full">
                  {new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
