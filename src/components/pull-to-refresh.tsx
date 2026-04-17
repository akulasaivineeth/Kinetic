'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

const THRESHOLD = 80;
const MAX_PULL = 200;

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const pullDistance = useMotionValue(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const refreshingRef = useRef(false);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  refreshingRef.current = refreshing;

  const dampedPull = useTransform(pullDistance, (v) => {
    if (v <= 0) return 0;
    const progress = Math.min(v / MAX_PULL, 1);
    return v * (1 - progress * 0.55);
  });

  const indicatorOpacity = useTransform(dampedPull, [0, 20, THRESHOLD * 0.6], [0, 0.4, 1]);
  const indicatorScale = useTransform(dampedPull, [0, THRESHOLD * 0.4, THRESHOLD], [0.3, 0.7, 1]);
  const indicatorRotation = useTransform(pullDistance, [0, THRESHOLD * 2], [0, 540]);
  const indicatorY = useTransform(dampedPull, (v) => v / 2 - 14);

  useEffect(() => {
    const unsubscribe = dampedPull.on('change', (v) => {
      if (!contentRef.current) return;
      if (Math.abs(v) < 0.5) {
        contentRef.current.style.transform = '';
      } else {
        contentRef.current.style.transform = `translateY(${v}px)`;
      }
    });
    return unsubscribe;
  }, [dampedPull]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || el.scrollTop > 0) return;
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || refreshingRef.current) return;
      if (el.scrollTop > 0) {
        isPulling.current = false;
        pullDistance.set(0);
        return;
      }
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) {
        e.preventDefault();
        pullDistance.set(delta);
      } else {
        pullDistance.set(0);
      }
    };

    const onTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      const pulled = pullDistance.get();

      if (pulled >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        animate(pullDistance, 60, { type: 'spring', stiffness: 400, damping: 30 });

        onRefreshRef
          .current()
          .then(() => new Promise<void>((r) => setTimeout(r, 600)))
          .catch(() => {})
          .finally(() => {
            refreshingRef.current = false;
            setRefreshing(false);
            animate(pullDistance, 0, { type: 'spring', stiffness: 300, damping: 25 });
          });
      } else {
        animate(pullDistance, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    };

    const onTouchCancel = () => {
      if (isPulling.current) {
        isPulling.current = false;
        animate(pullDistance, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      ref={scrollRef}
      className={`${className || ''} relative`}
      style={{ overscrollBehaviorY: 'contain' }}
    >
      <motion.div
        style={{ opacity: indicatorOpacity, scale: indicatorScale, y: indicatorY }}
        className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none"
      >
        {refreshing ? (
          <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <motion.div
            style={{ rotate: indicatorRotation }}
            className="w-7 h-7 border-2 border-emerald-500/60 border-t-transparent rounded-full"
          />
        )}
      </motion.div>

      <div ref={contentRef}>{children}</div>
    </main>
  );
}
