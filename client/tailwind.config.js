/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Jost', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eef8ff',
          100: '#dcf1ff',
          200: '#b2e2ff',
          300: '#6eccff',
          400: '#20aaff',
          500: '#1e90ff', // Dodger Blue
          600: '#0672ef',
          700: '#0456c6',
          800: '#09479e',
          900: '#0d3c7e',
          950: '#0e264e',
        },
        gray: {
          50: '#FDFDFE', // Pale Gray
          100: '#F0F3F8', // Child of Light
          200: '#E2E4E9', // Silver City
          300: '#C4CAD3', // Light Spirit
          400: '#9F9FA3', // Suzu Grey
          500: '#6b7280', // Default tailwind mid-grays for text balance
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      animation: {
        'pop-in': 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-right': 'slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
