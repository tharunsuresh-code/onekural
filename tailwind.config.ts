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
        saffron: "#F4A528",
        "deep-red": "#8B1A1A",
        cream: "#FAF7F2",
        dark: "#1A1A1A",
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
