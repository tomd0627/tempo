import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["js/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        idbKeyval: "readonly",
        lucide: "readonly",
        Db: "readonly",
        Utils: "readonly",
        Log: "readonly",
        Radial: "readonly",
        Grid: "readonly",
        Stats: "readonly",
      },
    },
    rules: {
      "no-console": "warn",
      "no-redeclare": ["error", { builtinGlobals: false }],
      "no-unused-vars": "error",
      eqeqeq: "error",
    },
  },
];
