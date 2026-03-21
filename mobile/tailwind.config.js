/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        foreground: "#f8fafc",
        card: "#1e293b",
        "card-foreground": "#f8fafc",
        border: "#334155",
        primary: "#3b82f6",
        "primary-foreground": "#ffffff",
        secondary: "#6366f1",
        "secondary-foreground": "#ffffff",
        muted: "#334155",
        "muted-foreground": "#94a3b8",
        accent: "#8b5cf6",
        "accent-foreground": "#ffffff",
        destructive: "#ef4444",
        "destructive-foreground": "#ffffff",
        status: {
          online: "#22c55e",
          away: "#f59e0b",
          busy: "#ef4444",
          offline: "#9ca3af",
        },
      },
    },
  },
  plugins: [],
};
