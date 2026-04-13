import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        stampede: {
          red: '#CC0000',
          black: '#0A0A0A',
          white: '#FFFFFF',
        },
        status: {
          potential: '#F59E0B',
          ranked: '#CC0000',
          'ruled-out': '#6B7280',
          negotiation: '#EA580C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
