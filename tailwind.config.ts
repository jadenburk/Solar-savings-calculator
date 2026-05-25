import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "sun-green": "#00A651",
        "edison-red": "#D32F2F",
      },
    },
  },
  plugins: [],
};

export default config;
