# tests/cross-cutting/badge-name.spec.ts

## Purpose

Cross-cutting accessibility guard that enforces a single invariant across the entire app: every `<v-badge>` rendered in a `.vue` source file must carry a `label`, `:label`, `aria-label`, `:aria-label`, or `aria-hidden` attribute. It exists because the missing attribute is visually invisible, no linter knows what a Vuetify badge is, and the three call sites that render badges are spread across components with no shared parent.

## Key elements

- **`componentFiles(directory)`** – Recursively collects all `.vue` files under a directory, skipping any subtree named `tests`.
- **`badgeTagsOf(source)`** – Quote-aware scanner that returns the full opening tag string for every `<v-badge …>` occurrence. Walks character-by-character, tracking open/close quotes so a `>` inside an attribute value (e.g. a ternary in `:content`) does not prematurely terminate the tag.
- **`isNamed(tag)`** – Regex test returning `true` if the tag string contains `label`, `:label`, `aria-label`, `:aria-label`, or `aria-hidden` (word-boundary aware).
- **`badgesInSource()`** – Composes the above into a flat array of `{ file, tag }` pairs for every badge in the codebase.
- **`describe("a badge says what it counts")`** – Two tests:
  1. Asserts the filtered list of unnamed badges is empty.
  2. Asserts `badgesInSource().length >= 3` — a "guard on the guard" that catches a silent scanner failure (Vuetify rename, badge moved behind a wrapper) which would otherwise make test 1 pass vacuously.

## Relationships

No dependency-graph neighbors are registered. At runtime the test reads every `.vue` file under `src/` (including `AppNavMenu`, `AppNavigation`, and `AppNavIconButton` per the header comment) via `node:fs`, but those are filesystem reads, not import edges, so they do not appear as graph neighbors.

## Notes

- **Quote-awareness is the critical design choice.** A naive `/<v-badge[^>]*>/` regex would truncate the tag at any `>` inside an attribute expression, dropping a `label` that appears later in the tag and producing a false positive. The file documents this failure mode explicitly.
- **`aria-hidden` counts as "named."** The test treats a deliberate `aria-hidden` as satisfying the invariant because it is an intentional declaration of "this badge is decorative," distinct from an accidental omission.
- **Deliberate duplication over shared component.** The header comment explains why the invariant is pinned in a test rather than enforced by factoring badge rendering into a single `AppNavEntry` component: `AppNavIconButton` renders its badge around a button and cannot share a list-item component, and future call sites cannot be anticipated.
- **The second `it` block is load-bearing.** Without it, a rename from `<v-badge>` to something else would cause `badgeTagsOf` to return zero matches, test 1 would pass, and the rule would be silently unenforced. The `>= 3` floor is a minimal "we are actually looking at the badges we think we are looking at" check.
