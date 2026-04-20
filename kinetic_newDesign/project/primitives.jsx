// Shared UI primitives for Kinetic
// Depends on window.K (tokens) and window.Ic (icons)

const { K, Ic } = window;

// ─── App chrome ────────────────────────────────────────────────

// The dark phone status bar time/battery (re-uses ios-frame but we put a lightweight one here too)
function KStatusBar({ time = '8:33', dark = false }) {
  const c = dark ? '#fff' : '#000';
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '18px 26px 6px', fontFamily: K.font.ui,
      color: c, fontWeight: 600, fontSize: 16,
    }}>
      <span>{time}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="0.7" fill={c}/><rect x="4.5" y="5" width="3" height="6" rx="0.7" fill={c}/><rect x="9" y="2.5" width="3" height="8.5" rx="0.7" fill={c}/><rect x="13.5" y="0" width="3" height="11" rx="0.7" fill={c}/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11"><path d="M8 3C10 3 11.8 3.8 13.2 5L14.2 4C12.5 2.3 10.3 1.3 8 1.3S3.5 2.3 1.8 4L2.8 5C4.2 3.8 6 3 8 3Z" fill={c}/><path d="M8 6c1.2 0 2.3.4 3.2 1.1l1-1C11 5 9.6 4.5 8 4.5S5 5 3.8 6.1l1 1C5.7 6.4 6.8 6 8 6z" fill={c}/><circle cx="8" cy="9" r="1.2" fill={c}/></svg>
        <div style={{
          width: 24, height: 11, border: `1px solid ${c}`, borderRadius: 3,
          position: 'relative', opacity: 0.9,
        }}>
          <div style={{
            position: 'absolute', inset: 1, width: '80%', background: c, borderRadius: 2,
          }}/>
          <div style={{
            position: 'absolute', right: -3, top: 3, width: 2, height: 5, background: c,
            opacity: 0.4, borderRadius: 1,
          }}/>
        </div>
      </div>
    </div>
  );
}

