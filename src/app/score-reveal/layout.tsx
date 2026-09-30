import type { ReactNode } from 'react';

/** Immersive score moment — no tab shell. */
export default function ScoreRevealLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#050506] text-white antialiased">
      {children}
    </div>
  );
}
