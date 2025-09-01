import { colors } from './src/tokens/colors';
import { spacing } from './src/tokens/spacing';
import { typography } from './src/tokens/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors,
      spacing,
      ...typography,
    },
  },
  plugins: [],
}
