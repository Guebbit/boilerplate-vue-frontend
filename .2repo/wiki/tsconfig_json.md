# tsconfig.json

## Purpose

This is the root TypeScript project-references configuration. It does not compile any source files itself (`"files": []`) but acts as the top-level entry point that ties together the project's constituent TypeScript configurations (Node, app, and Vitest) via project references.

## Key elements

- **`"files": []`** — Explicitly compiles zero files; the root config is purely a container for references.
- **`"references"`** — Array of `path` entries pointing to the three sub-projects (`./tsconfig.node.json`, `./tsconfig.app.json`, `./tsconfig.vitest.json`). A tool that invokes `tsc -b` (build mode) on this file will build all three referenced projects in dependency order.
- **`"compilerOptions".module`** — Set to `"NodeNext"`, establishing the module-resolution mode for the root. Sub-project configs can override this, but it serves as the default inherited by any referenced project that does not specify its own `module` setting.

## Relationships

- **tsconfig.app.json** — Referenced as a project; contains the application's source-level compiler settings.
- **tsconfig.node.json** — Referenced as a project; typically holds configuration for tooling/build scripts run under Node.
- **tsconfig.vitest.json** — Referenced as a project; carries settings specific to the Vitest test runner.

> `tsconfig.cypress.json` appears in the dependency graph but is **not** listed in this file's `references` array. It is managed independently and is not built as part of this root project.

## Notes

- Because `"files"` is empty, running a plain `tsc` (non-build) against this file will produce no output and no type-checking. Always use `tsc -b` (build mode) or target a specific sub-project config directly.
- The `module: "NodeNext"` option in the root `compilerOptions` is largely cosmetic here since no files are compiled at this level; its practical effect depends on whether sub-projects inherit or override it.
