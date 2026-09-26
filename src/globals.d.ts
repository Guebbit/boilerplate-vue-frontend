/**
 * Ambient globals Vite's `define` replaces with a literal at build time — never present at
 * runtime as an actual identifier, so each one is declared here rather than imported.
 */

/**
 * This package's own version, from `package.json`, for the default Faro `appVersion` telemetry
 * tag (`src/infrastructure/observability/config.ts`). Not a `VITE_*` var: it must always match
 * what was actually built, never a value an operator could accidentally override.
 */
declare const __APP_VERSION__: string;
