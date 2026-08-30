# docs/theory/reading-path.md

## Purpose

A time-boxed (one-hour) guided reading order for the codebase. It prescribes 9 files to read in sequence and explicitly names what to skip, so a newcomer can internalise the architecture without reading all ~11,500 lines across 12 modules. It is the entry point into the `docs/theory/` section and the "landing" page when a reader arrives without a prior map.

## Key elements

- **The 9-file path** — an ordered list (`main.ts` → `modules.ts` → `registry.ts` → `router/index.ts` → `products/module.ts` → `products/routes.ts` → `ProductsList.vue` → `products/store.ts` → `infrastructure/http/index.ts`) with a one-paragraph "take away" for each.
- **Five architectural rules** — the invariants the code assumes: module-as-value, four-tier dependency direction, generated contract, single-responsibility per layer, locale-prefixed URLs.
- **Skip table** — files/packages to defer (`src/ui/**`, `i18n`, `observability`, `account`, `realtime`, `admin`, `demo`, config files) with the condition under which to revisit them.
- **"Next question" routing table** — maps a reader's follow-up intent to the correct sibling doc (`request-flow.md`, `layers.md`, `module-lifecycle.md`, etc.).
- **Mermaid flowchart** — a visual of the 9-file sequence colour-coded by tier (bootstrap / module / request).

## Relationships

- **`docs/theory/request-flow.md`** — linked in the "next question" table as the follow-up for tracing a request end-to-end.
- **`docs/theory/module-lifecycle.md`** — linked in the "next question" table for adding or removing a domain; the "Take away" on file #2 ("deleting a domain is `rm -rf` plus removing one line") points the reader there for the full procedure.
- **`README.md`** — the top-level entry point; this page is the "read the code" path it hands off to (the page itself references `Tools Explained` as an alternative first read, suggesting README routes between them).
- **`docs/getting-started.md`** — the "Run it against the demo backend" tip in this page assumes the reader has already completed setup; this page is the conceptual step that follows.
- **`docs/theory/modules.md`** — the conceptual reference for "what a module is" that this page's file #3 (`registry.ts`) section expands with a concrete reading order.

## Notes

- The page is explicitly **not** a code reference — it says "Every other page here explains a concept; this one names the files, in order, and says what to skip." Do not look for API details here.
- It mandates reading with the app running (`npm run dev` + demo backend); the "take away" notes are written as observations of live behaviour.
- The `products` module is designated the **reference module**; the page tells readers to copy it, not `account` or `demo`.
- It cross-references a paired backend repo (`boilerplate-node-api-mongodb-mongoose`) that has its own reading-path page sharing the same shape; the two share `openapi.yaml`, the response envelope, and the registry idea.
- The page positions itself opposite the **File Glossary** (`docs/reference/`): this is "read in order," the glossary is "look up one file."
