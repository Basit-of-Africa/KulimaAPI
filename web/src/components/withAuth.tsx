'use client';

import { ComponentType } from 'react';
import { AuthGuard } from './AuthGuard';
import { Sidebar } from './Sidebar';

export function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <WrappedComponent {...props} />
          </main>
        </div>
      </AuthGuard>
    );
  };
}
