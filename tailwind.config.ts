import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: "#C9964B",
        "deep-red": "#A83C3C",
        cream: "#FBF8F3",
        dark: "#2D2520",
      },
      fontFamily: {
        tamil: ["var(--font-noto-tamil)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      maxWidth: {
        content: "680px",
      },
    },
  },
  plugins: [],
};

export default config;
