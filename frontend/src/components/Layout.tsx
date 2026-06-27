import { NavLink, Outlet } from 'react-router-dom';
import { Calendar, BarChart2, Sparkles, Home } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/coach', icon: Sparkles, label: 'Coach' },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-warm-50 dark:bg-[#0d1117] text-stone-900 dark:text-[#e6edf3] flex flex-col">
      <main className="flex-1 pb-20 md:pb-0 md:pl-20">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md border-t border-warm-200 dark:border-white/[0.07] md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200',
                  isActive
                    ? 'text-brand-500 dark:text-brand-400'
                    : 'text-stone-400 dark:text-[#8b949e] hover:text-stone-700 dark:hover:text-[#c9d1d9]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Desktop side nav */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-white/90 dark:bg-[#161b22] backdrop-blur-md border-r border-warm-200 dark:border-white/[0.07] flex-col items-center py-6 gap-2 z-50">
        <div className="mb-6">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <span className="text-lg">🔥</span>
          </div>
        </div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 w-16 py-3 rounded-2xl transition-all duration-200',
                isActive
                  ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-400'
                  : 'text-stone-400 dark:text-[#8b949e] hover:text-stone-700 dark:hover:text-[#c9d1d9] hover:bg-warm-100 dark:hover:bg-white/[0.05]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
