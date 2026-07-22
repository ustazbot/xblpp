import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        status: {
          draft: { fg: "hsl(var(--status-draft-fg))", border: "hsl(var(--status-draft-border))" },
          pending: { fg: "hsl(var(--status-pending-fg))", border: "hsl(var(--status-pending-border))" },
          approved: {
            fg: "hsl(var(--status-approved-fg))",
            border: "hsl(var(--status-approved-border))",
            bg: "hsl(var(--status-approved-bg))",
          },
          rejected: {
            fg: "hsl(var(--status-rejected-fg))",
            border: "hsl(var(--status-rejected-border))",
            bg: "hsl(var(--status-rejected-bg))",
          },
          waitlisted: {
            fg: "hsl(var(--status-waitlisted-fg))",
            border: "hsl(var(--status-waitlisted-border))",
            bg: "hsl(var(--status-waitlisted-bg))",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
