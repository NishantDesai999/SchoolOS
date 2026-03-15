/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        schoolos: {
          blue:   '#1d4ed8',
          indigo: '#4338ca',
          green:  '#16a34a',
          amber:  '#d97706',
          red:    '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'Noto Sans Gujarati', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
