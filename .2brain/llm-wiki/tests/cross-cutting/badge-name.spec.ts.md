---
source: tests/cross-cutting/badge-name.spec.ts
sha256: 1bf63e4e3d0fe99dac392eac208c383389b1e1d7b06d7051dd1c3ea33b651752
signature: 129eff8907e8362ab34d5e938853ba350a3d6f45dd2a70b5bda552bf20227ba0
generated_at: 2026-11-10T06:35:18.623093+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/badge-name.spec.ts

## Purpose
A cross-cutting invariant test that scans every `.vue` file under `src/` and asserts each `<v-badge>` element carries an accessible name (`label`, `aria-label`, or `aria-hidden`). It exists because Vuetify's badge renders a decorative wrapper with no accessible name by default, the missing attribute is visually invisible, and no linter knows what a `v-badge` is. The test pins the rule rather than enforcing it through a shared component, since badges appear in structurally different locations (list entries vs. icon buttons) that can't share markup.

## Key elements

- **`componentFiles(directory)`** — Recursively collects all `.vue` files under a directory, skipping any `tests` subdirectory.
- **`tagEnd(source, start)`** — Quote-aware scan for the `>` that closes a tag opened at `start`; correctly handles `>` inside quoted attribute values.
- **`badgeTagsOf(source)`** — Returns every `<v-badge>` opening tag in a file using the quote-aware `tagEnd` (avoids the naive `[^>]*` class that would truncate tags containing `>` in expressions like `count > 99`).
- **`isNamed(tag)`** — Boolean check that the tag string contains `label`, `aria-label`, or `aria-hidden` (with optional `:` binding prefix).
- **`badgesInSource()`** — Flattens all badge tags across all shipped components into `{ file, tag }` pairs.
- **`it('names every v-badge the app renders')`** — The primary assertion: no badge may lack a name.
- **`it('is checking the badges it is meant to be checking')`** — A canary: asserts at least one badge was found, so a Vuetify rename or refactor that hides all badges doesn't let the test pass vacuously.

## Relationships

- **`tests/unit/kernel/use-badge-refresh.spec.ts`** — Shares the badge domain: that file exercises the runtime refresh logic behind the counts this test requires be announced. Together they cover the badge's two concerns (value correctness vs. accessibility naming).
- **`tests/unit/infrastructure/http/http-etag.spec.ts`** — Sibling in the cross-cutting / unit test landscape; no direct code dependency visible in this file.

## Notes

- Accepted "naming" is intentionally broad: Vuetify's `label`, standard `aria-label`, or an explicit `aria-hidden` (for genuinely decorative dots). The test does not require a specific attribute, only *one* of the three.
- The scanner is deliberately not a regex on the whole tag. The docblock calls out the failure mode: a `count > 99` ternary inside `:content` would truncate a `[^>]*` match and hide a `label` that appears later in the tag.
- The canary uses `>= 1` rather than an exact count so that deleting a badge feature doesn't also silently delete the guard.
- The file is a *test*, not a linter or component; the header docblock explicitly explains why a shared `AppNavEntry` component was rejected as the enforcement mechanism.
