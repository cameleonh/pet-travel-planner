import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "coverage/**",
    "playwright-report/**",
    // vendored third-party engine (MIT) — see src/features/weather-hero/sim/LICENSE.txt
    "src/features/weather-hero/sim/**",
    // upstream clone kept temporarily for reference; not part of the app
    ".tmp-vendor/**",
  ]),
  {
    // scripts/ is CommonJS by design (node scripts without package type),
    // so require() there is legitimate, unlike in src/.
    files: ["scripts/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);
