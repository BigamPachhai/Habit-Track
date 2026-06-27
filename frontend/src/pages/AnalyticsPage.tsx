import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
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

        {/* Monthly perfect days — pill capsule style */}
        {monthlyChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-white/5 border border-warm-200 dark:border-white/5 rounded-2xl p-4 mb-4 shadow-sm dark:shadow-none"
          >
            <h3 className="text-stone-500 dark:text-white/60 text-sm font-medium mb-5">Monthly perfect days</h3>
            <div className="flex items-end gap-2 h-32">
              {monthlyChartData.map((d, i) => {
                const max = Math.max(...monthlyChartData.map((x) => x.perfect), 1);
                const heightPct = Math.max((d.perfect / max) * 100, 8);
                const isLast = i === monthlyChartData.length - 1;
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[9px] text-stone-400 dark:text-white/40 font-medium">{d.perfect || ''}</span>
                    <div className="w-full relative flex items-end" style={{ height: '96px' }}>
                      <div
                        className="w-full rounded-full transition-all duration-500"
                        style={{
                          height: `${heightPct}%`,
                          background: isLast
                            ? 'linear-gradient(to top, #ea6c0a, #f97316)'
                            : 'rgba(249,115,22,0.25)',
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-stone-300 dark:text-white/30">{d.month}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Habit breakdown — pill bars */}
        {data.habitBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-white/5 border border-warm-200 dark:border-white/5 rounded-2xl p-4 mb-4 shadow-sm dark:shadow-none"
          >
            <h3 className="text-stone-500 dark:text-white/60 text-sm font-medium mb-4">Habit breakdown</h3>
            <div className="space-y-3">
              {(() => {
                const maxCount = Math.max(...data.habitBreakdown.map((h) => h.count), 1);
                return data.habitBreakdown.map((h, i) => (
                  <div key={h.name} className="flex items-center gap-3">
                    <div className="w-6 text-center text-base flex-shrink-0">{h.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-stone-700 dark:text-white/80 text-xs font-medium truncate">{h.name}</span>
                        <span className="text-stone-400 dark:text-white/40 text-xs ml-2 flex-shrink-0">{Math.round((h.count / maxCount) * 100)}%</span>
                      </div>
                      <div className="h-2.5 bg-warm-100 dark:bg-white/8 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(h.count / maxCount) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                          className="h-full rounded-full"
                          style={{ background: HABIT_BAR_COLORS[i % HABIT_BAR_COLORS.length] }}
                        />
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
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
            <div className="bg-white dark:bg-white/5 border border-warm-200 dark:border-white/5 rounded-2xl p-4 shadow-sm dark:shadow-none">
              <div className="text-2xl mb-2">{data.mostCompleted.icon}</div>
              <div className="text-stone-800 dark:text-white text-sm font-medium truncate">{data.mostCompleted.name}</div>
              <div className="text-stone-400 dark:text-white/40 text-xs mt-0.5">Most consistent</div>
              <div className="text-brand-500 dark:text-brand-400 text-xs font-medium mt-1">{data.mostCompleted.count} times</div>
            </div>
          )}
          {data.bestMonth && (
            <div className="bg-white dark:bg-white/5 border border-warm-200 dark:border-white/5 rounded-2xl p-4 shadow-sm dark:shadow-none">
              <div className="text-2xl mb-2">🏆</div>
              <div className="text-stone-800 dark:text-white text-sm font-medium">
                {new Date(data.bestMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="text-stone-400 dark:text-white/40 text-xs mt-0.5">Best month</div>
              <div className="text-brand-500 dark:text-brand-400 text-xs font-medium mt-1">
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
            className="bg-white dark:bg-white/5 border border-warm-200 dark:border-white/5 rounded-2xl p-4 shadow-sm dark:shadow-none"
          >
            <h3 className="text-stone-500 dark:text-white/60 text-sm font-medium mb-3">🏆 Perfect months</h3>
            <div className="flex flex-wrap gap-2">
              {data.perfectMonths.map((m) => (
                <div key={m} className="bg-brand-100 dark:bg-brand-600/20 text-brand-600 dark:text-brand-300 text-xs font-medium px-3 py-1 rounded-full">
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
