import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f6f7fb', 100: '#eceef6', 200: '#d5dae9', 300: '#b0b9d2',
          400: '#8592b5', 500: '#66739a', 600: '#515c80', 700: '#424a68',
          800: '#394056', 900: '#181c2b', 950: '#0d1020',
        },
        brand: {
          50: '#eef4ff', 100: '#dae6ff', 200: '#bcd3ff', 300: '#8eb6ff',
          400: '#598eff', 500: '#3366f2', 600: '#1f47e3', 700: '#1a36c9',
          800: '#1c30a2', 900: '#1d2f80', 950: '#141d54',
        },
        mint: { 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488' },
        amber2: { 400: '#fbbf24', 500: '#f59e0b' },
        rose2: { 400: '#fb7185', 500: '#f43f5e' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px -12px rgba(16,24,40,.18)',
        lift: '0 2px 4px rgba(16,24,40,.04), 0 24px 48px -20px rgba(16,24,40,.28)',
        glow: '0 0 0 1px rgba(51,102,242,.25), 0 12px 40px -12px rgba(51,102,242,.55)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulseRing: { '0%': { transform: 'scale(.85)', opacity: '.7' }, '100%': { transform: 'scale(1.6)', opacity: '0' } },
        gradient: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        caret: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite',
        pulseRing: 'pulseRing 2s ease-out infinite',
        gradient: 'gradient 8s ease infinite',
        caret: 'caret 1.1s step-end infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;