---
source: tests/unit/ui/translation-tabs.spec.ts
sha256: de1b0d65ed642ee9d3dd44f90c7ad687ca9376e6b989c8a2f49307aa096e06f7
signature: 3ab7f7d7b07c077584f1db7c259aad8f46e034a3b17b25a5738ca3e3f7df2ac6
generated_at: 2026-11-10T08:29:18.774398+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/translation-tabs.spec.ts

## Purpose

Unit test for `TranslationTabs.vue` that guards the component's ARIA shape against regressions into two known-bad patterns: a focusable child inside `role="tab"` (`nested-interactive`) and a stray `<button>` sibling inside `role="tablist"` (`aria-required-children`). It also covers the remove-button lifecycle, tab/panel wiring (`id` / `aria-controls`), and draft-language display. Runs in under a second without a browser cluster, unlike the e2e sweep that originally caught the bug.

## Key elements

- **`mountTabs(activeTab?)`** – Mounts `TranslationTabs` with two LTR locales (`en` fallback, `it` removable) and `attachTo: document.body` so axe sees a real layout tree.
- **`auditTablist(root)`** – Wraps `axeViolations` (from the support helper) scoped to only the two rules this component's DOM shape is designed to satisfy.
- **`WITH_DRAFT` / `mountOn(modelValue)`** – Fixture set and mount helper that add a third, inactive draft locale (`fr`) for draft-specific assertions.
- **`describe` blocks** – Four groups:
  - *tablist shape* – axe audit + remove-button placement/label outside the tablist.
  - *remove control behaviour* – hidden on fallback tab, emits `remove` with the active tag on click.
  - *tab/panel link* – every tab exposes a stable `id` and `aria-controls` value a caller can pair with its panel.
  - *draft language* – label uses `nativeName` (not bare tag), a "Draft" hint appears under tabs, and the axe audit still passes.

## Relationships

- **`tests/support/unit/axe.ts`** – Provides `axeViolations`, a helper that runs axe-core against a given element and returns only the violations array. This spec calls it via `auditTablist`, passing `runOnly` to restrict the audit to `nested-interactive` and `aria-required-children`.

## Notes

- `attachTo: document.body` is mandatory: axe's `nested-interactive` and `aria-required-children` rules do not fire on a detached fragment.
- `wrapper.element as Element` casts appear because TypeScript cannot resolve the SFC type of a `.vue` file; this is a known limitation, not a workaround for a runtime issue.
- The `beforeAll` call to `loadLocale('en')` is required before any mount because the component resolves labels through the i18n plugin.
- `afterEach` unmounts and nulls the shared `wrapper` variable; the draft-language cases that mount locally (rather than via `mountOn`) call `wrapper.unmount()` inline to avoid a stale reference.
