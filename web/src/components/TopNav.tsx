'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Sprout, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm'
        : 'bg-transparent',
    )}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            scrolled ? 'bg-kulima-600' : 'bg-white/20',
          )}>
            <Sprout size={18} className="text-white" />
          </div>
          <span className={cn(
            'text-lg font-bold transition-colors',
            scrolled ? 'text-gray-900 dark:text-white' : 'text-white',
          )}>
            KulimaAPI
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { href: '#features', label: 'Features' },
            { href: '/docs', label: 'Docs' },
            { href: '/auth/signin', label: 'API Explorer' },
          ].map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                scrolled
                  ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  : 'text-white/80 hover:text-white hover:bg-white/10',
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/signin"
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              scrolled
                ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                : 'text-white/80 hover:text-white',
            )}
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 bg-kulima-600 text-white rounded-lg text-sm font-semibold hover:bg-kulima-700 transition-colors shadow-sm"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn(
            'md:hidden p-2 rounded-lg transition-colors',
            scrolled
              ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              : 'text-white hover:bg-white/10',
          )}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="px-6 py-4 space-y-1">
            {[
              { href: '#features', label: 'Features' },
              { href: '/docs', label: 'Docs' },
              { href: '/auth/signin', label: 'API Explorer' },
            ].map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800 mt-2 flex gap-3">
              <Link
                href="/auth/signin"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-kulima-600 text-white hover:bg-kulima-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
