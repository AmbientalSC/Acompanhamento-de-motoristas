/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#1E40AF',
        'brand-secondary': '#1D4ED8',
        'brand-accent': '#3B82F6',
        'brand-light': '#EFF6FF',
        'brand-dark': '#111827',
      },
    },
  },
  plugins: [],
};
