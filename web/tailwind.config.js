/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#111827',
          secondary: '#1E293B',
        },
        primary: {
          DEFAULT: '#3B82F6',
          foreground: '#FFFFFF',
        },
        accent: {
          pink: '#F43F5E',
          green: '#10B981',
        },
        card: {
          DEFAULT: '#1F2937',
          foreground: '#F9FAFB',
        },
        muted: {
          DEFAULT: '#374151',
          foreground: '#9CA3AF',
        },
        border: '#374151',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'lg': '1rem',
        'xl': '1.5rem',
        '2xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgb(59 130 246 / 0.5)' },
          '100%': { boxShadow: '0 0 20px rgb(59 130 246 / 0.8)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}