'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard, Map, Wheat, FlaskConical, Key,
  BookOpen, Sprout, ChevronRight, Leaf, LogOut, User,
  Factory
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/explorer', label: 'API Explorer', icon: FlaskConical },
  { href: '/farms', label: 'Farm Map', icon: Map },
  { href: '/crops', label: 'Crop Tools', icon: Wheat },
  { href: '/environments', label: 'CEA Environments', icon: Factory },
  { href: '/keys', label: 'API Keys', icon: Key },
  { href: '/docs', label: 'Documentation', icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    router.push('/');
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-kulima-600 rounded-xl flex items-center justify-center">
            <Sprout size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">KulimaAPI</h1>
            <p className="text-[11px] text-gray-400 -mt-0.5">Agriculture Intelligence</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-kulima-50 dark:bg-kulima-950 text-kulima-700 dark:text-kulima-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <Icon size={18} className={active ? 'text-kulima-600' : ''} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="text-kulima-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User & Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        {user && (
          <div className="p-3">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="w-8 h-8 rounded-full bg-kulima-100 dark:bg-kulima-900 flex items-center justify-center">
                <User size={14} className="text-kulima-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Sign out"
              >
                <LogOut size={14} className="text-gray-400" />
              </button>
            </div>
          </div>
        )}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Leaf size={12} className="text-kulima-500" />
            <span>Built for Nigerian agriculture</span>
          </div>
          <div className="mt-1 text-[10px] text-gray-300 dark:text-gray-600">v2.0.0 • Phase 2</div>
        </div>
      </div>
    </aside>
  );
}
