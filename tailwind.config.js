/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'navy': '#0a0f1e',
        'navy-light': '#111827',
        'navy-card': '#1a2235',
        'cyan-accent': '#00d4ff',
        'cyan-dim': '#0099bb',
        'green-status': '#00ff88',
        'amber-warn': '#ffaa00',
        'red-alert': '#ff4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
