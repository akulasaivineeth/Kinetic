'use client';

import { type ReactNode } from 'react';
import { Header } from './header';
import { BottomNav } from './bottom-nav';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-dark-bg flex flex-col max-w-lg mx-auto relative">
      <Header />
      <main className="flex-1 px-5 pb-24 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
