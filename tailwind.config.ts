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
        genz: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1", // Primary Electric Indigo
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },
        neon: {
          coral: "#FF4D6D",
          purple: "#7928CA",
          cyan: "#00F5D4",
          lime: "#70E000",
          yellow: "#FEE440",
          pink: "#FF007F",
        },
        midnight: {
          950: "#07090E",
          900: "#0B0F19",
          850: "#101626",
          800: "#172036",
          700: "#1E293B",
          600: "#334155",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-outfit)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(99, 102, 241, 0.4)",
        "glow-coral": "0 0 25px -5px rgba(255, 77, 109, 0.4)",
        "glow-cyan": "0 0 25px -5px rgba(0, 245, 212, 0.3)",
      }
    },
  },
  plugins: [],
};
export default config;
