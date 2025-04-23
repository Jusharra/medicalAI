import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        luxury: {
          50: '#E6F0F3',
          100: '#CCE1E7',
          200: '#99C3CF',
          300: '#66A5B7',
          400: '#33879F',
          500: '#00728D',
          600: '#00667E',
          700: '#004F62',
          800: '#003947',
          900: '#0C3C4B',
        },
        gold: {
          50: '#FBF6E6',
          100: '#F7EDCC',
          200: '#F0DB99',
          300: '#E9C966',
          400: '#E2B733',
          500: '#E7C05A',
          600: '#D0AD51',
          700: '#A3873F',
          800: '#75612E',
          900: '#473A1C',
        },
        navy: {
          50: '#E6EAEC',
          100: '#CCD5D9',
          200: '#99ABB3',
          300: '#66818D',
          400: '#335767',
          500: '#0C3C4B',
          600: '#0B3643',
          700: '#082A34',
          800: '#061F26',
          900: '#031217',
        },
        aqua: {
          50: '#E6F9FA',
          100: '#CCF3F5',
          200: '#99E7EB',
          300: '#66DBE1',
          400: '#33CFD7',
          500: '#29B8C3',
          600: '#25A6B0',
          700: '#1D8189',
          800: '#155C62',
          900: '#0E383B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      boxShadow: {
        'luxury': '0 4px 20px rgba(0, 114, 141, 0.1)',
        'luxury-lg': '0 10px 40px rgba(0, 114, 141, 0.2)',
      },
      backgroundImage: {
        'luxury-gradient': 'linear-gradient(to right, #00728D, #0C3C4B)',
        'gold-gradient': 'linear-gradient(45deg, #D0AD51, #E7C05A)',
      },
      scale: {
        '98': '0.98',
        '102': '1.02',
      },
      screens: {
        'xs': '475px',
        ...defaultTheme.screens,
      },
      spacing: {
        '18': '4.5rem',
        '112': '28rem',
        '128': '32rem',
      },
      minHeight: {
        '0': '0',
        '1/4': '25vh',
        '1/2': '50vh',
        '3/4': '75vh',
        'screen': '100vh',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
        'container': '1200px',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 1s ease-in-out forwards',
        fadeOut: 'fadeOut 1s ease-in-out forwards',
      },
      lineClamp: {
        7: '7',
        8: '8',
        9: '9',
        10: '10',
      },
      textColor: {
        'heading': '#0C3C4B',
        'body': '#3C4F51',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.active\:scale-98:active': {
          transform: 'scale(0.98)',
        },
        '.line-clamp-1': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '1',
        },
        '.line-clamp-2': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '2',
        },
        '.line-clamp-3': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '3',
        },
      };
      addUtilities(newUtilities);
    }
  ],
};