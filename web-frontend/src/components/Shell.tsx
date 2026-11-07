import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sun, AlertTriangle, Sparkles, Sprout, MapPin, Leaf } from 'lucide-react';
import { useAuth } from '../lib/auth';

const TABS = [
  { to: '/', label: 'Today', icon: Sun, end: true },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/advisor', label: 'Advisor', icon: Sparkles },
  { to: '/planting', label: 'Planting', icon: Sprout },
  { to: '/farms', label: 'Farms', icon: MapPin },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const { pathname } = useLocation();
  const hideNav = pathname === '/auth';

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-leaf-600 rounded-lg flex items-center justify-center">
            <Leaf size={17} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Kulima</p>
            <p className="text-[10px] text-gray-400 -mt-0.5">Farm advice for Nigeria</p>
          </div>
        </div>
        <NavLink
          to="/auth"
          className="text-xs font-medium text-leaf-700 bg-leaf-50 border border-leaf-100 px-2.5 py-1.5 rounded-lg"
        >
          {account ? account.name : 'Sign in'}
        </NavLink>
      </header>

      <main className="flex-1 px-4 py-4 pb-20">{children}</main>

      {!hideNav && (
        <nav className="fixed bottom-0 inset-x-0 z-10 bg-white border-t border-gray-200 flex justify-around pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 px-2 min-w-[60px] text-[10px] font-medium ${
                  isActive ? 'text-leaf-700' : 'text-gray-400'
                }`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