// Top header with mountain avatar, KINETIC wordmark, rank pill, bell
function KHeader({ onProfile, rank = '#4', notifCount = 0, onNotifs, onLogo }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onLogo}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `2px solid ${K.green}`,
          background: 'linear-gradient(135deg,#5D7B8C 0%,#8FA6B3 45%,#C9D5DC 100%)',
          overflow: 'hidden', flexShrink: 0, position: 'relative',
        }}>
          {/* stylized "mountain lake" avatar — triangles over gradient */}
          <svg width="36" height="36" viewBox="0 0 36 36" style={{ position: 'absolute', inset: 0 }}>
            <path d="M0 22l8-9 6 6 4-4 6 7 12-6v20H0z" fill="#3A5566" opacity="0.8"/>
            <path d="M0 28l10-6 8 4 6-3 12 5v8H0z" fill="#1E3340"/>
          </svg>
        </div>
        <div style={{
          fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic',
          fontSize: 20, letterSpacing: -0.3, color: K.ink,
        }}>KINETIC</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          padding: '6px 12px', borderRadius: K.r.pill,
          border: `1px solid ${K.lineStrong}`, background: K.card,
          fontFamily: K.font.ui, fontSize: 13, fontWeight: 600,
          color: K.greenDeep,
        }}>{rank}</div>
        <button onClick={onNotifs} style={{
          width: 36, height: 36, borderRadius: K.r.pill,
          border: `1px solid ${K.lineStrong}`, background: K.card,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, position: 'relative',
        }}>
          <Ic.Bell size={16} color={K.ink}/>
          {notifCount > 0 && (
            <span style={{
              position: 'absolute', top: -3, right: -3,
              minWidth: 16, height: 16, borderRadius: 8,
              background: K.danger, color: '#fff',
              fontSize: 10, fontWeight: 700, fontFamily: K.font.ui,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
            }}>{notifCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}

// Bottom tab bar — Pulse / Squads / Log / Profile
function KTabBar({ active = 'pulse', onChange }) {
  const tabs = [
    { id: 'pulse', label: 'Pulse', icon: Ic.Pulse },
    { id: 'squads', label: 'Squads', icon: Ic.Squads },
    { id: 'log', label: 'Log', icon: Ic.Log, center: true },
    { id: 'profile', label: 'Profile', icon: Ic.Profile },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'linear-gradient(to top, rgba(22,28,30,0.96) 70%, rgba(22,28,30,0.9))',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      padding: '14px 24px 28px', display: 'flex', justifyContent: 'space-around',
      alignItems: 'flex-start',
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        const Icon = t.icon;
        if (t.center) {
          return (
            <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
              onClick={() => onChange?.(t.id)}>
              <div style={{
                width: 54, height: 54, borderRadius: 27,
                background: K.green, boxShadow: K.shadow.fab,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: -20, border: '3px solid rgba(255,255,255,0.06)',
              }}>
                <Icon size={26} color="#fff"/>
              </div>
              <div style={{
                fontFamily: K.font.ui, fontSize: 10, fontWeight: 600,
                color: 'rgba(255,255,255,0.7)', letterSpacing: 0.2, marginTop: -2,
              }}>{t.label}</div>
            </div>
          );
        }
        return (
          <div key={t.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            cursor: 'pointer', padding: '4px 8px',
          }} onClick={() => onChange?.(t.id)}>
            <Icon size={22} color={isActive ? K.green : 'rgba(255,255,255,0.45)'}/>
            <div style={{
              fontFamily: K.font.ui, fontSize: 11, fontWeight: isActive ? 700 : 500,
              color: isActive ? K.green : 'rgba(255,255,255,0.45)',
              letterSpacing: 0.2,
            }}>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// Generic card container
function KCard({ children, pad = 18, style = {}, onClick, hi = false }) {
  return (
    <div onClick={onClick} style={{
      background: K.card, borderRadius: K.r.lg,
      padding: pad, boxShadow: hi ? K.shadow.cardHi : K.shadow.card,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

// Section eyebrow — 'ALL-TIME ROLL-UP' style
function KEyebrow({ children, color }) {
  return (
    <div style={{
      fontFamily: K.font.ui, fontSize: 11, fontWeight: 600,
      letterSpacing: 1.8, textTransform: 'uppercase',
      color: color || K.mutedSoft,
    }}>{children}</div>
  );
}

// Display headline — big italic bold
function KDisplay({ children, size = 32, style = {} }) {
  return (
    <div style={{
      fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic',
      fontSize: size, lineHeight: 0.95, letterSpacing: -0.5,
      color: K.ink, ...style,
    }}>{children}</div>
  );
}

// Pill (segmented nav and chips)
function KPill({ children, active, onClick, tone = 'neutral', size = 'md', style = {} }) {
  const bg = active
    ? (tone === 'mint' ? K.mint : tone === 'green' ? K.green : K.mint)
    : 'transparent';
  const fg = active
    ? (tone === 'green' ? '#fff' : K.greenDeep)
    : K.muted;
  const pad = size === 'sm' ? '6px 12px' : '8px 16px';
  const fs = size === 'sm' ? 11 : 13;
  return (
    <button onClick={onClick} style={{
      background: bg, color: fg, padding: pad, borderRadius: K.r.pill,
      border: active ? 'none' : `1px solid ${K.lineStrong}`,
      fontFamily: K.font.ui, fontSize: fs, fontWeight: 700,
      letterSpacing: 0.4, textTransform: 'uppercase',
      cursor: 'pointer', ...style,
    }}>{children}</button>
  );
}

// Avatar (user photo placeholder with initials on colored bg, or image url)
function KAvatar({ name = '?', size = 44, color, src, ring, style = {} }) {
  const initials = name.split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase();
  const bg = color || (() => {
    // deterministic color from name
    const palette = ['#6B7FD8','#E07A5F','#7FB069','#D4A373','#9D4EDD','#F4A261','#2A9D8F','#E76F51'];
    let h = 0; for (let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) % palette.length;
    return palette[h];
  })();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? `url(${src}) center/cover` : bg,
      border: ring ? `3px solid ${ring}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: K.font.ui, fontWeight: 700, fontSize: size * 0.36,
      color: '#fff', flexShrink: 0, ...style,
    }}>
      {!src && initials}
    </div>
  );
}

// Squad crest — SVG shield with emblem
function KCrest({ shape = 'shield', emblem = 'bolt', color = '#1FB37A', size = 56, glow = false }) {
  const shapes = {
    shield: <path d="M32 4l24 8v18c0 15-10 26-24 34C18 56 8 45 8 30V12l24-8z" fill={color}/>,
    hex: <path d="M32 4l24 14v28L32 60 8 46V18L32 4z" fill={color}/>,
    circle: <circle cx="32" cy="32" r="28" fill={color}/>,
    diamond: <path d="M32 4l28 28-28 28L4 32z" fill={color}/>,
    chevron: <path d="M4 14l28-10 28 10v22L32 60 4 36z" fill={color}/>,
  };
  const emblems = {
    bolt: <path d="M36 18l-14 18h10l-4 12 14-18H32l4-12z" fill="#fff"/>,
    flame: <path d="M32 16c2 6 10 8 10 18a10 10 0 01-20 0c0-4 2-6 4-8-1 4 1 6 3 6 0-6 2-10 3-16z" fill="#fff"/>,
    star: <path d="M32 14l4 11h11l-9 7 3 11-9-7-9 7 3-11-9-7h11z" fill="#fff"/>,
    arrow: <path d="M32 14v24M22 28l10-14 10 14M22 46h20" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
    wave: <path d="M14 30c3-3 6-3 9 0s6 3 9 0 6-3 9 0 6 3 9 0M14 40c3-3 6-3 9 0s6 3 9 0 6-3 9 0 6 3 9 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round"/>,
    peak: <path d="M14 44l10-16 6 8 4-6 12 14H14z" fill="#fff"/>,
    cross: <path d="M28 16h8v12h12v8H36v12h-8V36H16v-8h12z" fill="#fff"/>,
    skull: <path d="M32 14c-8 0-14 6-14 14v6l4 4v8h20v-8l4-4v-6c0-8-6-14-14-14zm-5 20a3 3 0 110-6 3 3 0 010 6zm10 0a3 3 0 110-6 3 3 0 010 6z" fill="#fff"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{
      filter: glow ? `drop-shadow(0 0 16px ${color}88)` : 'none',
    }}>
      {shapes[shape]}
      <g opacity="0.95">{emblems[emblem]}</g>
      {/* subtle inner shine */}
      <path d="M32 4l24 8v18c0 15-10 26-24 34C18 56 8 45 8 30V12l24-8z" fill="url(#shine)" opacity="0.22" style={{display: shape === 'shield' ? 'block' : 'none'}}/>
      <defs>
        <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1"/>
          <stop offset="1" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// Thin progress ring — for weekly goal etc.
function KRing({ pct = 0.5, size = 110, stroke = 10, color = K.green, track = '#E4E6E4', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.2,.8,.2,1)' }}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, {
  KStatusBar, KHeader, KTabBar, KCard, KEyebrow, KDisplay, KPill, KAvatar, KCrest, KRing,
});
