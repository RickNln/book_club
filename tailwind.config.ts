import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0B1220",
        surface: "#121B2B",
        raised: "#18233A",
        line: "#22304A",
        ink: "#E7EDF6",
        muted: "#8A98AF",
        teal: "#2CE0C7",
        lamp: "#FFB547",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "20px" },
    },
  },
  plugins: [],
} satisfies Config;
