const plugin = require("tailwindcss/plugin");
const colors = require("tailwindcss/colors");

module.exports = {
  mode: 'jit',
  purge: {
    enabled: true,
    content: [
      // Components: All JS/JSX/TS/TSX files in the components directory and its subdirectories
      "./components/**/*.{js,jsx,ts,tsx}",
  
      // Contexts: All JS/JSX/TS/TSX files in the contexts directory and its subdirectories
      "./contexts/**/*.{js,jsx,ts,tsx}",
  
      // Layouts: All JS/JSX/TS/TSX files in the layouts directory and its subdirectories
      "./layouts/**/*.{js,jsx,ts,tsx}",
  
      // Pages: All JS/JSX/TS/TSX files in the pages directory and its subdirectories
      "./pages/**/*.{js,jsx,ts,tsx}",
  
      // Public: Any HTML files in the public directory (if you have any)
      "./public/**/*.html",
  
      // Styles: All CSS and SCSS files in the styles directory
      "./styles/**/*.{css,scss}",
  
      // Utils: All JS/JSX/TS/TSX files in the utils directory and its subdirectories
      "./utils/**/*.{js,jsx,ts,tsx}",
  
      // Add any other directories or file types as needed
    ],
    options: {
      safelist: [],
    },
  },
  theme: {
    extend: {
      colors: {
        ...colors,
        background: "var(--background)",
        foreground: "var(--foreground)",
        'ggreen': '#367534',
        'gyellow': '#f8a716',
        'secondary_green':'#d4e4d4'
      },
      fontFamily: {
        georgia: ['Georgia Pro', 'serif'],
      },
      minHeight: {
        "screen-75": "75vh",
      },
      fontSize: {
        55: "55rem",
      },
      opacity: {
        80: ".8",
      },
      zIndex: {
        2: 2,
        3: 3,
      },
      inset: {
        "-100": "-100%",
        "-225-px": "-225px",
        "-160-px": "-160px",
        "-150-px": "-150px",
        "-94-px": "-94px",
        "-50-px": "-50px",
        "-29-px": "-29px",
        "-20-px": "-20px",
        "25-px": "25px",
        "40-px": "40px",
        "95-px": "95px",
        "145-px": "145px",
        "195-px": "195px",
        "210-px": "210px",
        "260-px": "260px",
      },
      height: {
        "95-px": "95px",
        "70-px": "70px",
        "350-px": "350px",
        "500-px": "500px",
        "600-px": "600px",
      },
      maxHeight: {
        "860-px": "860px",
      },
      maxWidth: {
        "100-px": "100px",
        "120-px": "120px",
        "150-px": "150px",
        "180-px": "180px",
        "200-px": "200px",
        "210-px": "210px",
        "580-px": "580px",
      },
      minWidth: {
        "140-px": "140px",
        48: "12rem",
      },
      backgroundSize: {
        full: "100%",
      },
    },
  },
  variants: [
    "responsive",
    "group-hover",
    "focus-within",
    "first",
    "last",
    "odd",
    "even",
    "hover",
    "focus",
    "active",
    "visited",
    "disabled",
  ],
  plugins: [
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
