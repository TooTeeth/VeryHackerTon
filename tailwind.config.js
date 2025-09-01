module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bronze: "#e6be8a",
      },
      keyframes: {
        float: {
          "0%, 100%": {
            transform: "translateX(-50%) translateY(0)",
          },
          "50%": {
            transform: "translateX(-50%) translateY(-10px)",
          },
        },
      },
      animation: {
        float: "float 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
