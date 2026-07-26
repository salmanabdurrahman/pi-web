const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-desktop-dev/**",
      "node_modules/**",
      "references/**",
      "desktop/dist/**",
    ],
  },
  {
    plugins: {
      "@typescript-eslint": {
        rules: {
          "no-require-imports": {
            create() {
              return {};
            },
          },
        },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
];

export default eslintConfig;
