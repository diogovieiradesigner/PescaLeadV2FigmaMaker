/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Theme
        'true-black': '#000000',
        'elevated': '#181818',
        'primary-blue': '#0169D9',
        'secondary-cyan': '#00CFFA',
        'text-primary-dark': '#FFFFFF',
        'text-secondary-dark': 'rgba(255, 255, 255, 0.7)',
        'border-dark': 'rgba(255, 255, 255, 0.08)',
        'border-elevated': 'rgba(255, 255, 255, 0.05)',

        // Light Theme
        'light-bg': '#FFFFFF',
        'light-elevated': '#F8F9FA',
        'light-elevated-hover': '#F0F1F3',
        'text-primary-light': '#1A1A1A',
        'text-secondary-light': 'rgba(26, 26, 26, 0.6)',
        'border-light': 'rgba(0, 0, 0, 0.08)',
        'border-light-elevated': 'rgba(0, 0, 0, 0.05)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0169D9 0%, #00CFFA 100%)',
        'gradient-hover': 'linear-gradient(135deg, #0184F5 0%, #1ADBFF 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 207, 250, 0.3)',
        'hover': '0 4px 12px rgba(0, 207, 250, 0.1)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.5)',
        'light': '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}

