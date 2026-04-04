'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications, useMarkNotificationRead } from '@/hooks/use-notifications';
import { useRespondToSharing } from '@/hooks/use-sharing';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { getInitials } from '@/lib/utils';

export function Header() {
  const { profile } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const respondToSharing = useRespondToSharing();
  const { data: leaderboard = [] } = useLeaderboard('week');
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n: { read: boolean }) => !n.read).length;

  // Find current user's rank
  const myRank = leaderboard.findIndex((e: { user_id: string }) => e.user_id === profile?.id) + 1;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSharingResponse = async (
    connectionId: string,
    action: 'accept' | 'accept_mutual' | 'reject',
    notificationId: string
  ) => {
    await respondToSharing.mutateAsync({ connectionId, action });
    await markRead.mutateAsync(notificationId);
  };

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
        {/* Dynamic rank badge */}
        {myRank > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-dark-elevated border border-dark-border">
            <span className="text-emerald-500 text-xs font-bold">#{myRank}</span>
          </div>
        )}

        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-xl bg-dark-elevated border border-dark-border flex items-center justify-center relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
              >
                <span className="text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </motion.div>
            )}
          </button>

          {/* Notification Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto rounded-2xl glass-card-elevated border border-dark-border shadow-2xl z-50"
              >
                <div className="p-4 border-b border-white/5">
                  <p className="text-xs font-bold tracking-wider text-dark-muted uppercase">
                    NOTIFICATIONS
                  </p>
                </div>

                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-dark-muted">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.slice(0, 20).map((notification: {
                      id: string;
                      type: string;
                      title: string;
                      body: string | null;
                      read: boolean;
                      data: Record<string, unknown>;
                      created_at: string;
                    }) => (
                      <div
                        key={notification.id}
                        className={`p-4 ${!notification.read ? 'bg-emerald-500/5' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            !notification.read ? 'bg-emerald-500' : 'bg-dark-border'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-dark-text">
                              {notification.title}
                            </p>
                            {notification.body && (
                              <p className="text-xs text-dark-muted mt-0.5 truncate">
                                {notification.body}
                              </p>
                            )}
                            <p className="text-[10px] text-dark-muted/50 mt-1">
                              {new Date(notification.created_at).toLocaleDateString()}
                            </p>

                            {/* Sharing request: 3-button flow */}
                            {notification.type === 'sharing_request' && !notification.read && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleSharingResponse(
                                    notification.data?.connection_id as string,
                                    'accept',
                                    notification.id
                                  )}
                                  className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 text-[10px] font-bold tracking-wider"
                                >
                                  ACCEPT
                                </button>
                                <button
                                  onClick={() => handleSharingResponse(
                                    notification.data?.connection_id as string,
                                    'accept_mutual',
                                    notification.id
                                  )}
                                  className="flex-1 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-[10px] font-bold tracking-wider"
                                >
                                  ACCEPT & SHARE
                                </button>
                                <button
                                  onClick={() => handleSharingResponse(
                                    notification.data?.connection_id as string,
                                    'reject',
                                    notification.id
                                  )}
                                  className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold tracking-wider"
                                >
                                  ✕
                                </button>
                              </div>
                            )}

                            {/* Whoop workout: tap to navigate to log */}
                            {notification.type === 'whoop_workout' && (
                              <Link
                                href={`/log?activity=${encodeURIComponent(String(notification.data?.activity || ''))}&duration=${notification.data?.duration || ''}&strain=${notification.data?.strain || ''}`}
                                onClick={() => {
                                  if (!notification.read) markRead.mutate(notification.id);
                                  setShowNotifications(false);
                                }}
                                className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 text-[10px] font-bold tracking-wider"
                              >
                                TAP TO LOG →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
