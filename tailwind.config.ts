import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#132238",
        paper: "#f7f4ec",
        brand: {
          DEFAULT: "#ef7d45",
          deep: "#b24a1f",
          soft: "#ffd3a0",
        },
        accent: {
          DEFAULT: "#157a6e",
          soft: "#d8f0eb",
        },
        danger: {
          DEFAULT: "#c63b2c",
          soft: "#fde2de",
        },
      },
      boxShadow: {
        card: "0 18px 45px rgba(19, 34, 56, 0.12)",
      },
      fontFamily: {
        display: ['"BIZ UDPGothic"', '"Hiragino Sans"', '"Yu Gothic"', "Meiryo", "sans-serif"],
        body: ['"BIZ UDPGothic"', '"Hiragino Sans"', '"Yu Gothic"', "Meiryo", "sans-serif"],
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top right, rgba(239, 125, 69, 0.2), transparent 34%), radial-gradient(circle at top left, rgba(21, 122, 110, 0.18), transparent 30%)",
      },
      keyframes: {
        rise: {
          "0%": {
            opacity: "0",
            transform: "translateY(14px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        rise: "rise 320ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
