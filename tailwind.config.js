/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF3B30',
        'primary-hover': '#E6352B',
        secondary: '#007AFF',
        'secondary-hover': '#0066D6'
      }
    }
  },
  plugins: []
}