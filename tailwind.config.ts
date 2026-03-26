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
        primary: {
          DEFAULT: "#4F46E5",
          dark: "#3730A3",
          light: "#EEF2FF",
        },
        secondary: {
          DEFAULT: "#0EA5E9",
          light: "#F0F9FF",
        },
        success: {
          DEFAULT: "#10B981",
          light: "#ECFDF5",
          dark: "#065F46",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FFFBEB",
          dark: "#92400E",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FEF2F2",
          dark: "#991B1B",
        },
        sidebar: {
          DEFAULT: "#1E1B4B",
          hover: "#312E81",
        },
        bg: {
          main: "#F8FAFC",
          card: "#FFFFFF",
        },
        text: {
          primary: "#0F172A",
          secondary: "#475569",
          muted: "#94A3B8",
        },
        border: {
          DEFAULT: "#E2E8F0",
          focus: "#4F46E5",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06)",
        modal: "0 20px 60px rgba(0,0,0,0.15)",
        header: "0 1px 3px rgba(0,0,0,0.08)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "slide-in-left": "slide-in-left 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "bounce-in": "bounce-in 0.6s ease-out forwards",
        shimmer: "shimmer 2s infinite",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
