---
source: tests/cross-cutting/form-idiom.spec.ts
sha256: 59ceb92c5e8f3c77fd680eb3c37c3541c34d4c153de9491942e893ed95e2dc61
signature: bc1b4dbb815c0d86e64ccd6bc882f623df1f513605946429d94a1692d022d2bc
generated_at: 2026-11-10T06:37:09.084242+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/form-idiom.spec.ts

## Purpose

A cross-cutting enforcement test that scans every `.vue` file under `src/modules` and asserts a single form idiom: every `useStructureFormValidation(...)` call supplies `revalidateOn` and `onInvalid`, every page-level form supplies `formElement`, and every routed record-editing view calls `useLeaveGuard`. It exists because five forms shipped missing at least one of these, and the failures were invisible to unit tests (a screen-reader user gets no focus signal on failed submit).

## Key elements

- **`componentFiles()`** — lists all `.vue` files in `src/modules` (recursive), excluding any path segment named `tests`.
- **`formComponents()`** — filters `componentFiles()` to those whose source mentions `useStructureFormValidation`; this is the population the rules apply to.
- **`formViews()`** — filters to files under a `views/` segment that reference the validation toolkit, `useTranslatedEntityForm`, or `<TranslationTabs`.
- **`formValidationCallsOf(source)`** — extracts each `useStructureFormValidation(...)` call via balanced-paren scanning (handles generic type args like `<{ email?: string }>`).
- **`optionKeysOf(call)`** — parses a call snippet with the TypeScript compiler API, reads the last argument as an `ObjectLiteralExpression`, and returns its real property names. Spreads are skipped; a bare variable yields `[]`.
- **`propertyNamesOf(node)`** — extracts identifier names from property assignments, shorthand properties, and method declarations in an AST object literal.
- **`NO_LEAVE_GUARD`** — explicit allowlist (with one-line reasons) of five one-shot views exempt from the `useLeaveGuard` requirement.
- **`describe('one form idiom')`** — three assertions: both toolkit options present, `formElement` present on page forms, and the population is non-empty (guard-on-the-guard).
- **`describe('leave guard on record-editing pages')`** — every non-exempt form view calls `useLeaveGuard`; population exceeds the allowlist size.
- **`describe('optionKeysOf — real keys, not a substring match')`** — unit tests for the parser itself, proving it is not fooled by the word in a comment, a string, or a spread.

## Relationships

- **`src/modules/shop-tasks/tests/notices.spec.ts`** — lives inside a `tests/` directory and is therefore explicitly excluded from `componentFiles()`; this spec's rules do not apply to it. It is a sibling test in the same cross-cutting suite.
- **`tests/unit/kernel/use-badge-refresh.spec.ts`** — a unit test outside the `src/modules` scan scope; shares the repo's testing conventions but is not validated by this file.

## Notes

- **AST over regex.** `optionKeysOf` uses `ts.createSourceFile` on the isolated call snippet. A substring check like `call.includes('revalidateOn')` would pass if the word appeared in a comment or an unrelated string within the same call. The docblock and the dedicated `describe` block both call this out as a prior failure mode.
- **Guard on the guard.** Two tests assert the populations are non-empty (or exceed the allowlist size) so that deleting every form module does not silently turn the rules into vacuous passes.
- **Dialogs are exempt from `formElement`.** The second rule only filters out files under a `components/` segment (the assumed location of dialogs). Dialogs already trap focus, so moving focus into them is a different concern.
- **Spreads are intentionally unresolvable.** If a call passes `...rest` as part of its options object, `optionKeysOf` returns only the statically named keys. A form that hides `revalidateOn` inside a spread will fail the rule — by design, the idiom requires the key to be visible at the call site.
- **Filesystem scan, not import graph.** This test reads `.vue` files as text on disk. It does not execute them, build them, or resolve imports. A renamed composable or a moved file will change the population silently.
