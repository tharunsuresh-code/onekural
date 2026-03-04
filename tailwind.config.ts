import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        emerald: "#1B5E4F",
        "emerald-light": "#2A7D6F",
        "deep-red": "#A83C3C",
        cream: "#FFFFFF",
        dark: "#1A1A1A",
        // Dark mode specific
        "dark-bg": "#0F0E0C",
        "dark-fg": "#F5F1ED",
        "dark-subtle": "#2D2520",
      },
      fontFamily: {
        tamil: ["var(--font-noto-tamil)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      maxWidth: {
        content: "680px",
      },
      backgroundColor: {
        base: "var(--bg-base)",
      },
      textColor: {
        base: "var(--text-base)",
      },
    },
  },
  plugins: [],
};

export default config;
