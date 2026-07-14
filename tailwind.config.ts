import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * SMG Transport Agency design tokens.
 * SMG preview brand palette:
 *  - Travel Blue #4F9BE8
 *  - Deep Navy   #003366
 *  - Warm Peach  #F7B267
 *  - Cloud Grey  #F5F7FA
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
          DEFAULT: '#F7B267',
          50: '#fff7ef',
          100: '#ffecd8',
          200: '#ffd6ad',
          300: '#F7B267',
          400: '#f49b45',
          500: '#e98325',
          600: '#c86718',
          700: '#9f4d16',
          800: '#7f3e18',
          900: '#663317',
        },
        blue: {
          DEFAULT: '#4F9BE8',
          50: '#eef7ff',
          100: '#d8ecff',
          200: '#b9ddff',
          300: '#89c6ff',
          400: '#4F9BE8',
          500: '#2d7ed0',
          600: '#1d63ad',
          700: '#194f8c',
          800: '#183f70',
          900: '#17365e',
        },
        // Warm action orange — reserved for primary calls to action on the
        // public marketing surfaces (hero, header CTA, route cards).
        orange: {
          DEFAULT: '#FF8A1F',
          50: '#fff4e8',
          100: '#ffe6cc',
          200: '#ffcd99',
          300: '#ffb266',
          400: '#ff9d3d',
          500: '#FF8A1F',
          600: '#E8730C',
          700: '#c25e08',
          800: '#9a4b0d',
          900: '#7c3d0f',
        },
        cloud: '#F5F7FA',
        // Very light blue-grey page canvas used on the marketing homepage.
        pagebg: '#F7FAFE',
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
  plugins: [animate],
};

export default config;
