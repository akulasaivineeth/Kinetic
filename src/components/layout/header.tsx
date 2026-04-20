'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { useRespondToSharing } from '@/hooks/use-sharing';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { getInitials } from '@/lib/utils';

export function Header() {
  const { profile } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
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
      <div className="flex items-center gap-2.5">
        <Link
          href="/profile"
          className="flex-shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          aria-label="Profile"
        >
          <div className="w-9 h-9 rounded-full border-2 border-[#1FB37A] overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg,#5D7B8C 0%,#8FA6B3 45%,#C9D5DC 100%)' }}>
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="" width={36} height={36} className="object-cover w-full h-full" />
            ) : (
              <svg width="36" height="36" viewBox="0 0 36 36" className="absolute inset-0">
                <path d="M0 22l8-9 6 6 4-4 6 7 12-6v20H0z" fill="#3A5566" opacity="0.8"/>
                <path d="M0 28l10-6 8 4 6-3 12 5v8H0z" fill="#1E3340"/>
              </svg>
            )}
          </div>
        </Link>
        <Link href="/dashboard" className="min-w-0">
          <h1 className="font-display text-xl tracking-tight text-k-ink">KINETIC</h1>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {myRank > 0 && (
          <div className="px-3 py-1.5 rounded-k-pill border border-k-line-strong bg-k-card shadow-k-card text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
            #{myRank}
          </div>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            aria-label="Open notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-k-pill border border-k-line-strong bg-k-card shadow-k-card flex items-center justify-center relative"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-k-ink">
              <path d="M6 16V10a6 6 0 0112 0v6l1.5 2h-15L6 16z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              <path d="M10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-[#E25C5C] flex items-center justify-center px-1"
              >
                <span className="text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </motion.div>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onClose={() => setShowNotifications(false)}
                markAllRead={markAllRead}
                markRead={markRead}
                respondToSharing={handleSharingResponse}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

// Sub-component to manage the dropdown's complex state cleanly without polluting the Header
import {
  useClearNotifications,
  useClearAllNotifications,
  useMarkMultipleNotificationsRead
} from '@/hooks/use-notifications';

function NotificationDropdown({
  notifications,
  unreadCount,
  onClose,
  markAllRead,
  markRead,
  respondToSharing
}: {
  notifications: any[];
  unreadCount: number;
  onClose: () => void;
  markAllRead: any;
  markRead: any;
  respondToSharing: (connId: string, action: any, notifId: string) => void;
}) {
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const clearMultiple = useClearNotifications();
  const clearAll = useClearAllNotifications();
  const markMultipleRead = useMarkMultipleNotificationsRead();

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const handleClearSelected = async () => {
    if (selectedIds.size === 0) return;
    await clearMultiple.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    if (notifications.length === selectedIds.size) {
      setManageMode(false);
    }
  };

  const handleMarkSelectedRead = async () => {
    if (selectedIds.size === 0) return;
    await markMultipleRead.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleClearAll = async () => {
    await clearAll.mutateAsync();
    setManageMode(false);
    setSelectedIds(new Set());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute right-0 top-12 w-80 sm:w-96 max-h-[28rem] overflow-hidden flex flex-col rounded-2xl glass-card-elevated border border-dark-border shadow-2xl z-50 pt-2"
    >
      <div className="px-4 pb-2 border-b border-white/5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold tracking-wider text-dark-text uppercase flex items-center gap-2">
            NOTIFICATIONS
            {notifications.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-dark-muted">
                {notifications.length}
              </span>
            )}
          </p>
          {notifications.length > 0 && (
            <button
              onClick={() => {
                setManageMode(!manageMode);
                setSelectedIds(new Set());
              }}
              className="text-[10px] font-bold tracking-wider text-dark-muted hover:text-white transition-colors uppercase"
            >
              {manageMode ? 'DONE' : 'MANAGE'}
            </button>
          )}
        </div>
        
        {manageMode && (
          <div className="flex items-center justify-between pt-1 pb-1">
            <button
              onClick={handleSelectAll}
              className="text-[10px] font-bold text-dark-muted hover:text-white transition-colors"
            >
              {selectedIds.size === notifications.length ? 'DESELECT ALL' : 'SELECT ALL'}
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleMarkSelectedRead}
                disabled={selectedIds.size === 0}
                className="text-[10px] font-bold text-emerald-500 disabled:opacity-30 disabled:text-dark-muted transition-colors"
              >
                READ SELECTED
              </button>
              <button
                onClick={handleClearSelected}
                disabled={selectedIds.size === 0}
                className="text-[10px] font-bold text-red-400 disabled:opacity-30 disabled:text-dark-muted transition-colors"
              >
                CLEAR SELECTED
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-y-auto flex-1 min-h-24">
        {notifications.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border border-dark-border flex items-center justify-center opacity-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-dark-muted" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="text-xs text-dark-muted font-medium">All caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 transition-colors ${
                  !notification.read ? 'bg-emerald-500/5' : ''
                } ${manageMode && selectedIds.has(notification.id) ? 'bg-white/5' : ''}`}
                onClick={() => {
                  if (manageMode) toggleSelect(notification.id);
                }}
              >
                <div className="flex items-start gap-3">
                  {manageMode ? (
                    <div className="mt-1 flex-shrink-0">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectedIds.has(notification.id) 
                          ? 'bg-emerald-500 border-emerald-500 text-black' 
                          : 'border-dark-muted/50'
                      }`}>
                        {selectedIds.has(notification.id) && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      !notification.read ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-dark-border'
                    }`} />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark-text tracking-tight">
                      {notification.title}
                    </p>
                    {notification.body && (
                      <p className="text-xs text-dark-muted mt-0.5 line-clamp-2 leading-relaxed">
                        {notification.body}
                      </p>
                    )}
                    <p className="text-[10px] text-dark-muted/40 mt-1.5 font-medium tracking-wider uppercase">
                      {new Date(notification.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                      })}
                    </p>

                    {/* Sharing request actions */}
                    {notification.type === 'sharing_request' && !notification.read && !manageMode && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            respondToSharing(notification.data?.connection_id as string, 'accept', notification.id);
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 text-[10px] font-bold tracking-wider"
                        >
                          ACCEPT
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            respondToSharing(notification.data?.connection_id as string, 'accept_mutual', notification.id);
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider"
                        >
                          SHARE MUTUAL
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            respondToSharing(notification.data?.connection_id as string, 'reject', notification.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold tracking-wider"
                        >
                          REJECT
                        </button>
                      </div>
                    )}

                    {/* Whoop workout actions */}
                    {notification.type === 'whoop_workout' && !manageMode && (
                      <Link
                        href={`/log?activity=${encodeURIComponent(String(notification.data?.activity || ''))}&duration=${notification.data?.duration || ''}&strain=${notification.data?.strain || ''}`}
                        onClick={() => {
                          if (!notification.read) markRead.mutate(notification.id);
                          onClose();
                        }}
                        className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 text-[10px] font-bold tracking-wider hover:bg-emerald-500/25 transition-colors"
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
      </div>
      
      {/* Footer Bulk Actions */}
      {!manageMode && notifications.length > 0 && (
        <div className="p-2 border-t border-white/5 flex gap-2 bg-dark-background/50">
          <button
            onClick={() => handleClearAll()}
            className="flex-1 py-2 text-[10px] font-bold tracking-widest text-dark-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            CLEAR ALL
          </button>
          <button
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0}
            className="flex-1 py-2 text-[10px] font-bold tracking-widest text-dark-text disabled:opacity-30 hover:bg-white/5 rounded-lg transition-colors"
          >
            READ ALL
          </button>
        </div>
      )}
    </motion.div>
  );
}
