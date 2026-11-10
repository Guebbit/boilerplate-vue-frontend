---
source: tests/unit/app/language-switcher.spec.ts
sha256: a7f189e5b5ef20be67af0c660ca2c378414f4973eade01da369c3ead6a40317a
signature: b0120d539288ca126cd03d34540b4f937a57fa075c6e228171c8daae3cd25b87
generated_at: 2026-11-10T07:46:58.832231+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/language-switcher.spec.ts

## Purpose
Dedicated unit tests for `AppLanguageSwitcher`, verifying that the component renders one option per supported language, marks the active locale, re-enters the current route under a new locale (preserving params and query), falls back to Home on navigation failure, and handles draft-language previews (labeling, cues, and skipping account-level persistence). Exists as a focused mount separate from the indirect coverage `app-navigation.spec.ts` provides.

## Key elements

- **`mountSwitcher()`** – Helper that mounts `AppLanguageSwitcher` with Vuetify and a `VMenu` stub that renders both the activator and default slots inline (avoiding teleport/lazy-render).
- **`drafts` (hoisted `Set<string>`)** – Controls which locales are treated as drafts; fed into the mocked `isDraftLanguage`. Cleared in `beforeEach`.
- **Mocked modules** – `vue-router` (returns a fixed `currentRoute` with `params.id` and `query.tab`; `replace`/`push` are `vi.fn()`s), `vue-i18n` (`useI18n` returns `t` → identity, `te` → `false`, `locale` → `ref('en')`), `locale-overrides` (`isDraftLanguage`), and `locale-preference` (`persistLocalePreference`).
- **Test cases** (8 `it` blocks) – Cover: menu/option rendering, `aria-current` on the active option, route re-entry with merged params+query, fallback `push('/')` when `replace` rejects, trigger-button label & `aria-label`, draft marker visibility and `lang` attribute, draft cue on the bar button, and that a draft selection does **not** call `persistLocalePreference`.

## Relationships

No graph neighbors are recorded for this file. It imports the component under test and several infrastructure modules, but none of those files list a dependency back to this spec.

## Notes

- The `VMenu` stub is required because Vuetify's real `v-menu` teleports its content and renders it only on open; the stub inlines both the `activator` and default slots so assertions can query the DOM immediately.
- `t` is mocked to return the key verbatim, so `aria-label` assertions contain raw i18n keys (e.g. `'navigation.label-language: EN'`). If the component's label format changes, update both the component and these expectations.
- The "re-enter route" contract: `replace` must be called with `{ params: { …original, locale }, query: { …original } }`. The test asserts the *merge* of the new locale param with existing params, not a full path string.
- Draft-language behavior: `persistLocalePreference` must **not** be called when the chosen locale is in the `drafts` set, even though `replace` still fires. This is the key distinction from a normal language switch.
