'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Apple-inspired bottom tab bar.
 * The Log button is elegantly integrated — no floating FAB.
 * Instead, it uses a subtle pill shape with a dumbbell icon and
 * a gentle emerald accent, matching Apple's Fitness+ aesthetic.
 */

const navItems = [
  {
    href: '/dashboard',
    label: 'Pulse',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        stroke={active ? '#10B981' : '#636366'}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    href: '/arena',
    label: 'Squads',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        stroke={active ? '#10B981' : '#636366'}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/log',
    label: 'Log',
    isCenter: true,
    icon: (active: boolean) => (
      <div className={cn(
        'w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300',
        active
          ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
          : 'bg-emerald-500/15 border border-emerald-500/30'
      )}>
        {/* Dumbbell icon — feels more "fitness" than a generic + */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={active ? '#000' : '#10B981'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 6.5h11" />
          <path d="M6.5 17.5h11" />
          <path d="M12 6.5v11" />
          <rect x="3" y="8" width="3" height="8" rx="1" />
          <rect x="18" y="8" width="3" height="8" rx="1" />
          <rect x="1" y="10" width="2" height="4" rx="0.5" />
          <rect x="21" y="10" width="2" height="4" rx="0.5" />
        </svg>
      </div>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        stroke={active ? '#10B981' : '#636366'}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(18, 18, 20, 0.82)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-[max(6px,env(safe-area-inset-bottom))] max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 relative min-w-[60px]"
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {item.icon(isActive)}
              </motion.div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isActive ? 'text-emerald-500' : 'text-[#636366]',
                  item.isCenter && 'mt-0.5'
                )}
              >
                {item.label}
              </span>
              {isActive && !item.isCenter && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -top-1 w-1 h-1 rounded-full bg-emerald-500"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
