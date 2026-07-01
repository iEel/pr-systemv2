import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        shell: "oklch(var(--shell) / <alpha-value>)",
        panel: "oklch(var(--panel) / <alpha-value>)",
        surface: "oklch(var(--surface) / <alpha-value>)",
        ink: "oklch(var(--ink) / <alpha-value>)",
        muted: "oklch(var(--muted) / <alpha-value>)",
        border: "oklch(var(--border) / <alpha-value>)",
        primary: "oklch(var(--primary) / <alpha-value>)",
        info: "oklch(var(--info) / <alpha-value>)",
        success: "oklch(var(--success) / <alpha-value>)",
        warning: "oklch(var(--warning) / <alpha-value>)",
        danger: "oklch(var(--danger) / <alpha-value>)",
      },
      boxShadow: {
        panel: "0 8px 18px rgb(15 38 80 / 0.08)",
        popover: "0 14px 30px rgb(15 38 80 / 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
