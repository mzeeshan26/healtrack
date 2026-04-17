/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        backgroundGradientStart: '#F8FAFC',
        backgroundGradientEnd: '#EEF2FF',
        primary: '#4F46E5',  // Deep Indigo
        secondary: '#06B6D4', // Vibrant Cyan/Teal (Premium Medical Feel)
        tertiary: '#8B5CF6', // Purple/Violet
        success: '#10B981', // Emerald
        warning: '#F59E0B', // Amber
        critical: '#EF4444', // Red
        textPrimary: '#0F172A',
        textSecondary: '#64748B',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        blob: "blob 7s infinite",
        heartbeat: "heartbeat 1s infinite",
        'pulse-fast': "pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        'float': "float 6s ease-in-out infinite",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        heartbeat: {
          "0%, 100%": { transform: "scale(1)" },
          "15%": { transform: "scale(1.25)" },
          "30%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.15)" },
          "60%": { transform: "scale(1)" }
        },
        'pulse-fast': {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: .5 }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        }
      }
    },
  },
  plugins: [],
}
