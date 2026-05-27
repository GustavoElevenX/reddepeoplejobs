import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        redde: {
          50: '#F7EAFE',
          100: '#EDD3FF',
          500: '#8300EA',
          600: '#7200CC',
          700: '#5F00AB',
          900: '#21003D',
        },
        ink: {
          900: '#07070A',
          700: '#17171D',
          500: '#4B4B55',
        },
        surface: {
          50: '#FAFAFB',
          100: '#F3F3F6',
          200: '#E6E6EC',
        },
      },
      boxShadow: {
        soft: '0 10px 28px rgba(21, 21, 21, 0.08)',
        card: '0 8px 22px rgba(21, 21, 21, 0.07)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
