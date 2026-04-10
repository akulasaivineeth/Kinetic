'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiProps {
  active: boolean;
  message?: string;
}

const COLORS = ['#10B981', '#34D399', '#6EE7B7', '#FBBF24', '#F59E0B', '#38BDF8'];

function Particle({ color, delay }: { color: string; delay: number }) {
  const x = Math.random() * 200 - 100;
  const y = -(Math.random() * 150 + 50);
  const rotate = Math.random() * 720 - 360;
  const size = Math.random() * 6 + 4;

  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
      animate={{ opacity: 0, x, y, rotate, scale: 0.5 }}
      transition={{ duration: 1.2, delay, ease: 'easeOut' }}
      className="absolute left-1/2 top-1/2 rounded-sm"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

export function Confetti({ active, message }: ConfettiProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      setShow(true);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      const t = setTimeout(() => setShow(false), 2500);
      return () => clearTimeout(t);
    }
  }, [active]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="relative">
            {Array.from({ length: 30 }).map((_, i) => (
              <Particle key={i} color={COLORS[i % COLORS.length]} delay={i * 0.03} />
            ))}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <p className="text-3xl font-black text-emerald-500">{message}</p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
