/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f4f9f6",
          100: "#e7f2ed",
          200: "#c9e2d7",
          300: "#9ecbb8",
          400: "#6daf90",   // primary accent (fresh green)
          500: "#4b8f72",   // primary brand
          600: "#3d735c",
          700: "#315a49",
          800: "#264639",
          900: "#1d372d"
        },
        ink: {
          900: "#0f172a",
          700: "#334155",
          500: "#64748b",
          300: "#cbd5e1"
        }
      },
      fontFamily: {
        display: ['ui-sans-serif', 'system-ui'],
        body: ['ui-sans-serif', 'system-ui']
      }
    },
  },
  plugins: [],
};
