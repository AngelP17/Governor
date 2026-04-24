/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "Satoshi", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        graphite: "#05070A",
        panel: "#0D1117",
        panel2: "#111827",
        line: "rgba(148, 163, 184, 0.16)",
        muted: "#94A3B8",
        healthy: "#34D399",
        warn: "#F59E0B",
        failure: "#FB7185",
        observe: "#38BDF8",
      },
      boxShadow: {
        surface: "0 18px 60px -40px rgba(15, 23, 42, 0.95)",
      },
    },
  },
  plugins: [],
};
