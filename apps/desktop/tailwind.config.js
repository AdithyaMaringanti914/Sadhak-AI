/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        foreground: "#ffffff",
        primary: {
          DEFAULT: "#00F2FF",
          dark: "#00B8C4",
          light: "#70FBFF",
        },
        secondary: {
          DEFAULT: "#7000FF",
          dark: "#4E00B3",
          light: "#A366FF",
        },
        accent: {
          DEFAULT: "#FF007A",
          dark: "#B30056",
          light: "#FF66AF",
        },
        surface: {
          DEFAULT: "#111111",
          light: "#1A1A1A",
          lighter: "#252525",
        }
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'neon-gradient': 'linear-gradient(135deg, #00F2FF 0%, #7000FF 100%)',
      },
      boxShadow: {
        'neon': '0 0 15px rgba(0, 242, 255, 0.3)',
        'neon-purple': '0 0 15px rgba(112, 0, 255, 0.3)',
      }
    },
  },
  plugins: [],
}
