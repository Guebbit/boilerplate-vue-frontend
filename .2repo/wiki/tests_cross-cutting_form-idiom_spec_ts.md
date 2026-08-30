# tests/cross-cutting/form-idiom.spec.ts

## Purpose

A cross-cutting, source-scanning test that enforces one invariant: every form in the app is wired the same way. It guards against the three silent omissions (missing `useAppForm` indirection, a duplicate "show errors" flag, or a missing `formElement` focus target) that individually produce no hard failure but leave screen-reader users stranded after a failed submit. Thirteen forms once shipped with one or more of these gaps; this file exists so that regression is a test failure, not a silent UX gap.

## Key elements

- **`componentFiles()`** — Recursively lists every `.vue` file under `src/modules`, excluding files inside a `tests` directory.
- **`formComponents()`** — Narrows that list to files whose source mentions `useAppForm` or `useStructureFormValidation` (i.e. the forms that actually need the idiom).
- **`appFormCallsOf(source)`** — Extracts the full argument list of each `useAppForm(...)` call by walking parentheses (depth-counting), rather than by regex. This avoids false matches from template attributes like `ref="formElement"` or generic type parameters.
- **`describe('one form idiom')`** — Four tests:
  1. *Routes every form through `useAppForm`* — no component calls `useStructureFormValidation` directly.
  2. *Lets the composable own error visibility* — no component declares `const showErrors = ref(...)`.
  3. *Gives every page form an element to focus into* — non-`components/` forms pass `formElement` to `useAppForm`.
  4. *Is checking the forms it is meant to be checking* — population guard: `formComponents().length > 10`.

## Relationships

- **`docs/reference/tests.md`** — Documents the test-suite structure; this file is the cross-cutting layer it references for form-idiom enforcement.

## Notes

- **Dialogs are exempt from the `formElement` check.** Any file whose path contains `/components/` is skipped in test 3, on the rationale that a dialog already traps focus (see `use-app-form.ts` for the full argument).
- **Renaming is allowed, re-declaring is not.** `showFormErrors: showErrors` (a property rename of the composable's ref) passes; `const showErrors = ref(false)` does not.
- **Parenthesis matching, not regex, is deliberate.** A naive whole-file `.includes('formElement')` would be satisfied by a template attribute while the composable receives nothing. `appFormCallsOf` only inspects the actual call-site argument list.
- **The population guard (test 4) is the guard on the guards.** If the glob or filter logic regresses and `formComponents()` returns zero, tests 1–3 would pass vacuously. This test ensures that cannot happen silently.
- **Source-scanning, not runtime.** The test reads `.vue` files from disk via `node:fs`; it never imports or mounts a component. Adding a form to a new module directory outside `src/modules` will remove it from the population without any import change.
