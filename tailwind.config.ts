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
          DEFAULT: "#0D9488",
          dark: "#0F766E",
          light: "#F0FDFA",
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
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
          DEFAULT: "#DB3F3E",
          light: "#FEF1F1",
          dark: "#8B1A1A",
        },
        sidebar: {
          DEFAULT: "#0B1929",
          hover: "#122A42",
          accent: "#163352",
          glass: "rgba(255,255,255,0.06)",
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
          focus: "#0D9488",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        "card-hover": "0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -2px rgba(0,0,0,0.04)",
        modal: "0 25px 65px -15px rgba(0,0,0,0.25), 0 8px 20px -8px rgba(0,0,0,0.1)",
        header: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)",
        glow: "0 0 20px rgba(13,148,136,0.15)",
        "glow-success": "0 0 20px rgba(16,185,129,0.15)",
        "glow-warning": "0 0 20px rgba(245,158,11,0.15)",
        "glow-danger": "0 0 20px rgba(219,63,62,0.15)",
        dropdown: "0 12px 36px -8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
        "inner-glow": "inset 0 1px 0 0 rgba(255,255,255,0.05)",
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
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
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
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "rgba(79,70,229,0.3)" },
          "50%": { borderColor: "rgba(79,70,229,0.6)" },
        },
        "counter-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "notification-pop": {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "slide-in-left": "slide-in-left 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "slide-up": "slide-up 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
        "bounce-in": "bounce-in 0.6s ease-out forwards",
        shimmer: "shimmer 2s infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "gradient-x": "gradient-x 3s ease infinite",
        "counter-up": "counter-up 0.4s ease-out forwards",
        "notification-pop": "notification-pop 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
      },
    },
  },
  plugins: [],
};
export default config;
