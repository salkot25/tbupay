/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f4c81',
        background: '#fafafa',
        surface: '#ffffff',
        'text-primary': '#111827',
        'text-secondary': '#6b7280',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        border: '#e5e7eb',
      },
      keyframes: {
        cardReveal: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        skeletonShimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        }
      },
    },
  },
  plugins: [],
}
