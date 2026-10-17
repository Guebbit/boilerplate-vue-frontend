---
source: src/modules/example/components/ExampleStatusActions.vue
sha256: df4543a529d76e8a52712a6c26a2d1800957dd1ef51a5d016b54917c4c65cbb1
generated_at: 2026-10-17T00:50:32.143381+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/components/ExampleStatusActions.vue

## Purpose

Injecting half of a provide/inject pair. It reads the current example and a status-mutation function from its parent (the detail screen) and renders one button per allowed next status. It exists as a separate component so the provide/inject mechanism is exercised across a real component boundary.

## Key elements

- **`nextStatuses`** (computed) — looks up `NEXT_STATUSES[example.value.status]`; resolves to `[]` while the example is still loading.
- **`useProvidedExample()`** — injects the `{ example, changeStatus }` pair via the composable from `provided.ts`.
- **`t()`** — vue-i18n translation function; button labels use the key pattern `example-status-actions.move-to-${status}`.
- **Template** — a flex-wrapped row of Vuetify `v-btn` elements (variant `tonal`, color `primary`), one per entry in `nextStatuses`. Each carries a `data-test="example-move-<status>"` attribute and calls `changeStatus(status)` on click.

## Relationships

- **`src/modules/example/domain/index.ts`** — re-exports `NEXT_STATUSES`, the status→allowed-transitions map consumed by the computed.
- **`src/modules/example/domain/statuses.ts`** — defines the status union and the `NEXT_STATUSES` lookup table (transitively via the domain index).
- **`src/modules/example/provided.ts`** — exports `useProvidedExample`, the composable that injects the example and mutation this component calls.
- **`src/modules/example/views/ExampleTarget.vue`** — the parent detail screen that *provides* the example and `changeStatus`; this component is the consumer boundary.
- **`src/modules/example/tests/example-status-actions.spec.ts`** — unit/component tests for this file.

## Notes

- The component intentionally contains no local state; all data flows in through injection. Avoid adding `ref`/`reactive` here — it would obscure the pattern the file demonstrates.
- While `example` is null (loading), `nextStatuses` is `[]` and the button row renders empty. There is no loading placeholder in the template.
- Translation keys are flat (`example-status-actions.move-to-<status>`), not nested under a module object.
