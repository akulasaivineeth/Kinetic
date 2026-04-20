'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { IcPulse, IcSquads, IcLog, IcProfile } from '@/components/ui/k-icons';

const navItems = [
  { href: '/dashboard', label: 'Pulse', Icon: IcPulse },
  { href: '/arena', label: 'Squads', Icon: IcSquads },
  { href: '/log', label: 'Log', Icon: IcLog, isCenter: true },
  { href: '/profile', label: 'Profile', Icon: IcProfile },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'linear-gradient(to top, rgba(22,28,30,0.96) 70%, rgba(22,28,30,0.9))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-start justify-around px-6 pt-3 pb-[max(7px,env(safe-area-inset-bottom))] max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const { Icon } = item;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="w-[54px] h-[54px] rounded-full flex items-center justify-center -mt-5"
                  style={{
                    background: '#1FB37A',
                    boxShadow: '0 6px 20px rgba(31,179,122,0.35), 0 2px 6px rgba(31,179,122,0.2)',
                    border: '3px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Icon size={26} color="#fff" />
                </motion.div>
                <span className="text-[10px] font-semibold text-white/70 tracking-wide -mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-1 px-2"
            >
              <motion.div whileTap={{ scale: 0.85 }}>
                <Icon
                  size={22}
                  color={isActive ? '#1FB37A' : 'rgba(255,255,255,0.45)'}
                />
              </motion.div>
              <span
                className={cn(
                  'text-[11px]',
                  isActive ? 'font-bold text-[#1FB37A]' : 'font-medium text-white/45'
                )}
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
