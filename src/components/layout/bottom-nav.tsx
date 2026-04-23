'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { IcPulse, IcSquads, IcLog, IcProfile } from '@/components/ui/k-icons';

const navItems = [
  { href: '/dashboard', label: 'Pulse', Icon: IcPulse },
  { href: '/squads', label: 'Squads', Icon: IcSquads },
  { href: '/log', label: 'Log', Icon: IcLog, isCenter: true },
  { href: '/profile', label: 'Profile', Icon: IcProfile },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-k-line/80 dark:border-white/[0.06]"
      style={{
        background: 'var(--nav-bottom-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-start justify-around px-6 pt-3 pb-[max(7px,env(safe-area-inset-bottom))] max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/squads'
              ? pathname === '/squads' || pathname.startsWith('/squads/')
              : pathname === item.href;
          const { Icon } = item;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-1 px-2 group"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors duration-200",
                  isActive && "bg-[#1FB37A15]"
                )}
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="flex items-center justify-center"
                >
                  <Icon
                    size={22}
                    color={isActive ? '#1FB37A' : 'var(--nav-inactive-icon)'}
                  />
                </motion.div>
              </div>
              <span
                className={cn(
                  'text-[10px] tracking-tight',
                  isActive ? 'font-bold text-[#1FB37A]' : 'font-medium'
                )}
                style={!isActive ? { color: 'var(--nav-inactive-label)' } : undefined}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
