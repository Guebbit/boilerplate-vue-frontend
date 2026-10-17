---
source: tests/cross-cutting/module-file-shapes.spec.ts
sha256: 3bc3432d0ed7499ec27cceaf777baa067dff7c86f03805706289409c58ec553c
generated_at: 2026-10-17T02:01:08.841330+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/module-file-shapes.spec.ts

## Purpose

Enforces that every file inside a `src/modules/*` folder matches a named, catalogued shape (`module.ts`, `routes.ts`, `store.ts`, `views/*.vue`, etc.). Any file that matches no entry in the catalogue fails the test by name, making the module vocabulary an enforced invariant rather than a convention. It also enforces per-module exclusivity (`onlyIn`) for shapes reserved to a single domain.

## Key elements

- **`FILE_SHAPES`** — `readonly FileShape[]`, ordered most-specific-first. Each entry has a `match` (RegExp), a `what` (one-line description surfaced in failure messages), and an optional `onlyIn` (module name the shape is restricted to). Adding a new file shape is a one-line entry here.
- **`FileShape`** — interface defining the catalogue entry (`match`, `what`, `onlyIn?`).
- **`walk(directory, base)`** — recursive directory listing returning sorted module-relative paths.
- **`filesInModules()`** — pairs every file under each `enabledModules` entry with its module name, producing the full sweep target.
- **`MODULES_ROOT`** — resolved absolute path to `src/modules/` relative to this spec file.
- **Test: "describes every file a module folder holds"** — the main check: no file may go unrecognised by `FILE_SHAPES`.
- **Test: "is sweeping the files it is meant to be sweeping"** — canary: `filesInModules()` must return at least one entry, preventing a silent no-op.
- **Test: "keeps a labelled shape out of every module but the one it names"** — enforces `onlyIn` for real (e.g. `guards.ts` only in `example`, `dictionaries.ts` only in `locales`).
- **Test: "is checking a catalogue that still reserves at least one shape"** — canary: at least one `FILE_SHAPES` entry must carry `onlyIn`, so the exclusivity test isn't vacuous.

## Relationships

- Imports `enabledModules` from `@/modules` — the module registry that determines which folders are swept. If a module is not in that registry, its files are invisible to this spec.
- Referenced by `docs/theory/modules.md` as the executable counterpart to the prose description of module file shapes.
- Complementary to `store-location.spec.ts`, which rules on store *filenames* specifically; this spec covers the entire folder and catches stray files the narrower spec would miss.

## Notes

- **First-match wins.** `FILE_SHAPES` is ordered most-specific-first (e.g. `stores/.+\.ts` before a hypothetical broader pattern). The `onlyIn` enforcement uses the *first* match found, so ordering matters for both the vocabulary rule and the exclusivity rule.
- **`onlyIn` is enforced, not prose.** The `what` string may say "`example` only", but the real gate is the `onlyIn` field checked in a separate `it` block. A typo in the prose won't be caught; the field will.
- **`types.ts` has no `onlyIn`.** A comment in the catalogue notes that the original "admin only" label was factually wrong — `webhooks` also carries a `types.ts`. The shape is therefore universal.
- **Failure messages are intentionally actionable.** Unrecognised files tell the developer to either add a line to `FILE_SHAPES` or reconsider the file's existence; misplaced files name the module the shape is reserved for.
- **This spec is the sole cross-cutting guard on module folder contents.** No other test in the suite sweeps an entire module directory for unknown files.
