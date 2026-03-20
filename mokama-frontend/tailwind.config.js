/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        dark: {
          bg:      '#0a0a0a',
          surface: '#141414',
          card:    '#1a1a1a',
          hover:   '#212121',
          border:  '#2a2a2a',
          muted:   '#111111',
        },
        txt: {
          primary: '#f0f0f0',
          secondary:'#a3a3a3',
          muted:   '#6b6b6b',
          inverse: '#0a0a0a',
        }
      },
      boxShadow: {
        card:       '0 1px 3px 0 rgb(0 0 0 / 0.4)',
        'card-hover':'0 4px 20px 0 rgb(0 0 0 / 0.5)',
        glow:       '0 0 20px rgb(249 115 22 / 0.25)',
        'glow-sm':  '0 0 10px rgb(249 115 22 / 0.15)',
        modal:      '0 25px 60px -10px rgb(0 0 0 / 0.7)',
      },
      borderRadius: {
        xl:  '1rem',
        '2xl':'1.25rem',
        '3xl':'1.5rem',
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease-out',
        'slide-up':  'slideUp 0.35s ease-out',
        'glow-pulse':'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glowPulse: { '0%,100%': { boxShadow: '0 0 10px rgb(249 115 22 / 0.2)' }, '50%': { boxShadow: '0 0 25px rgb(249 115 22 / 0.5)' } },
      }
    }
  },
  plugins: []
}
