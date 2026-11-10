---
source: scripts/audit/design-manual/scripts/capture-scope.ts
sha256: 279fccd046d3174a04361d0721098bf8f66161c156046a3988a45053a3a32a3f
signature: 937193a0f0213e2288e96114be173ad96ee2e518e14cf2b4d5795242cfa0125f
generated_at: 2026-11-10T02:20:45.311150+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/design-manual/scripts/capture-scope.ts

## Purpose

Resolves a user-typed scope argument (empty, `shell`, a module name, a file path, or `--diff`) into the concrete list of E2E sweep spec files the capture should run. It is a pure function: filesystem access and git state are injected via `ScopeInput`, so tests can stub both without touching disk.

## Key elements

- **`SHELL_SPEC`** – Constant for the shell's own a11y sweep (`tests/e2e/specs/a11y.cy.ts`), the one sweep that lives outside any module.
- **`SHARED_PREFIXES`** – Readonly tuple (`src/app/`, `src/ui/`, `src/styles/`); a `--diff` scope that touches any of these widens to the full app.
- **`ScopeInput`** – Input contract: `scope`, known `modules`, an `exists` predicate, and optional `changedFiles`.
- **`ScopeResult`** – Output contract: ordered `specs` array plus a `widened` flag.
- **`specsOfModule(module, exists)`** – Returns the module's `a11y.cy.ts` sweep plus its `actions.cy.ts` spec (included only if `exists` reports it present).
- **`scopeToSpecs(input)`** – Main entry point. Dispatches on the four scope forms; throws `RangeError` when the scope names nothing recognizable or a `--diff` touches no known module.

## Relationships

- **`capture-matrix.ts`** – Provides `moduleOfSpec`, used by `scopeToSpecs` to map a file path to its owning module name.
- **`capture.ts`** – The parent capture script; consumes `ScopeResult` to decide which specs to execute.
- **`tests/unit/scripts/audit/capture-scope.spec.ts`** – Unit tests that exercise `scopeToSpecs` and `specsOfModule` with injected `exists`/`changedFiles` stubs.

## Notes

- `actions.cy.ts` is optional per module; the `exists` predicate is the only way the file is discovered, so adding a new actions spec file is sufficient to include it without code changes.
- The `widened` flag in `ScopeResult` is only ever `true` for the `--diff` + shared-prefix case; all other paths return `false`. Callers can use it to surface a "ran everything" notice.
- Scope resolution is case-sensitive and does not perform path normalization; the caller is expected to pass repo-relative, forward-slash paths.
