'use client';

import Image from 'next/image';
import { useAuth } from '@/providers/auth-provider';
import { getInitials } from '@/lib/utils';

export function Header() {
  const { profile } = useAuth();

  return (
    <header className="flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3">
      <div className="flex items-center gap-3">
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt="Avatar"
            width={36}
            height={36}
            className="rounded-full border-2 border-emerald-500/30"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-dark-elevated flex items-center justify-center text-xs font-bold text-emerald-500 border-2 border-emerald-500/30">
            {getInitials(profile?.full_name || 'U')}
          </div>
        )}
        <h1 className="text-xl font-black tracking-tight italic">KINETIC</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-dark-elevated border border-dark-border">
          <span className="text-emerald-500 text-xs font-bold">#2</span>
        </div>
        {profile?.avatar_url && (
          <Image
            src={profile.avatar_url}
            alt="Avatar"
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
      </div>
    </header>
  );
}
