---
source: tests/cross-cutting/form-idiom.spec.ts
sha256: 00adf578559c301d1f43287097781775a6f54970c2838d0dc567f16bb950aa28
generated_at: 2026-10-17T02:00:37.838350+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/form-idiom.spec.ts

## Purpose

Enforces a single form idiom across every `.vue` component in `src/modules` that calls `useStructureFormValidation`. It statically scans source text (via the TypeScript compiler API) to verify three rules: every call supplies `revalidateOn`, `invalidFieldSelector`, and `onInvalid`; no view declares its own `showErrors` ref alongside the composable's `showFormErrors`; and page forms (outside `components/`) pass a `formElement`. The file exists because thirteen real forms proved the toolkit's defaults are not sufficient on their own — missing options cause silent accessibility failures (no focus move on invalid submit) that no unit test would catch.

## Key elements

- **`componentFiles()`** — recursively lists all `.vue` files under `src/modules`, excluding anything in a `tests` directory.
- **`formComponents()`** — narrows to files whose source contains `useStructureFormValidation`; this is the population all three rules apply to.
- **`formValidationCallsOf(source)`** — extracts each call's full text via balanced-paren matching (handles generic type arguments like `useStructureFormValidation<{…}>` that would break a regex).
- **`propertyNamesOf(objectLiteral)`** — reads property names from a `ts.ObjectLiteralExpression` node (covers assignment, shorthand, and method-shorthand; skips spreads).
- **`optionKeysOf(call)`** — parses a call snippet as a standalone TS source file, walks to the last argument, and returns its object-literal keys. Returns `[]` when the options argument is a bare variable or absent.
- **`describe('one form idiom')`** — the three enforcement tests plus a "guard on the guard" test asserting the population is non-empty.
- **`describe('optionKeysOf — real keys, not a substring match')`** — unit tests for the parser helper, confirming it reads actual AST keys and is not fooled by comments, strings, or variable-passed options.

## Relationships

- **`src/modules/notifications/tests/use-inbox-lifecycle.spec.ts`** — part of the same module tree this file scans. The notifications module's `.vue` components are included in `formComponents()` and therefore subject to all three idiom rules. The spec file itself is excluded from the scan (it lives in a `tests` directory), but any sibling `.vue` component in that module that calls `useStructureFormValidation` must pass here.

## Notes

- **Static, not runtime.** This test reads and parses source text; it never mounts a component. It cannot detect a `formElement` ref that is `null` at runtime — only that the key is present in the options object.
- **Dialogs are exempt from `formElement`.** Files under a `components/` subdirectory are filtered out of the third test on the assumption that dialogs already trap focus.
- **Guard on the guard.** The final test in the first `describe` asserts `formComponents().length > 0`. A floor of 1 (not a specific count) so that deleting a domain module doesn't silently vacate the other three assertions.
- **Parsing over matching.** The docblocks on `optionKeysOf` and `formValidationCallsOf` explain why the file parses AST rather than using `.includes()` or regex: a comment or string containing the target word would satisfy a substring check, and generic type arguments break naive paren-scanning.
- **`...spread` in options is silently skipped.** If a call spreads a shared options object (`...rest`), this test cannot verify those keys and will flag the call as incomplete. Call sites must name the three options explicitly.
