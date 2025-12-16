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
        }
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


