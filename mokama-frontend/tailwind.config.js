/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // ─── Brand palette ──────────────────────────────────────────────
      colors: {
        // Scarlet red — primary brand colour
        brand: {
          50:  '#fff0ed',
          100: '#ffd6cc',
          200: '#ffaa99',
          300: '#ff7766',
          400: '#ff4433',
          500: '#ff2400',   // primary brand scarlet
          600: '#e02000',
          700: '#b81a00',
          800: '#8f1400',
          900: '#6b0f00',
        },
        // Dark backgrounds
        dark: {
          primary:   '#0A0A0A',
          secondary: '#111111',
          tertiary:  '#1A1A1A',
          elevated:  '#222222',
        },
        // Text
        content: {
          primary:   '#FFFFFF',
          secondary: '#A0A0A0',
          muted:     '#666666',
          faint:     '#3A3A3A',
        },
        // Borders
        border: {
          DEFAULT: '#222222',
          subtle:  '#1A1A1A',
          strong:  '#333333',
        },
        // Status
        success: '#22C55E',
        warning: '#F59E0B',
        error:   '#EF4444',

        // Legacy aliases used in existing components — keep intact
        'surface-border': '#222222',
        'surface-muted':  '#0A0A0A',
      },

      // ─── Typography ─────────────────────────────────────────────────
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
      },

      // ─── Shadows ────────────────────────────────────────────────────
      boxShadow: {
        // Card shadow — barely visible on dark bg
        'card':       '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
        // Scarlet glow — used on primary buttons and active elements
        'glow':       '0 0 20px rgba(255,36,0,0.35)',
        'glow-sm':    '0 0 10px rgba(255,36,0,0.25)',
        'glow-lg':    '0 0 40px rgba(255,36,0,0.4)',
        // Inner glow for active sidebar items
        'glow-inner': 'inset 0 0 12px rgba(255,36,0,0.08)',
      },

      // ─── Animations ─────────────────────────────────────────────────
      keyframes: {
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(255,36,0,0.2)' },
          '50%':      { boxShadow: '0 0 24px rgba(255,36,0,0.45)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'slide-up':    'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':     'fade-in 0.25s ease',
        'scale-in':    'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-glow':  'pulse-glow 2s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
      },

      // ─── Border radius ───────────────────────────────────────────────
      borderRadius: {
        '2xl': '14px',
        '3xl': '20px',
      },

      // ─── Background gradients ────────────────────────────────────────
      backgroundImage: {
        'brand-gradient':   'linear-gradient(135deg, #ff2400 0%, #ff4422 100%)',
        'brand-gradient-r': 'linear-gradient(to right, #ff2400, #ff4422)',
        'dark-gradient':    'linear-gradient(180deg, #111111 0%, #0A0A0A 100%)',
        'card-gradient':    'linear-gradient(145deg, #1A1A1A 0%, #141414 100%)',
      },
    },
  },
  plugins: [],
}
