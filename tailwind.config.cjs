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
        // Identidade visual Ambiental (ambiental.sc)
        'brand-primary': '#164194', // azul institucional
        'brand-secondary': '#003087', // azul escuro (hover)
        'brand-accent': '#164194', // anel/borda de foco
        'brand-light': '#E8EEF9', // tom claro do azul (painéis de destaque)
        'brand-dark': '#312D31', // texto principal / títulos
        'brand-text': '#312D31',
        'brand-gray': '#F7F7F7', // fundo de página/seções alternadas
        'brand-gray-mid': '#808080', // texto secundário
        'brand-gray-blue': '#7C91BB', // texto de apoio sobre fundo azul
        'brand-green': '#A8C950', // CTA
        'brand-green-mid': '#95C11F',
        'brand-green-dark': '#9BBF3B', // hover do CTA
        'brand-green-natural': '#63B869',
        gray: {
          50: '#F7F7F7',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        brand: '5px',
      },
    },
  },
  plugins: [],
};
