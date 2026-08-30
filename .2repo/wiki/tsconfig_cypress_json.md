# tsconfig.cypress.json

## Purpose

A TypeScript project-references config dedicated to compiling Cypress end-to-end specs. It isolates the `tests/e2e` and per-module `tests/e2e` directories from the main app build so they receive Cypress' ambient types instead of the application's, and so the app's `exclude` globs don't accidentally leave them untyped.

## Key elements

- **`extends: "./tsconfig.app.json"`** – inherits base compiler options (target, module, strictness, etc.) from the app config, then overrides what's needed.
- **`include`** – explicitly pulls in `tests/e2e/**`, `tests/support/e2e/**`, `src/modules/*/tests/e2e/**`, and `cypress.config.ts`. This is the only project that claims module-level e2e specs (the app config excludes `src/modules/*/tests/**`).
- **`exclude: []`** – clears any inherited exclusions so the `include` list is authoritative.
- **`compilerOptions.composite: true`** – enables project-references (incremental builds, `.d.ts` output) so `tsc -b` can treat this as a buildable unit.
- **`compilerOptions.tsBuildInfoFile`** – writes the incremental build cache to `node_modules/.tmp/` to keep the source tree clean.
- **`compilerOptions.lib: []`** – removes the default DOM/ES lib references inherited from the parent.
- **`compilerOptions.types: ["cypress", "node", "jsdom"]`** – scopes ambient type declarations to exactly what the test environment needs, excluding the app's type packages.

## Relationships

- **`cypress.config.ts`** – Included in this project's `include` list so it is type-checked here (not in the app project). The `specPattern` defined in that config determines which files on disk these globs actually match.
- **`tsconfig.json`** – The solution-style root that (presumably) lists this file under `"references"`, making it a buildable project for `tsc -b`. It does **not** include this project's files directly.

## Notes

- The `include` globs for module e2e specs (`src/modules/*/tests/e2e/**`) are intentionally split out from the app's exclusion of `src/modules/*/tests/**`. If you add new spec directories, they must be added here *and* the app's exclude must keep them out of the app project.
- Because `lib` is emptied, any code in the included files that relies on DOM types (e.g. `document`, `window`) will fail to compile unless `jsdom`'s types or a re-include of the DOM lib is added.
- `composite: true` means this project must produce `.d.ts` output and cannot have certain option conflicts with the parent; watch for "Composite projects may not disable declaration emit" errors if options are changed.
