---
source: src/kernel/registry.ts
sha256: 275055412849952a12374e28608bfdbb1fab621666c76b386a90a77a00892330
signature: 856ebe9328171ead68e00a8411ca5ac6bfef2a72392470c46b27c00ea856d794
generated_at: 2026-11-10T03:16:44.963871+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/registry.ts

## Purpose

Defines the typed contract (`AppModule`) that every domain module must fulfil to be wired into the running application. It turns the flat list in `src/modules.ts` into a structured set of routes, navigation entries, notification descriptors, tour steps, slot contributions, and response-schema loaders — all declared in one object per module so the application's surface is answerable from a single file.

## Key elements

- **`AppNavigationSection`** — union type (`'main' | 'account' | 'admin'`) controlling where an entry sits in the shell chrome.
- **`NAVIGATION_SECTIONS`** — ordered tuple of all sections; used by the drawer to group headings.
- **`AppNavigationEntry`** — shape of one nav item (route name, i18n label, optional `badge`/`detail` accessors returning refs, `section`, `group`, `pinned`, required `icon: Component`).
- **`AppTourStep`** — one guided-tour step (tour key, id, `data-tour` target, i18n title/body, optional `order`).
- **`NoticeContext`** — callbacks and preferred-language list handed to a notice's `describe` function.
- **`NoticeTarget`** — discriminated union: either a named route + params, or a raw app path string.
- **`AppNotice`** — `{ describe, target? }` pair; one entry per notification code a module owns.
- **`AppModule`** — the top-level manifest: `name`, `routes`, optional `navigation`, `notices`, `tours`, `slots`, `loadingKeys`, and a lazy loader field for response-envelope schemas (typed via `ResponseSchemaRoute`).

## Relationships

- **`src/i18n/index.ts`** — provides the `TranslationDictionaries` type imported by this file; all i18n-key fields in the registry types resolve against the translation system defined there.
- **`scripts/audit/unused-locale-keys/scan.ts`** — audits i18n key usage across the codebase; the i18n-key fields declared in this file's types are among the strings the scan must recognize.
- **`src/modules/shop-tasks/describe.ts`** — implements the `AppNotice` contract for the shop-tasks domain; its functions conform to the `NoticeContext` / `NoticeTarget` types defined here.
- **`src/modules/locales/store.ts`** — a concrete module whose manifest conforms to `AppModule`; its routes and loading keys flow through this interface.
- **`src/modules/locales/views/LocaleEntries.vue`** — a view rendered under a route registered via a module's `routes` array in this interface; its nav entry is declared in the module's `navigation` array.
- **`tests/cross-cutting/registry.spec.ts`** — validates the assembled registry (e.g. required `icon`, `name` matching the folder, unique `order` values). The `icon` field is deliberately required so violations surface at compile time and in this spec.
- **`src/kernel/order-link.ts`** — kernel-level utility in the same `src/kernel/` cluster; related through the broader kernel dependency graph.

## Notes

- **No filesystem discovery.** Modules are listed explicitly in `src/modules.ts`; this file only types and aggregates them. Enabling/disabling a domain is a one-line edit, not a folder move.
- **`icon` is required, not optional.** A missing icon is a compile error at the declaration site rather than a runtime or test-time failure.
- **`badge` and `detail` are accessor functions returning `Ref`,** not static values — they are invoked once inside the shell component's `setup`, after Pinia is installed, so they can safely read module-owned stores.
- **Placement ≠ permission.** `section` and `pinned` control *where* an entry renders; visibility is exclusively the route's `meta.access`. Keeping these separate lets the drawer suppress a section heading when nothing under it is visible, without duplicating access rules.
- **`order` values are spaced by tens** so a new entry can be inserted between two existing ones without renumbering. Absent sorts last.
- **`notices` is keyed by code.** A code no module declares renders as a generic notification with no link — there is no fallback registry entry.
- **The response-schema field is a lazy loader, not a static array.** Invoking it triggers the ~350 KB `@api/schemas` chunk; it is contributed per-module so contract validation travels with the domain's folder.
