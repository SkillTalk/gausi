import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B1220',
          800: '#0F1A2E',
          700: '#15223B'
        },
        electric: {
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8'
        },
        neon: {
          blue: '#60A5FA',
          purple: '#8B5CF6',
          cyan: '#22D3EE'
        }
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0px rgba(34,211,238,0.0)' },
          '50%': { boxShadow: '0 0 24px rgba(34,211,238,0.4)' }
        }
      },
      animation: {
        'gradient-x': 'gradient-x 8s ease infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite'
      },
      gradientColorStops: {
        'brand-start': '#1D4ED8',
        'brand-end': '#06B6D4'
      },
      boxShadow: {
        card: '0 10px 25px -10px rgba(0,0,0,0.35)'
      },
      maxWidth: {
        container: '1200px'
      }
    }
  },
  plugins: []
};

export default config;


