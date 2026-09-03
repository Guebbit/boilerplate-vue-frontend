# tests/cross-cutting/form-idiom.spec.ts

## Purpose

Cross-cutting spec that enforces a uniform "form idiom" across every Vue component that calls `useStructureFormValidation`. It replaces the removed `useAppForm` composable as the mechanism that *forces* three required call-site answers (`revalidateOn`, `invalidFieldSelector`, `onInvalid`), a single source of truth for error-visibility state, and a focus target for page-level forms. It works by reading `.vue` source files from disk and inspecting their text, not by importing or rendering components.

## Key elements

- **`componentFiles()`** — Recursively lists every `.vue` file under `src/modules/`, excluding any path segment containing `tests`.
- **`sourceOf(file)`** — Reads and returns a file's raw text content.
- **`formComponents()`** — Narrows `componentFiles()` to only those whose source mentions `useStructureFormValidation`; this is the population every rule applies to.
- **`formValidationCallsOf(source)`** — Extracts the full argument text of each `useStructureFormValidation(...)` call by manual parenthesis-depth matching (handles generic type parameters like `<{ email?: string }>` and avoids matching template `ref="formElement"` attributes).
- **`describe('one form idiom')`** — Four `it` blocks:
  1. Every call supplies all three required options (`revalidateOn`, `invalidFieldSelector`, `onInvalid`).
  2. No component declares its own `const showErrors = ref(...)` alongside the toolkit's `showFormErrors`.
  3. Page-level forms (files *not* under a `components/` directory) pass a `formElement` option.
  4. Meta-guard: `formComponents()` must contain more than 10 entries, so an empty population cannot silently pass the other three.

## Relationships

No graph neighbors are recorded for this file. It is a self-contained spec that depends only on `node:fs`, `node:path`, `node:url`, and `vitest` — it does not import any application module.

## Notes

- The tests are purely textual (string / regex / paren matching). They will not catch a component that satisfies the idiom at runtime but whose source text is refactored in a way that hides the expected identifiers.
- Dialog components (those whose path includes a `components/` segment) are exempt from the `formElement` rule; the spec assumes dialogs trap focus on their own.
- `formValidationCallsOf` intentionally avoids regex for argument extraction because generic type arguments (`<{ email?: string }>`) and template attributes like `ref="formElement"` break naive whole-file searches.
- The paren-matching loop assumes balanced parentheses and does not handle strings containing unbalanced parens; this is acceptable for the call shapes used in this codebase.
