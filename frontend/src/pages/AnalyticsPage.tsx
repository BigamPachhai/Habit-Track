import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Flame, Calendar, Award } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import type { AnalyticsData } from '../types';

function AreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#161b22] border border-warm-200 dark:border-white/[0.07] rounded-xl px-3 py-2 shadow-lg">
      <p className="text-stone-400 dark:text-white/40 text-[11px] mb-0.5">{label}</p>
      <p className="text-stone-900 dark:text-white font-semibold text-sm">{payload[0].value}%</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { stats } = useApp();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats.analytics().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-warm-50 dark:bg-[#0d1117] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const monthlyChartData = Object.entries(data.monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, d]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      rate: d.total > 0 ? Math.round((d.perfect / d.total) * 100) : 0,
      perfect: d.perfect,
      total: d.total,
    }));

  const maxPerfect = Math.max(...monthlyChartData.map((d) => d.perfect), 1);
  const currentStreak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;
  const completionRate = stats?.completionPercentage ?? 0;
  const maxHabit = Math.max(...data.habitBreakdown.map((h) => h.count), 1);

  // Trend: compare last 4 weeks vs previous 4 weeks
  const recentWeeks = data.weeklyData.slice(-4);
  const prevWeeks = data.weeklyData.slice(-8, -4);
  const recentAvg = recentWeeks.length ? Math.round(recentWeeks.reduce((a, w) => a + w.rate, 0) / recentWeeks.length) : 0;
  const prevAvg = prevWeeks.length ? Math.round(prevWeeks.reduce((a, w) => a + w.rate, 0) / prevWeeks.length) : 0;
  const trendDelta = recentAvg - prevAvg;

  // card surface: white in light, a clearly elevated dark surface in dark mode
  const card = 'bg-white dark:bg-[#161b22] border border-warm-200 dark:border-white/[0.07] shadow-sm dark:shadow-none';

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-[#0d1117]">
      <div className="max-w-lg mx-auto px-4 py-10 md:py-8 space-y-4">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-stone-900 dark:text-[#e6edf3] font-bold text-2xl tracking-tight">Analytics</h1>
          <p className="text-stone-400 dark:text-[#8b949e] text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </motion.div>

        {/* KPI row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Current streak — accent */}
          <div className="bg-brand-500 rounded-3xl p-4 shadow-lg shadow-brand-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={13} className="text-white/60" />
              <span className="text-white/60 text-xs font-medium">Current streak</span>
            </div>
            <div className="text-white font-black text-4xl leading-none">{currentStreak}</div>
            <div className="text-white/50 text-xs mt-1.5">days</div>
          </div>

          {/* Completion rate */}
          <div className={`${card} rounded-3xl p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={13} className="text-stone-400 dark:text-[#8b949e]" />
              <span className="text-stone-400 dark:text-[#8b949e] text-xs font-medium">Completion</span>
            </div>
            <div className="text-stone-900 dark:text-[#e6edf3] font-black text-4xl leading-none">
              {completionRate}<span className="text-xl font-bold text-stone-300 dark:text-[#484f58]">%</span>
            </div>
            <div className="text-stone-400 dark:text-[#8b949e] text-xs mt-1.5">all-time rate</div>
          </div>

          {/* Best streak */}
          <div className={`${card} rounded-3xl p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Award size={13} className="text-stone-400 dark:text-[#8b949e]" />
              <span className="text-stone-400 dark:text-[#8b949e] text-xs font-medium">Best streak</span>
            </div>
            <div className="text-stone-900 dark:text-[#e6edf3] font-black text-4xl leading-none">
              {longestStreak}<span className="text-xl font-bold text-stone-300 dark:text-[#484f58]">d</span>
            </div>
            <div className="text-stone-400 dark:text-[#8b949e] text-xs mt-1.5">personal best</div>
          </div>

          {/* Perfect months */}
          <div className={`${card} rounded-3xl p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={13} className="text-stone-400 dark:text-[#8b949e]" />
              <span className="text-stone-400 dark:text-[#8b949e] text-xs font-medium">Perfect months</span>
            </div>
            <div className="text-stone-900 dark:text-[#e6edf3] font-black text-4xl leading-none">
              {data.perfectMonths.length}
            </div>
            <div className="text-stone-400 dark:text-[#8b949e] text-xs mt-1.5">months completed</div>
          </div>
        </motion.div>

        {/* Weekly trend chart */}
        {data.weeklyData.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`${card} rounded-3xl p-5`}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-stone-800 dark:text-[#e6edf3] font-semibold text-sm">Weekly completion</h3>
                <p className="text-stone-400 dark:text-[#8b949e] text-xs mt-0.5">Last {data.weeklyData.length} weeks</p>
              </div>
              {prevWeeks.length > 0 && (
                <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  trendDelta >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-50 dark:bg-red-500/[0.12] text-red-500 dark:text-red-400'
                }`}>
                  <span>{trendDelta >= 0 ? '↑' : '↓'}</span>
                  <span>{Math.abs(trendDelta)}%</span>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={data.weeklyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#8b949e', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(data.weeklyData.length / 5)}
                />
                <Tooltip content={<AreaTooltip />} cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#areaGrad)"
                  dot={false}
                  activeDot={{ r: 3.5, fill: '#f97316', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Monthly capsule bars */}
        {monthlyChartData.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`${card} rounded-3xl p-5`}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-stone-800 dark:text-[#e6edf3] font-semibold text-sm">Perfect days by month</h3>
                <p className="text-stone-400 dark:text-[#8b949e] text-xs mt-0.5">Days all habits were completed</p>
              </div>
              {data.bestMonth && (
                <span className="text-[11px] text-stone-300 dark:text-[#484f58] font-medium">
                  Best: {new Date(data.bestMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </span>
              )}
            </div>

            <div className="flex items-end gap-1.5" style={{ height: '88px' }}>
              {monthlyChartData.map((d, i) => {
                const heightPct = Math.max((d.perfect / maxPerfect) * 100, 4);
                const isLatest = i === monthlyChartData.length - 1;
                const isBest = d.perfect === maxPerfect && maxPerfect > 0;
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5" style={{ height: '100%' }}>
                    <div className="flex-1 w-full flex items-end">
                      <motion.div
                        className="w-full rounded-full"
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.5, delay: 0.2 + i * 0.03, ease: 'easeOut' }}
                        style={{
                          background: isLatest || isBest ? 'linear-gradient(to top, #ea6c0a, #fb923c)' : undefined,
                          backgroundColor: !isLatest && !isBest ? 'rgba(249,115,22,0.18)' : undefined,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-stone-300 dark:text-[#484f58] font-medium leading-none">
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Habit consistency */}
        {data.habitBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${card} rounded-3xl p-5`}
          >
            <div className="mb-5">
              <h3 className="text-stone-800 dark:text-[#e6edf3] font-semibold text-sm">Habit consistency</h3>
              <p className="text-stone-400 dark:text-[#8b949e] text-xs mt-0.5">Total completions all time</p>
            </div>
            <div className="space-y-4">
              {data.habitBreakdown.map((h, i) => {
                const pct = Math.round((h.count / maxHabit) * 100);
                return (
                  <div key={h.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm flex-shrink-0">{h.icon}</span>
                        <span className="text-stone-700 dark:text-[#c9d1d9] text-xs font-medium truncate">{h.name}</span>
                      </div>
                      <span className="text-stone-400 dark:text-[#8b949e] text-xs ml-3 flex-shrink-0">{h.count}×</span>
                    </div>
                    <div className="h-1.5 bg-warm-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-brand-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.25 + i * 0.06, ease: 'easeOut' }}
                        style={{ opacity: 0.4 + (pct / 100) * 0.6 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Most consistent highlight */}
        {data.mostCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`${card} rounded-3xl p-5 flex items-center gap-4`}
          >
            <div className="text-3xl flex-shrink-0">{data.mostCompleted.icon}</div>
            <div className="min-w-0">
              <div className="text-[10px] text-stone-400 dark:text-[#8b949e] font-medium uppercase tracking-widest mb-1">Most consistent habit</div>
              <div className="text-stone-800 dark:text-[#e6edf3] text-sm font-semibold truncate">{data.mostCompleted.name}</div>
              <div className="text-brand-500 dark:text-brand-400 text-xs font-medium mt-0.5">{data.mostCompleted.count} completions</div>
            </div>
          </motion.div>
        )}

        {/* Perfect months */}
        {data.perfectMonths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`${card} rounded-3xl p-5`}
          >
            <h3 className="text-stone-800 dark:text-[#e6edf3] font-semibold text-sm mb-3">Perfect months</h3>
            <div className="flex flex-wrap gap-2">
              {data.perfectMonths.map((m) => (
                <span key={m} className="bg-brand-50 dark:bg-brand-500/[0.1] text-brand-600 dark:text-brand-400 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-100 dark:border-brand-500/[0.2]">
                  {new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
