/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media', // ユーザーのシステム設定に従う
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './client/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
