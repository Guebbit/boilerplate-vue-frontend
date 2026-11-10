---
source: src/modules/returns/components/StatedAtFields.vue
sha256: 4468aeb021d16e9c47ca3fb05f18db40f3720a043bf23327ebfe7816efac8f38
signature: 9a435aa285e4782ea55db514e7ccf532fd1b0129896e81fbeaa5ffca8a1b00b6
generated_at: 2026-11-10T05:37:03.940764+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/StatedAtFields.vue

## Purpose

Reusable Vuetify field group that lets staff record **when** a buyer said something (a `datetime-local` picker capped to "now") and, for withdrawals, **via which channel** they said it. Extracted so the three staff-facing return forms present and validate these two fields identically.

## Key elements

- **`StatedAtFields`** (default export, non-setup `<script>`) — gives the SFC a stable `name` for devtools and `<KeepAlive>`; `<script setup>` cannot declare one.
- **Props** — `withChannel` (show/hide the channel `<v-select>`), `dateRequired` (changes label & hint), `dateErrors`, `channelErrors` (error message arrays fed into `fieldErrorProps`).
- **`requestedAt`** (`defineModel<string>`, required) — two-way binding for the datetime string.
- **`statedVia`** (`defineModel<string>`, default `''`) — two-way binding for the selected channel.
- **`maxNow`** (computed) — `toLocalInput(new Date())`; sets the `:max` attribute so the API never receives a future timestamp.
- **`channelOptions`** (computed) — maps `STATEMENT_CHANNELS` to `{ value, title }` pairs with i18n-translated titles.
- **Template** — a flex row containing a `<v-text-field type="datetime-local">` and a conditional `<v-select>`; both wired through `fieldErrorProps` for inline error display. `data-test` attributes on both fields for E2E selectors.

## Relationships

- **`src/modules/returns/domain/statement.ts`** — supplies `STATEMENT_CHANNELS` (the enum-like list rendered in the channel select) and `toLocalInput` (formats a `Date` into the `datetime-local` input format used by `maxNow`).
- **`src/modules/returns/components/ReturnRequestForm.vue`** — consumer; renders `<StatedAtFields>` without `withChannel` (a return request has no channel).
- **`src/modules/returns/components/RecordWithdrawalDialog.vue`** — consumer; renders `<StatedAtFields>` with `withChannel` and `dateRequired`.
- **`src/modules/returns/components/CancelRemainderDialog.vue`** — consumer; renders `<StatedAtFields>` with `withChannel` and `dateRequired`.

## Notes

- `maxNow` is a `computed` whose source (`new Date()`) has no reactive dependency, so Vue caches the value after first evaluation. In practice the "max" is frozen at the moment the component first renders, not continuously ticking. For a form that lasts seconds-to-minutes this is fine; a long-lived open form could technically allow a date slightly past real-now.
- The non-setup `<script>` block exists **only** for the `name` option. Remove it and devtools / `<KeepAlive>` lose the component's identity.
- `statedVia` defaults to `''`, so the channel select is empty on mount even when `withChannel` is true — the form owner is responsible for validation.
