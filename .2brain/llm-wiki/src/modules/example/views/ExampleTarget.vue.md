---
source: src/modules/example/views/ExampleTarget.vue
sha256: d23ebdf0ecb71c7f58e426fc689e10ced78424420ab4a97616d77ebe7da0c091
signature: d23ebdf0ecb71c7f58e426fc689e10ced78424420ab4a97616d77ebe7da0c091
generated_at: 2026-11-10T04:29:04.643307+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/views/ExampleTarget.vue

## Purpose

Detail screen for a single example record. It resolves the route `id` through the Pinia store, renders the record inside the shared `ItemDetailLayout` skeleton, and exposes two record-specific mutations: a status transition (delegated to `ExampleStatusActions` via provide/inject) and a delete that navigates back to the list.

## Key elements

- **`name: 'ExampleTargetPage'`** (non-`setup` script block) — gives the SFC a stable name for `<KeepAlive>` and devtools; the `setup` block cannot declare one itself.
- **`watchExample(() => id, { onError: onMissingRecord })`** — hydrates `currentExample` whenever the route param changes; a 404/403 routes to the error page rather than leaving the page on placeholders.
- **`useExampleTransition(() => id)`** — composable that owns the status-change call, its in-place blocking error, and a 409 re-read. Exposes `changeStatus` and `statusError`.
- **`provideExample({ example, changeStatus })`** — injectable pair scoped to this page's subtree; `ExampleStatusActions` is the injecting half.
- **`handleDelete`** (`singleFlight`-wrapped) — confirmation dialog → `deleteExample(id)` → success toast → `router.push` to `ExamplesList`. Failures are reported via `useBlockingError` and shown inline.
- **`heroTitle`** (computed) — fallback chain: record title → route `id` → i18n page-title string.
- **`publicationText`** (computed) — derives a localized sentence from `publicationOf(record)` (state: live / withdrawn / never) plus `formatDateTime`.
- **`asideFields`** (computed `DetailFieldRow[]`) — publication, created-at, updated-at rows rendered by `RecordAsideCard`.
- **Template slots** — `#hero`, `#stats`, `CardDetail` (body, owner, id, cover image, status-actions section), `#aside`, `#actions` (edit / delete / list buttons + inline errors).

## Relationships

- **`src/modules/example/store.ts`** — source of `watchExample`, `deleteExample`, and the reactive `currentExample` (via `storeToRefs`).
- **`src/modules/example/provided.ts`** — exports `provideExample`, which couples this page to `ExampleStatusActions` through Vue's provide/inject.
- **`src/modules/example/components/ExampleStatusActions.vue`** — child component that injects the provided pair and renders the status buttons; never calls the store directly.
- **`src/modules/example/composables/use-example-transition.ts`** — encapsulates the status-change request, its blocking-error state, and the 409 recovery; consumed here and re-exposed via provide/inject.
- **`src/modules/example/domain/index.ts`** — re-exports `publicationOf` from the domain layer.
- **`src/modules/example/domain/publication.ts`** — defines `publicationOf`, the pure function that maps a record's fields to a publication state and timestamp.
- **`src/modules/example/tests/example-target-confirm-once.spec.ts`** — unit test verifying that the delete confirmation dialog fires exactly once, confirming `singleFlight` prevents duplicate confirmations.

## Notes

- The dual `<script>` blocks are intentional: the plain block exists solely to set `name`; do not merge them into one `setup` block or `<KeepAlive>` breaks.
- Status errors and delete errors are **not** toasts; each uses a dedicated `useBlockingError` instance rendered as an `InlineErrorAlert` next to its control. A 409 on status triggers a record re-read via `useExampleTransition` internally.
- `handleDelete` is wrapped in `singleFlight` so a rapid double-click cannot open two confirmation dialogs.
- The edit button is a plain route link (`routerLinkI18n`), not a handler — navigation is delegated to Vue Router.
- All user-facing strings go through `useI18n().t`; the `data-test` attributes on interactive elements are the contract the e2e/spec tests rely on.
