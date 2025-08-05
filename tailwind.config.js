/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // <-- Ici, au niveau racine
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './*.{js,ts,jsx,tsx,mdx}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        'wow-gold': '#FFD700',
        'wow-blue': '#0066CC',
        'wow-alliance': '#0066CC',
        'wow-horde': '#CC0000',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
  safelist: [
    'text-xs',
    'text-sm', 
    'text-base',
    'text-lg',
    'text-xl',
    'text-2xl',
    'text-3xl',
    'p-1',
    'p-1.5', 
    'p-2',
    'p-2.5',
    'p-3',
    'p-4',
    'mb-1',
    'mb-1.5',
    'mb-2',
    'mb-3',
    'mb-4',
    'space-y-0.5',
    'space-y-1',
    'space-y-1.5',
    'space-y-2',
    'grid-cols-5',
    'xl:grid-cols-5',
    'flex-shrink-0',
  ]
}