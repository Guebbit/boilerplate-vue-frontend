# src/infrastructure/i18n/dom.ts

## Purpose

A single-purpose DOM utility that keeps the `<html>` element's `lang` and `dir` attributes in sync with the active locale. It is deliberately decoupled from the i18n module's internal state (e.g. vue-i18n) so the function remains a plain, dependency-free DOM write.

## Key elements

- **`applyHtmlLocaleAttributes(locale: string, direction: 'ltr' | 'rtl'): void`** — Sets `lang` and `dir` on `<html>`. Receives the direction as an explicit argument rather than deriving it internally, preserving the file's statelessness. Uses `document.querySelector('html')` with optional chaining, so it is a safe no-op if the element is absent (e.g. during SSR or unit tests).

## Relationships

- **`src/infrastructure/i18n/index.ts`** — The i18n module's public entry point is the expected caller. It resolves the active locale and direction from its own state, then invokes `applyHtmlLocaleAttributes` as a side-effect. This file imports nothing from that module, keeping the dependency arrow one-directional.

## Notes

- The function is fire-and-forget (returns `void`); callers cannot await or observe whether the DOM was actually updated.
- Direction is **not** inferred from the locale code here. The caller must supply the correct `'ltr'` or `'rtl'` value, which means a wrong argument will silently produce a mis-rendered page with no runtime error.
- Because it touches `document` directly, it will throw (or no-op) in any environment without a DOM. There is no guard beyond the optional chaining on the query result.
