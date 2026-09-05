import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    // Custom breakpoints matching useDevice hook
    screens: {
      xs: "375px",    // Small phones
      sm: "640px",    // Large phones / small tablets
      md: "768px",    // Tablets - MOBILE_BREAKPOINT
      lg: "1024px",   // Small laptops - TABLET_BREAKPOINT  
      xl: "1280px",   // Desktops
      "2xl": "1536px", // Large desktops
    },
    extend: {
      fontFamily: {
        sans: ["Outfit", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Outfit", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          elevated: "hsl(var(--card-elevated))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
        },
        status: {
          queue: "hsl(var(--status-queue))",
          "queue-foreground": "hsl(var(--status-queue-foreground))",
          ready: "hsl(var(--status-ready))",
          "ready-foreground": "hsl(var(--status-ready-foreground))",
          scheduled: "hsl(var(--status-scheduled))",
          "scheduled-foreground": "hsl(var(--status-scheduled-foreground))",
          production: "hsl(var(--status-production))",
          "production-foreground": "hsl(var(--status-production-foreground))",
          finished: "hsl(var(--status-finished))",
          "finished-foreground": "hsl(var(--status-finished-foreground))",
          paused: "hsl(var(--status-paused))",
          "paused-foreground": "hsl(var(--status-paused-foreground))",
          cancelled: "hsl(var(--status-cancelled))",
          "cancelled-foreground": "hsl(var(--status-cancelled-foreground))",
          delayed: "hsl(var(--status-delayed))",
          "delayed-foreground": "hsl(var(--status-delayed-foreground))",
          rework: "hsl(var(--status-rework))",
          "rework-foreground": "hsl(var(--status-rework-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        // Semantic surfaces
        surface: {
          success: "hsl(var(--surface-success))",
          warning: "hsl(var(--surface-warning))",
          destructive: "hsl(var(--surface-destructive))",
          info: "hsl(var(--surface-info))",
          muted: "hsl(var(--surface-muted))",
        },
        xp: {
          DEFAULT: "hsl(var(--xp))",
          foreground: "hsl(var(--xp-foreground))",
        },
        coins: {
          DEFAULT: "hsl(var(--coins))",
          foreground: "hsl(var(--coins-foreground))",
        },
        streak: {
          DEFAULT: "hsl(var(--streak))",
          foreground: "hsl(var(--streak-foreground))",
        },
        "rank-gold": {
          DEFAULT: "hsl(var(--rank-gold))",
          foreground: "hsl(var(--rank-gold-foreground))",
        },
        "rank-silver": {
          DEFAULT: "hsl(var(--rank-silver))",
          foreground: "hsl(var(--rank-silver-foreground))",
        },
        "rank-bronze": {
          DEFAULT: "hsl(var(--rank-bronze))",
          foreground: "hsl(var(--rank-bronze-foreground))",
        },
        indicator: {
          success: "hsl(var(--indicator-success))",
          warning: "hsl(var(--indicator-warning))",
          danger: "hsl(var(--indicator-danger))",
          info: "hsl(var(--indicator-info))",
          neutral: "hsl(var(--indicator-neutral))",
        },
        priority: {
          urgent: "hsl(var(--priority-urgent))",
          high: "hsl(var(--priority-high))",
          medium: "hsl(var(--priority-medium))",
          low: "hsl(var(--priority-low))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
        },
        "accent-cyan": "hsl(var(--accent-cyan))",
        "accent-purple": "hsl(var(--accent-purple))",
        "accent-orange": "hsl(var(--accent-orange))",
        "accent-pink": "hsl(var(--accent-pink))",
      },
      // Extended Z-Index Scale
      zIndex: {
        "hide": "-1",
        "base": "0",
        "docked": "10",
        "dropdown": "1000",
        "sticky": "1100",
        "banner": "1200",
        "overlay": "1300",
        "modal": "1400",
        "popover": "1500",
        "toast": "1600",
        "tooltip": "1700",
        "spotlight": "1800",
        "max": "9999",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 12px)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        "glow-primary": "var(--shadow-glow-primary)",
        "glow-success": "var(--shadow-glow-success)",
        elevated: "var(--shadow-md)",
      },
      spacing: {
        card: "1.5rem",
        "card-sm": "1rem",
        "card-lg": "2rem",
        section: "2rem",
        "section-lg": "3rem",
      },
      transitionDuration: {
        "75": "75ms",
        "100": "100ms",
        "150": "150ms",
        "200": "200ms",
        "250": "250ms",
        "300": "300ms",
        "400": "400ms",
        "600": "600ms",
        // Motion design system tokens
        instant: "var(--duration-instant)",
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
        slower: "var(--duration-slower)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        // Motion design system tokens
        standard: "var(--easing-standard)",
        enter: "var(--easing-enter)",
        exit: "var(--easing-exit)",
        bounce: "var(--easing-spring)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        shimmer: "shimmer 2s linear infinite",
        pulse: "pulse 2s ease-in-out infinite",
        enter: "fade-in 0.2s ease-out, scale-in 0.2s ease-out",
        exit: "fade-out 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;