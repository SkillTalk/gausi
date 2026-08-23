import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Education palette — primary brand
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1', // indigo-500
          600: '#4F46E5', // indigo-600  ← primary CTA
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        // Legacy navy (kept for marketing remnants / dark panels)
        navy: {
          900: '#0B1220',
          800: '#0F1A2E',
          700: '#15223B',
        },
        // Exam page tokens
        exam: {
          bg: '#F7F9FC',
          surface: '#FFFFFF',
          text: '#1E293B',
          muted: '#64748B',
          border: '#E2E8F0',
        },
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Opacity-only variant used by PageTransition so that position:fixed
        // descendants are never trapped in an animated transform containing block.
        'fade-in-page': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        blob: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
        },
      },
      animation: {
        'gradient-x': 'gradient-x 8s ease infinite',
        'fade-in': 'fade-in 0.4s ease both',
        'fade-in-page': 'fade-in-page 0.25s ease both',
        'scale-in': 'scale-in 0.25s ease both',
        'pulse-subtle': 'pulse-subtle 1.5s ease-in-out infinite',
        blob: 'blob 8s ease-in-out infinite',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.10)',
        'card-lg': '0 10px 25px -10px rgba(0,0,0,0.12)',
        glow: '0 0 0 3px rgba(99,102,241,0.3)',
      },
      maxWidth: {
        container: '1200px',
        question: '780px',
      },
    },
  },
  plugins: [],
};

export default config;
