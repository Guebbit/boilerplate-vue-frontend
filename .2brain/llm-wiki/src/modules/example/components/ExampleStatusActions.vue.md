---
source: src/modules/example/components/ExampleStatusActions.vue
sha256: 502cb007dbc237b9c251cd61a925f321466b088daa1381af8b2a75660e6034e8
signature: 5a24e46bd763612ef300f8086437279d874383d040551659d283c71c3dce540c
generated_at: 2026-11-10T04:21:40.348678+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/components/ExampleStatusActions.vue

## Purpose

Renders one button per lifecycle action the server has flagged as open on the current example (publish, archive, unarchive). It is purely presentational: it reads which actions are available from injected state, displays them in a fixed order, and delegates the actual status change to an injected mutation. It exists as a separate component (rather than inline in a view) so the provide/inject boundary is explicit and visible.

## Key elements

- **`EVENTS`** — `readonly ExampleEvent[]` defining the fixed button order: `['publish', 'archive', 'unarchive']`. It does not determine visibility.
- **`openEvents`** — `computed` that filters `EVENTS` to only those where `example.value?.actions[event]` is truthy. Yields an empty array while the example is still loading.
- **`useProvidedExample()`** — destructure-injects the `example` reactive object and the `changeStatus` mutation callback.
- **Template** — iterates `openEvents`, rendering a Vuetify `<v-btn>` per event with a `data-test` hook (`example-move-${event}`) and a click handler that calls `changeStatus(event)`.

## Relationships

- **`src/modules/example/provided.ts`** — Source of the `useProvidedExample` composable that supplies both the reactive `example` data and the `changeStatus` mutation this component calls on click.
- **`src/modules/example/store.ts`** — Provides the `ExampleEvent` type used to type `EVENTS` and the `openEvents` computed.
- **`src/modules/example/views/ExampleEdit.vue`** / **`src/modules/example/views/ExampleTarget.vue`** — Upstream views that act as the *providing* half of the pair; they inject this component into their template and are expected to call `provide` so `useProvidedExample()` resolves.
- **`src/modules/example/tests/example-status-actions.spec.ts`** — Unit/integration tests for this component.

## Notes

- The component intentionally **decides nothing**: which buttons appear is entirely the server's answer via `example.actions`; the local `EVENTS` array only sets order.
- The optional chain in `example.value?.actions[event]` means no buttons render during the loading state — there is no separate "loading" UI here.
- The JSDoc block references `docs/theory/strategic-ddd.md#4-subdomain-distillation-where-to-spend-effort` for the design rationale (delete the component if no control hangs off a server-listed action set).
- All i18n keys follow the pattern `example-status-actions.event-${event}`.
