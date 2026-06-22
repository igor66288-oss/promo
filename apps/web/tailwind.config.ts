import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#06B6D4',
        secondary: '#F97316',
        accent: '#FBBF24',
        background: '#030712',
      },
      fontFamily: {
        sarabun: ['Sarabun', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
