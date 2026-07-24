/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cs: {
          void: "#0c130c",
          deep: "#111b11",
          forest: "#0f3a1f",
          emerald: "#065f46",
          jade: "#10b981",
          mint: "#34d399",
          lime: "#a3e635",
          amber: "#fbbf24",
          coral: "#f97316",
          sky: "#06b6d4",
          white: "#f0fdf4",
        }
      },
      fontFamily: {
        clash: ['"Clash Display"', 'sans-serif'],
        satoshi: ['Satoshi', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(16, 185, 129, 0.15)',
      }
    },
  },
  plugins: [],
}
