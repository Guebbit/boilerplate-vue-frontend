## TypeScript

- MUST use `strict: true` in all TypeScript code.
- MUST NOT use `any` — use `unknown` plus type narrowing.
- MUST use ESM imports only (`import`/`export`); no CommonJS (`require`, `module.exports`).

## Function design

- MUST apply SOLID principles.
- MUST keep functions focused — one responsibility each.
- MUST keep nesting ≤ 3 levels; extract a helper for anything deeper.
- MUST prefer pure functions and shared abstractions over duplicated inline logic.

## Scope

- MUST NOT preserve backward compatibility (old field names, deprecated endpoints, legacy code
  paths, dual-write transitions) unless the user explicitly asks for it. Replace, don't shim.
- MUST NOT leave deprecated code in place — no `@deprecated` tag kept "for later." When a change
  supersedes something, remove it in the same change.

## Async and error handling

- **Prefer promise chaining** (`.then`/`.catch`/`.finally`) when there are only 1–2 awaits.
- Use `async`/`await` only when several sequential awaits make chaining unreadable.
- **Avoid `try`/`catch`** unless genuinely necessary — synchronous throws, or multi-step
  transactions with partial rollback.
- MUST handle errors explicitly — no swallowed promises.

## Comments

- Exported functions: JSDoc REQUIRED (`@param`, `@returns`, `@throws` as needed).
- Exported interfaces/types: JSDoc REQUIRED — purpose plus what each field means.
- Every `.ts` file: a JSDoc `@module` header at the top explaining the **logic or pattern** the
  file follows — what it is and how it works, not what it is for in the product. Keep it short: a
  few lines, enough to orient someone opening the file cold. If it grows into prose, it belongs in
  `docs/`. One `@module` header per file, always — a `.vue` SFC's `<script setup>` block gets it
  the same way a `.ts` file does; a second `<script lang="ts">` block in the same SFC (e.g. the
  devtools `name` block) is still part of that one file and does not get its own `@module` tag.
- Non-trivial internal helpers: a concise inline or JSDoc explanation.
- Comments MUST be brief theory-level notes on what the code does and its role — ADHD friendly,
  not line-by-line narration.
- Docs describing flow, architecture or process MUST include Mermaid diagrams.
- Never narrate history — no "this used to...", "previously...", "was renamed from...". A comment
  describes the code as it is now; git log is where the past lives.
- Never link to a `.md` file outside `docs/*` — a root-level plan, audit, or report doc is
  ephemeral; only `docs/` is a stable target for a comment to point at.

Comments are **not** a replacement for the documentation. They are code-centric: they explain the
code in front of you, and give a quick overview of what the docs already say in full. The
reasoning, the alternatives and the diagrams live in `docs/` — a comment points at that, it does
not reproduce it.

## Code layout

Orderly, scannable files. Two rules, always:

- **Every top-level declaration gets JSDoc.** Top-level means the outermost body of the file —
  and also the outermost body of whatever construct owns most of the file (a composable, a store
  definition, a factory, a class body, a `setup()`). Constants, types, helpers, refs, computeds,
  actions, exported and internal alike: each one carries its own JSDoc block.
- **One blank line between them.** Every top-level declaration is separated from its neighbours by
  a single empty line — Prettier's formatting has no way to preserve more than one, so this is the
  enforced ceiling, not just the floor — so the JSDoc block visually belongs to the thing below it.
  Inside a declaration, blank lines are fine as needed.

```ts
/**
 * Rows currently visible after the active filter.
 */
const visibleRows = computed(() => rows.value.filter(isVisible))

/**
 * Reloads the table, discarding any optimistic edits.
 *
 * @throws {FetchError} When the endpoint is unreachable.
 */
const reload = () => fetchRows().then(applyRows)
```

## Commenting external calls

Calls into an external dependency are the code we forget fastest — the parameters are someone
else's vocabulary, not ours.

- Any class instantiation or method call from an external dependency with **non-obvious
  parameters** MUST be annotated: either a brief comment above the call, or a JSDoc block
  documenting each unclear parameter.
- Annotate the parameters that are not immediately clear — magic numbers, bare booleans,
  option objects, positional arguments whose meaning comes only from the library's docs. Skip the
  self-evident ones.
- Prefer more comments over fewer. When in doubt, write it.

All of it ADHD friendly: short lines, one idea per line, plain language, the "why" before the
"how". No paragraphs, no restating the code.

```ts
// Sharp: resize to a fixed box, letterboxed rather than cropped.
sharp(buffer).resize(
  1200,           // width, px
  630,            // height, px
  {
    fit: 'contain',              // pad instead of cropping
    background: '#00000000',     // transparent padding
  },
)
```
