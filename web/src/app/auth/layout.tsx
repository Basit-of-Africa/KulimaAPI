import type { Metadata } from 'next';
import '../globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'KulimaAPI — Sign In',
  description: 'Sign in to KulimaAPI Agriculture Intelligence Platform.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950 antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
