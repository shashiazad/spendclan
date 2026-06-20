/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enables class-driven dark mode switching
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: 'var(--background)',
          canvas: 'var(--canvas-background)',
          card: 'var(--card-background)',
          border: 'var(--card-border)',
          sidebar: 'var(--sidebar-surface)',
          text: {
            primary: 'var(--text-primary)',
            secondary: 'var(--text-secondary)',
            tertiary: 'var(--text-tertiary)',
          },
          blue: 'var(--apple-blue)',
          green: 'var(--apple-green)',
          red: 'var(--apple-red)',
        }
      },
      backdropBlur: {
        'apple': '20px',
      }
    },
  },
  plugins: [],
}
