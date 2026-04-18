import nextConfig from "eslint-config-next/core-web-vitals";
import tsConfig from "eslint-config-next/typescript";

export default [
  { ignores: ["node_modules/**", ".next/**", "v0/**", "v0card/**", "public/**", "playwright-report/**"] },
  ...nextConfig,
  ...tsConfig,
];
