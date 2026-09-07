'use client';

import { ComponentType } from 'react';
import { AuthGuard } from './AuthGuard';
import { Sidebar } from './Sidebar';

export function withAuth<T>(WrappedComponent: ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
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
