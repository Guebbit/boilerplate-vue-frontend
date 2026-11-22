---
type: reference
audience: [developer]
---

# Code comments

The rules for every comment in this repository, and for the docblocks the linter checks. Short
lines, one idea per line, the "why" before the "how". `CLAUDE.md` imports this page, so an AI
editor reads the same rules a developer does.

## Which comments, and how long

- Exported functions, interfaces, types and enums: JSDoc REQUIRED — `jsdoc/require-jsdoc`. An
  interface states its purpose and what each field means; a function adds `@param`/`@returns`/
  `@throws` **as needed**. "As needed" is yours to judge, but a tag you do write is checked:
  `jsdoc/check-param-names` refuses a name that is not in the signature, `check-tag-names` refuses
  a tag that is not a tag, and the `*-description` rules refuse an empty one.
- Every `.ts` file **under `src/`**: a JSDoc `@module` header at the top explaining the **logic or
  pattern** the file follows — what it is and how it works, not what it is for in the product.
  Keep it short: a few lines, enough to orient someone opening the file cold. If it grows into
  prose, it belongs in `docs/`. One `@module` header per file, always — a `.vue` SFC's
  `<script setup>` block gets it the same way a `.ts` file does; a second `<script lang="ts">`
  block in the same SFC (e.g. the devtools `name` block) is still part of that one file and does
  not get its own `@module` tag.

    `scripts/**` and `tests/**` are outside the rule, and `eslint.config.ts` scopes `jsdoc/*` to
    `src/**` to match. Both are free to open with a file-level docblock — most already do, and the
    cross-cutting specs carry the repo's architectural invariants in theirs — but the tag is not
    required there and nothing checks for it.

- Non-trivial internal helpers: a concise inline or JSDoc explanation.
- Every comment answers up to two questions, in this order, and nothing else:
    1. **What does this do**, only if the name doesn't already say it.
    2. **Why is it shaped this way**: the one non-obvious reason, or its place in the larger flow.
- **The budget is prose; structure is nearly free.** A list item, a `Label:` row, a table, a fenced
  block and a JSDoc tag barely count:

    |                                | prose lines |
    | ------------------------------ | ----------- |
    | `@module` header               | 6           |
    | any other declaration          | 8           |
    | total lines, whatever the form | 24          |

    Over budget: change form, never delete the content. Past 24 lines it belongs in `docs/`, with a
    link left behind. Never hand-maintain a row that restates something generated elsewhere.

- One idea per comment. Never restate what the code or a good name already says.
- Docs describing flow, architecture or process MUST include Mermaid diagrams.
- Never narrate history — no "this used to...", "previously...", "was renamed from...". A comment
  describes the code as it is now; git log is where the past lives.
  The same holds for `docs/`: a page states why the design is what it is, in the present tense
  ("there is no X, because…"), never how it got there.
- Never reference an untracked `.md` file, by link or by name. Stable targets: `docs/*` and the
  tracked root `CLAUDE.md`, `README.md`, `SECURITY.md`, `INSTALL.md`. Nothing enforces this
  beyond `.gitignore`.

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
const visibleRows = computed(() => rows.value.filter(isVisible));

/**
 * Reloads the table, discarding any optimistic edits.
 *
 * @throws {FetchError} When the endpoint is unreachable.
 */
const reload = () => fetchRows().then(applyRows);
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
- Link the relevant doc page, when one exists. Don't paraphrase the library's docs.
- Prefer more comments over fewer. When in doubt, write it.

All of it ADHD friendly: short lines, one idea per line, plain language, the "why" before the
"how". No paragraphs, no restating the code.

```ts
// Sharp: resize to a fixed box, letterboxed rather than cropped.
sharp(buffer).resize(
    1200, // width, px
    630, // height, px
    {
        fit: 'contain', // pad instead of cropping
        background: '#00000000' // transparent padding
    }
);
```
