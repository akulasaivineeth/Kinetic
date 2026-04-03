'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  {
    href: '/dashboard',
    label: 'DASHBOARD',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14,2 14,8 20,8" />
      </svg>
    ),
  },
  {
    href: '/arena',
    label: 'ARENA',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: '/log',
    label: 'LOG',
    isCenter: true,
    icon: (active: boolean) => (
      <div className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center -mt-4',
        active ? 'emerald-gradient emerald-glow' : 'bg-emerald-500'
      )}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
    ),
  },
  {
    href: '/profile',
    label: 'PROFILE',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-white/5">
      <div className="flex items-center justify-around px-4 py-2 pb-[max(8px,env(safe-area-inset-bottom))] max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 relative min-w-[64px]"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                {item.icon(isActive)}
              </motion.div>
              <span
                className={cn(
                  'text-[10px] font-semibold tracking-wider',
                  isActive ? 'text-emerald-500' : 'text-dark-muted',
                  item.isCenter && '-mt-2'
                )}
              >
                {item.label}
              </span>
              {isActive && !item.isCenter && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-2 w-1 h-1 rounded-full bg-emerald-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
