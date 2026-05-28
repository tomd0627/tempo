module.exports = {
  extends: ["stylelint-config-standard"],
  plugins: ["stylelint-order"],
  rules: {
    "media-feature-range-notation": null,
    "order/properties-alphabetical-order": true,
    "selector-class-pattern": [
      "^[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$",
      { message: "Expected BEM-style class selector" },
    ],
  },
};
