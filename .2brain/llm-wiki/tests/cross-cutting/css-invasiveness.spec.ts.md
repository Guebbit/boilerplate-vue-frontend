---
source: tests/cross-cutting/css-invasiveness.spec.ts
sha256: 216043e0b20a5dda09ef9cfc7c709a418420f6435ef644a9b5cc9156df3f99b9
signature: 8376c9e1909e3a355a2b71c3e15d73ec59e8e294d222a57a0dc8c29ce3da0316
generated_at: 2026-11-10T06:35:54.803261+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/css-invasiveness.spec.ts

## Purpose

A Vitest gate that enforces "zero invasive CSS" in the app. Invasive means: selectors reaching into Vuetify internals, raw `z-index` values, redefined utility classes, native `title` tooltips, and scripts that query Vuetify's DOM. The test scans the entire codebase, asserts no findings, and also fires every check against a minimal sample to guarantee a check cannot silently stop matching and pass the ratchet by finding nothing. The only escape hatch is a `/* css-allow <check> -- <why> */` comment.

## Key elements

- **`CHECK_IDS`** — derived from `Object.keys(CHECKS)`; drives the per-check "no hit" assertions and the sample-fire matrix.
- **`sample(css, scoped)`** — builds a synthetic `CssSource` so sample cases need no real file.
- **`cssChecks(css)`** / **`templateChecks(tpl)`** / **`scripts(text)`** / **`sfcChecks(source)`** — thin wrappers that run the appropriate scanner, apply allowances, and return the list of fired `CheckId`s. Used by every sample and grammar test.
- **`describe('invasive CSS, as a gate')`** — calls `scanApp()` in `beforeAll`; asserts ≥ 3 CSS sources, > 100 Vue files (non-vacuous read), then `it.each(CHECK_IDS)` asserts zero findings per check.
- **`describe('each CSS check fires on a sample')`** — table-driven: each check must fire on a minimal offending snippet; clean CSS must not fire any check.
- **`describe('each template and script check fires on a sample')`** — same idea for template-level checks (`vuetify-arbitrary-variant`, `native-title`, `vuetify-variable`, `touch-size-utility`) and script-level checks (`vuetify-dom-query`, `vuetify-unknown-class`), plus the scoped `vuetify-root-override` case.
- **`describe('the css-allow grammar')`** — verifies the allowance comment covers exactly one rule/element/line for one named check, and that malformed allowances (no reason, unknown check, nothing to cover, two Vuetify parts) produce `bad-allowance` or `stale-allowance` findings.

## Relationships

- **`scripts/audit/css-invasive/scan.ts`** — sole source of scanning logic. This file imports `scanApp`, `scanCss`, `scanTemplate`, `scanScript`, `templateContext`, `applyAllowances`, the `CHECKS` registry, and the `CheckId` / `CssFinding` types. All assertions in this spec are about the output of those functions.
- **`scripts/css-sources.ts`** — provides `cssSources`, `documentCssSources`, `vueFiles`, and the `CssSource` type. Used in the non-vacuous "reads the app" assertion and by `sample()` to construct a valid source object.
- **`CLAUDE.md`** — project-level documentation; this spec is the executable enforcement of the CSS-invasiveness rules documented there. `npm run audit:css` (mentioned in failure messages) is the human-facing counterpart.

## Notes

- **Ratchet semantics**: the gate only tightens. A new invasive rule fails the suite; the fix is either to rewrite the CSS or to add a `css-allow` comment with a reason. There is no way to loosen an existing allowance.
- **Sample-fire tests are load-bearing**: they exist specifically so a regex/logic regression in `scan.ts` (check silently stops matching) is caught here rather than manifesting as a false "all clear."
- **`vuetify-root-override`** is scoped-style-specific: it fires when a `<style scoped>` rule restyles a Vuetify tag *by the class you put on it*, but not when the rule only sets a CSS custom property (which is considered feeding your own cascade).
- **`vuetify-dom-query`** matches any string literal naming a Vuetify class in a script, but explicitly excludes comments (tested: `/* the .v-field wrapper */` does not fire).
- **`vuetify-unknown-class`** distinguishes classes Vuetify ships (e.g. `.v-field`) from those it does not (e.g. `.v-data-table-headers--loading`); a shipped class does not trigger this check.
- **`css-allow` scoping**: one comment covers the *immediately next* rule (CSS), element (template), or line (script) for *exactly one* check. It does not propagate to sibling selectors or the next rule.
