import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { PWAInit } from '@/components/layout/pwa-init';
import { ErrorBoundary } from '@/components/error-boundary';
import { ConnectionGuard } from '@/components/connection-guard';
import { WorkoutDataRealtimeSync } from '@/components/workout-data-realtime-sync';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Kinetic — Performance Arena',
  description: 'Track, compete, and push your limits with Kinetic fitness PWA.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kinetic',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0A',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('kinetic-theme');var d=t!=='light';document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(d?'dark':'light');}catch(e){document.documentElement.classList.add('dark');}`,
          }}
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-dark-bg text-dark-text antialiased min-h-dvh">
        <ThemeProvider>
          <ErrorBoundary>
            <QueryProvider>
              <AuthProvider>
                <ConnectionGuard />
                <WorkoutDataRealtimeSync />
                <PWAInit />
                {children}
              </AuthProvider>
            </QueryProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
