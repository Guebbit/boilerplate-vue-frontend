# docs/theory/roadmap.md

## Purpose

A living, periodically-pruned list of planned-but-unbuilt work. Items that have shipped are **deleted** from this file rather than checked off, on the principle that a roadmap listing finished work stops being read. Last reviewed 2026-08-14.

## Key elements

- **Variants** — The largest roadmap item. Describes a skeleton extraction (kernel + 2 demo modules) from which four UI/framework variants (css-ui, Vuetify, Quasar, Nuxt) will descend. Includes a Mermaid flowchart and per-variant notes.
- **A home for teaching code** — Documents `src/modules/demo` (counter store, route guard, Playground sandbox) and frames the open question as *where* teaching code lives rather than *whether* to keep it.
- **Conventions to enforce** — A single rule: call `useXYZStore()` inside functions, not at module top level, to avoid premature-Pinia / circular-import failures. Suggests promoting it to a lint rule.
- **Maybe** — Three genuinely undecided ideas (i18n composable, Bootstrap variant, Lighthouse CI gate) listed to prevent them from being lost.

## Relationships

- **package.json** — The removal of the Vitest and Cypress suites from the roadmap (and the registration/password-reset pages) reflects work that has already landed in the package's scripts and dependencies. Future variant work will add or restructure entries here.
- **docs/getting-started.md** — The "Conventions to enforce" section (Pinia call-site rule) and the teaching-code inventory in `src/modules/demo` are the kind of material a newcomer reads first; keeping them in the roadmap signals they are not yet settled in the starter docs.

## Notes

- The skeleton extraction plan (`BOILERPLATE_SPLIT_PLAN.md`) lives **outside** this repository, at the workspace root.
- This repository *is* the Vuetify variant; the "Vuetify variant" on the roadmap means "what remains after the twelve domains are removed."
- The css-ui variant carries a specific recovery instruction: pull `_root.scss` and `_cards.scss` from earlier git history rather than rewriting them.
- The Pinia top-level-call pitfall is noted as a diagnostic trap: the `getActivePinia()` error surfaces far from the actual circular import.
- One live `TODO` is tracked here at `src/modules/account/views/Profile.vue:232` rather than left to rot inline.
