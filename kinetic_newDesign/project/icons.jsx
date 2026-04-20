// Custom monoline exercise icons + UI glyphs for Kinetic
// All icons accept { size=24, color='currentColor', stroke=2 }

const Ic = {};

// ─── UI glyphs ────────────────────────────────────────────────
Ic.Pulse = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M2 12h4l2-6 3 12 3-9 2 3h6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
Ic.Arena = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M7 3h10l-1 6a4 4 0 01-8 0L7 3z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M5 4H3v2a3 3 0 003 3M19 4h2v2a3 3 0 01-3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M9 15v3h6v-3M8 20h8" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
Ic.Log = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <ellipse cx="12" cy="12" rx="9" ry="5" stroke={color} strokeWidth="2"/>
    <path d="M8 12h8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
Ic.Profile = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth="1.8"/>
    <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
Ic.Squads = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);
Ic.Bell = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 16V10a6 6 0 0112 0v6l1.5 2h-15L6 16z" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="M10 20a2 2 0 004 0" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
Ic.Chevron = ({ size = 14, color = 'currentColor', dir = 'right' }) => {
  const r = { right: 0, down: 90, left: 180, up: 270 }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${r}deg)` }}>
      <path d="M9 5l7 7-7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};
Ic.Plus = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);
Ic.Check = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 12l5 5 11-12" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
Ic.Close = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 5l14 14M19 5L5 19" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);
Ic.Flame = ({ size = 16, color = '#E25C5C' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4-.5 2 .5 3 1.5 3 0-3 1-5 1.5-9z" fill={color}/>
  </svg>
);
Ic.Send = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 12L21 4l-4 17-5-8-9-1z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);
Ic.Copy = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="8" y="8" width="12" height="12" rx="2.5" stroke={color} strokeWidth="1.8"/>
    <path d="M16 8V5a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" stroke={color} strokeWidth="1.8"/>
  </svg>
);
Ic.Trophy = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M7 4h10l-.5 6a4.5 4.5 0 01-9 0L7 4z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M5 5H3v2a3 3 0 003 3M19 5h2v2a3 3 0 01-3 3M10 15v3h4v-3M9 20h6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
Ic.Back = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M15 5l-7 7 7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
Ic.Search = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.8"/>
    <path d="M20 20l-4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
Ic.Vote = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 13l4 4 10-10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 5h10M3 9h6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
Ic.Target = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="1.5" fill={color}/>
  </svg>
);
Ic.Calendar = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="16" rx="2.5" stroke={color} strokeWidth="1.8"/>
    <path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
Ic.Lightning = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>
);
Ic.Sparkle = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill={color}/>
  </svg>
);

// ─── Exercise icons (custom monoline) ─────────────────────────
const E = {};

E.pushup = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M3 22h26" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="8" cy="13" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M10 14l6 4M16 18l8-2M16 18l-3 4M24 16v6M10 22v-4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.squat = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="6" r="2.2" stroke={color} strokeWidth="1.6"/>
    <path d="M16 9v6l-4 5v5M16 15l4 5v5M12 14h8" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 27h24" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
E.plank = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M3 23h26" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="7" cy="14" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M9 15l18 3M9 15v8M27 18v5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.run = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="19" cy="5" r="2.2" stroke={color} strokeWidth="1.6"/>
    <path d="M12 14l5-4 4 3 4 1M17 10l-2 5 4 3-2 6M15 15l-5 2M19 24l3 4M4 13l4-2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.pullup = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M4 6h24" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="16" cy="12" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M12 6v2l4 4M20 6v2l-4 4M16 14v7l-2 5M16 21l2 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.dip = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M4 10h10M18 10h10" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="16" cy="15" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M12 10v4M20 10v4M16 17v6l-2 4M16 23l2 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.lunge = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="14" cy="6" r="2.2" stroke={color} strokeWidth="1.6"/>
    <path d="M14 9l-1 6-5 4v4M14 15l5 5v5M10 16l-5 2M19 20l5-2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 27h24" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
E.situp = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M3 24h26" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="10" cy="13" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M12 14l4 4M16 18l6 6M16 18v5M8 24v-4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.legraise = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M3 24h26" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="6" cy="20" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M8 20h7M15 20l4-6M19 14l5-2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.burpee = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="6" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M16 8l-4 5v4l-3 5M16 13l4 4v4l3 5M12 13h8" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 27h24" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
E.jumpingjack = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="5" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M16 8v8M16 16l-5 4M16 16l5 4M10 8l-5 4M22 8l5 4M11 20l-2 6M21 20l2 6" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
E.bike = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="7" cy="22" r="4" stroke={color} strokeWidth="1.6"/>
    <circle cx="24" cy="22" r="4" stroke={color} strokeWidth="1.6"/>
    <path d="M7 22l6-10h7l4 10M13 12l3-3h4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.row = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M3 23c3-2 7-2 10 0s7 2 10 0 6-1 6-1" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="10" cy="13" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M12 14l4 2 6-4 5 1M16 16v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.swim = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="11" cy="10" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M13 11l5 2 7-3M4 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0M4 21c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0M4 27c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.jumprope = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="6" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M16 8v9M12 17h8M13 17l-2 7M19 17l2 7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 14c-4-4-5-10-2-11M24 14c4-4 5-10 2-11" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
E.yoga = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="8" r="2.2" stroke={color} strokeWidth="1.6"/>
    <path d="M16 11v6M10 17h12M10 17l-5 4M22 17l5 4M4 23h24" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.stretch = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="10" cy="7" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M10 9l3 5 6-2 8 2M13 14l-2 6 5 4M11 20l-4 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.hiit = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M14 3L6 17h7l-1 12 9-15h-7l0-11z" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>
);
E.basketball = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="12" stroke={color} strokeWidth="1.6"/>
    <path d="M4 16h24M16 4v24M7.5 7.5c4 4 4 13 0 17M24.5 7.5c-4 4-4 13 0 17" stroke={color} strokeWidth="1.6"/>
  </svg>
);
E.soccer = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="12" stroke={color} strokeWidth="1.6"/>
    <path d="M16 8l5 4-2 6h-6l-2-6 5-4zM16 8V4M21 12l4-2M19 18l3 4M13 18l-3 4M11 12l-4-2" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>
);
E.tennis = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="12" stroke={color} strokeWidth="1.6"/>
    <path d="M7 7c4 2 7 5 9 9s5 7 9 9M25 7c-4 2-7 5-9 9s-5 7-9 9" stroke={color} strokeWidth="1.6"/>
  </svg>
);
E.mountain = ({ size = 28, color = 'currentColor' }) => (
  // mountain climbers
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M3 24h26" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="8" cy="14" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M10 15l5 2 6-5 5 1M15 17l-3 4M15 17l2 7M10 15v6" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.crunch = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M3 24h26" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M14 16h6M10 17l-4 7M15 17l4 7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
E.kettlebell = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M12 6h8l1 4a8 8 0 11-10 0l1-4z" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="M13 6a3 3 0 016 0" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
E.box = ({ size = 28, color = 'currentColor' }) => (
  // box jump
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="17" y="18" width="11" height="9" stroke={color} strokeWidth="1.6"/>
    <circle cx="8" cy="10" r="2" stroke={color} strokeWidth="1.6"/>
    <path d="M8 12l-2 6 5 3-1 6M10 16l5-2M6 18L3 21" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 27h26" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

Object.assign(window, { Ic, ExIcons: E });
