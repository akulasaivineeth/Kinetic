import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        emerald: {
          DEFAULT: '#1FB37A',
          50: '#EAF6EF',
          100: '#D7F0E2',
          200: '#A7E8C8',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#1FB37A',
          600: '#158A5D',
          700: '#0F6B48',
          800: '#065F46',
          900: '#064E3B',
        },
        k: {
          green: 'var(--k-green)',
          'green-deep': 'var(--k-green-deep)',
          'green-ink': 'var(--k-green-ink)',
          mint: 'var(--k-mint)',
          'mint-soft': 'var(--k-mint-soft)',
          ink: 'var(--k-ink)',
          ink2: 'var(--k-ink2)',
          muted: 'var(--k-muted)',
          'muted-soft': 'var(--k-muted-soft)',
          bg: 'var(--k-bg)',
          card: 'var(--k-card)',
          elevated: 'var(--k-elevated)',
          line: 'var(--k-line)',
          'line-strong': 'var(--k-line-strong)',
          danger: 'var(--k-danger)',
          gold: 'var(--k-gold)',
        },
        dark: {
          bg: 'var(--dark-bg)',
          card: 'var(--dark-card)',
          elevated: 'var(--dark-elevated)',
          border: 'var(--dark-border)',
          text: 'var(--dark-text)',
          muted: 'var(--dark-muted)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        display: [
          'Archivo',
          '-apple-system',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'monospace',
        ],
      },
      borderRadius: {
        'k-pill': '9999px',
        'k-lg': '22px',
        'k-md': '16px',
        'k-sm': '12px',
        'k-xs': '8px',
      },
      boxShadow: {
        'k-card': 'var(--k-shadow-card)',
        'k-card-hi': 'var(--k-shadow-card-hi)',
        'k-fab': 'var(--k-shadow-fab)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'spring-in': 'springIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ring-fill': 'ringFill 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        springIn: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        ringFill: {
          '0%': { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: 'var(--ring-offset)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
