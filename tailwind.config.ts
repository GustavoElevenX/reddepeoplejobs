import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        redde: {
          50: '#F8EAF8',
          100: '#F0D3F1',
          200: '#D8A8DA',
          500: '#800084',
          600: '#6D0071',
          700: '#59005C',
          900: '#260028',
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
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-33.3333%)' },
        },
      },
      animation: {
        marquee: 'marquee 24s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
