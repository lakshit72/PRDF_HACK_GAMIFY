/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Rajdhani"', '"Noto Sans"', 'sans-serif'],
        body:    ['"Noto Sans"', 'sans-serif'],
        mono:    ['"Roboto Mono"', 'monospace'],
      },
      colors: {
        // NPS Navy — primary brand color
        ink:       '#001F4D',
        'ink-2':   '#002a6b',
        surface:   '#FFFFFF',
        'surface-2': '#F0F4FA',
        border:    '#C8D6E8',
        // NPS Saffron — primary accent (call to action)
        gold:      '#F47920',
        'gold-dim':'#C85F10',
        // Secondary accents
        ember:     '#E63946',
        frost:     '#1565C0',
        sage:      '#2E7D32',
        muted:     '#64748b',
        tricolor:  '#138808',   // India green
        // Text
        'text-primary':   '#001F4D',
        'text-secondary': '#4A5568',
      },
      animation: {
        'fade-up':    'fadeUp 0.4s ease forwards',
        'fade-in':    'fadeIn 0.3s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer':    'shimmer 1.8s ease-in-out infinite',
        'spin-slow':  'spin 8s linear infinite',
      },
      keyframes: {
        fadeUp:  { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'nps-hero': 'linear-gradient(135deg, #001F4D 0%, #003580 50%, #00459A 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.04) 50%, transparent 100%)',
      },
      boxShadow: {
        'card':   '0 2px 12px rgba(0,31,77,0.08), 0 1px 3px rgba(0,31,77,0.05)',
        'card-hover': '0 8px 24px rgba(0,31,77,0.12), 0 2px 6px rgba(0,31,77,0.08)',
        'btn':    '0 2px 8px rgba(244,121,32,0.35)',
      },
    },
  },
  plugins: [],
};