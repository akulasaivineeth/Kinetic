// Design tokens for Kinetic — central source of truth

const K = {
  // Core palette (extracted from current app screenshots)
  green: '#1FB37A',        // primary accent
  greenDeep: '#158A5D',    // for emphasis / on-mint text
  greenInk: '#0F6B48',     // deepest green for very emphasized text
  mint: '#D7F0E2',         // pale background tint for selected pills, avatars
  mintSoft: '#EAF6EF',     // ultralight background wash

  ink: '#0B0D0C',          // near-black text
  ink2: '#1E1F1E',
  muted: '#6B7280',        // secondary text
  mutedSoft: '#9AA2A9',    // tertiary text / axis labels
  line: 'rgba(15,17,16,0.08)',
  lineStrong: 'rgba(15,17,16,0.14)',

  bg: '#EEF0F0',           // page background (cool off-white from screenshots)
  bgWarm: '#F4F5F3',       // alt warmer bg
  card: '#FFFFFF',

  danger: '#E25C5C',
  dangerSoft: '#FBE6E6',
  gold: '#E3B341',         // tier accents
  bronze: '#CD7F32',
  silver: '#B8BCC2',

  // Radii
  r: { pill: 9999, lg: 22, md: 16, sm: 12, xs: 8 },

  // Shadows
  shadow: {
    card: '0 1px 2px rgba(15,17,16,0.04), 0 6px 16px rgba(15,17,16,0.04)',
    cardHi: '0 2px 4px rgba(15,17,16,0.05), 0 14px 30px rgba(15,17,16,0.08)',
    fab: '0 6px 20px rgba(31,179,122,0.35), 0 2px 6px rgba(31,179,122,0.2)',
    pop: '0 20px 50px rgba(15,17,16,0.18), 0 6px 18px rgba(15,17,16,0.08)',
  },

  // Type — italic display + neutral UI
  // Display: Archivo Black Italic feel via Archivo Black + italic transform, or use Inter Tight italic bold
  font: {
    display: "'Archivo', -apple-system, system-ui, sans-serif",  // italic bold
    ui: "-apple-system, 'SF Pro Text', 'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
};

window.K = K;
