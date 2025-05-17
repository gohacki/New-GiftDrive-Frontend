// tailwind.config.js
const plugin = require("tailwindcss/plugin");

module.exports = {
  content: [
    // ... your existing content paths
    "./components/**/*.{js,jsx,ts,tsx}",
    "./contexts/**/*.{js,jsx,ts,tsx}",
    "./layouts/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./public/**/*.html",
    "./styles/**/*.{css,scss}",
    "./utils/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ... your existing custom colors
        'ggreen': '#11393B',
        'gyellow': 'rgb(0, 190, 29)',
        'secondary_green': '#F6F3EE',
        'hero-bg-muted-teal': '#7A9E9F',
      },
      fontFamily: {
        // Explicitly set sans to Inter first, then fallback system fonts
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
        // Removed: georgia: ['Georgia Pro', 'serif'],
      },
      minHeight: {
        "screen-75": "75vh",
        "screen-90": "90vh",
      },
      // ... rest of your theme.extend
    },
  },
  plugins: [
    // ... your existing plugins
    require("@tailwindcss/forms"),
    plugin(function ({ addComponents, theme }) {
      const screens = theme("screens", {});
      addComponents([
        {
          ".container": { width: "100%" },
        },
        {
          [`@media (min-width: ${screens.sm})`]: {
            ".container": {
              "max-width": "640px",
            },
          },
        },
        {
          [`@media (min-width: ${screens.md})`]: {
            ".container": {
              "max-width": "768px",
            },
          },
        },
        {
          [`@media (min-width: ${screens.lg})`]: {
            ".container": {
              "max-width": "1024px",
            },
          },
        },
        {
          [`@media (min-width: ${screens.xl})`]: {
            ".container": {
              "max-width": "1280px",
            },
          },
        },
        {
          [`@media (min-width: ${screens["2xl"]})`]: {
            ".container": {
              "max-width": "1280px",
            },
          },
        },
      ]);
    }),
  ],
};