/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B1F3A',
          800: '#0F274A',
          700: '#14325C',
          600: '#1D457D',
        },
        teal: {
          500: '#0F9D8A',
          400: '#14B8A6',
          50: '#E6F6F3',
        },
        surface: {
          bg: '#F6F8FB',
          card: '#FFFFFF',
          line: '#E2E8F0',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
        status: {
          matched: '#16A34A',
          matchedBg: '#E8F8EE',
          mismatch: '#DC2626',
          mismatchBg: '#FDECEC',
          notVerified: '#B45309',
          notVerifiedBg: '#FEF6E0',
          info: '#2563EB',
          infoBg: '#EAF1FE',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
