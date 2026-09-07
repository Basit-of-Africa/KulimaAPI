import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KulimaAPI — Sign In',
  description: 'Sign in to KulimaAPI Agriculture Intelligence Platform.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
