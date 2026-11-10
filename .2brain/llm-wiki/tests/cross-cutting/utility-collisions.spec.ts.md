---
source: tests/cross-cutting/utility-collisions.spec.ts
sha256: 768a81f2600ceefa28e433267f0d2afa98bc317b4868cb126123f9372ae01ae2
signature: a4bbb38338cce2da9cb4faf2b7a226451d1f942fa04b55d74f9571b66564a26a
generated_at: 2026-11-10T06:42:11.360845+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/utility-collisions.spec.ts

## Purpose

Cross-cutting test that verifies the collision list in `scripts/design-policy.ts` stays in sync with reality. It compiles both Vuetify's and Tailwind's utility CSS, compares the declarations class-by-class, and asserts that (1) every genuine collision is listed, (2) no `rounded*` name collides, and (3) Tailwind is scoped to `src/` only. A library upgrade that introduces (or removes) a collision fails the build here.

## Key elements

- **`declarationsOf`** — extracts `[property, value]` pairs from a PostCSS node list, skipping `--tw-*` custom properties and nested rules.
- **`normaliseValue`** — rewrites a raw CSS value to a canonical form: resolves CSS custom properties, converts `rem`→`px`, evaluates `calc(px*n)`, maps `thin`→`1px`, `flex-start`/`flex-end`→`start`/`end`, lower-cases colours.
- **`expandProperty`** — expands logical shorthands (`margin-inline`, `padding-block`, `border-block-start-*`) into physical sides so the two libraries' declarations are comparable property-by-property.
- **`normalise`** — composes the above into a `Map<property, value>` for a rule's declarations.
- **`vuetifyUtilities`** — reads Vuetify's compiled CSS from `node_modules`, walks the `@layer vuetify-utilities` block, and returns single-class rules keyed by class name.
- **`tailwindBuild`** — invokes the project's Tailwind builder with a set of candidate class names; parses the output, collecting `:root` theme variables and single-class rules.
- **`collides`** — returns `true` when two normalised maps share no properties at all, or when any shared property has a differing value.
- **`measuredCollisions`** — end-to-end measurement: builds Tailwind for every Vuetify utility name, then filters to the set that actually collide.
- **Test "lists every name…"** — asserts `measuredCollisions()` is fully covered by the patterns in the policy list (no unlisted collision).
- **Test "has no radius name…"** — asserts no `rounded*` class appears in the collision set.
- **Test "lets Tailwind scan src/ only"** — regex-checks `main.css` for `source(none)` on the utilities import and an explicit `@source '../'`.

## Relationships

- **`scripts/design-policy.ts`** — provides the `DESIGN_POLICY` object whose `ambiguousUtilities` array is the authoritative list of known collision patterns; the test validates that the measured collision set is a subset of those patterns.
- **`scripts/css-sources.ts`** — provides `ROOT`, the resolved project-root path used to locate files on disk.
- **`scripts/tailwind-build.ts`** — provides `tailwindBuilder`, used to perform an on-demand Tailwind compile with a candidate class list and return the generated CSS.

## Notes

- The test reads Vuetify's **compiled** CSS from `node_modules`, so results depend on the installed Vuetify version; a major upgrade may change the collision set.
- Tailwind compilation is async; the two collision tests are `async` while the `source(none)` test is synchronous (pure file read).
- The `REM = 16` constant mirrors the CSS spec's root font size; it is used only for the `rem`→`px` normalisation and has no effect at runtime.
- The `source(none)` / `@source` guard is a content assertion on `main.css`, not a compilation check—so it will pass even if Tailwind's config changes elsewhere. The intent is to prevent docs or test files from leaking class names into the app bundle.
