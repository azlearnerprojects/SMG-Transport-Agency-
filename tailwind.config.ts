import type { Config } from 'tailwindcss';

/**
 * SMG Transport Agency design tokens.
 * Brand palette and typography are sourced directly from the intake form (Section 6):
 *  - Deep Navy Blue  #003366  (trust, professionalism)
 *  - Bright Gold/Amber #FFC107 (energy, youthfulness)
 *  - White / Light Grey #F5F5F5 (clean backgrounds, dividers)
 * Headings: Montserrat. Body: Open Sans. Both loaded via next/font in layout.tsx.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        navy: {
          DEFAULT: '#003366',
          50: '#e6eef5',
          100: '#cdddeb',
          200: '#9bbbd7',
          300: '#6999c3',
          400: '#3777af',
          500: '#1a5a96',
          600: '#003366',
          700: '#002b56',
          800: '#002145',
          900: '#001833',
        },
        gold: {
          DEFAULT: '#FFC107',
          50: '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#FFC107',
          600: '#ffb300',
          700: '#ffa000',
          800: '#ff8f00',
          900: '#ff6f00',
        },
        cloud: '#F5F5F5',
        // Semantic tokens mapped to CSS variables (see globals.css)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        heading: ['var(--font-montserrat)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-open-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 51 102 / 0.08), 0 1px 2px -1px rgb(0 51 102 / 0.08)',
        'card-hover': '0 10px 30px -10px rgb(0 51 102 / 0.25)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
