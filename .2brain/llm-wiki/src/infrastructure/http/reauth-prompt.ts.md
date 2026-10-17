---
source: src/infrastructure/http/reauth-prompt.ts
sha256: 72eb6c5f8cae21c7e0789c35b0c68a900b6609da3637bfd58e1fd58505fe4311
generated_at: 2026-10-17T00:10:13.942079+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/reauth-prompt.ts

## Purpose

A Pinia store that holds the open/closed state of the step-up re-authentication prompt and exposes a promise-based API so the HTTP interceptor can `await` a result without knowing anything about the UI. It resolves `void` (meaning "a fresh session now exists") rather than a `boolean`, distinguishing itself from the general-purpose confirm dialog in `ui/dialog.ts`.

## Key elements

- **`useReauthPromptStore`** — the Pinia store (`'reauthPrompt'`), setup-syntax. Exposes:
  - `pending` — internal `ref<PendingStepUp | undefined>`; the single outstanding prompt or nothing.
  - `isOpen` — computed boolean; whether `ReauthDialog.vue` should render.
  - `requiredMethods` — computed `string[]`; extra proof methods (e.g. `['otp']`) demanded by the 401's `details.methods`; empty while closed.
  - `requestStepUp(requiredMethods?)` — called by the interceptor; stores a `resolve`/`reject` pair and returns a `Promise<void>`.
  - `resolveStepUp()` — called by the dialog after a successful re-auth; settles the promise and clears `pending`.
  - `rejectStepUp(reason)` — called by the dialog on cancel/close; settles with the reason and clears `pending`.
- **`PendingStepUp`** (interface) — one pending request: `requiredMethods`, `resolve`, `reject`.

## Relationships

- **`src/infrastructure/http/step-up.ts`** — the step-up interceptor that *calls* `requestStepUp` and *awaits* the returned promise. It is the only producer of prompts; this store is the only holder of the pending state. `step-up.ts` is single-flight (never queues a second prompt), which is why this store holds exactly one entry rather than an array.

## Notes

- **Tier placement is deliberate.** The file lives in `infrastructure/` (not `ui/`) because `step-up.ts` (also `infrastructure/`) imports it directly, and the eslint tier rules forbid `infrastructure → ui` imports. The render-only concern is fully delegated to `app/components/ReauthDialog.vue`.
- **No HTTP call here.** The actual `POST /account/reauth` and token adoption happen inside `ReauthDialog.vue` via `useSessionStore().reauth()`; this store only tracks *whether* a prompt is open and *what* it must collect.
- **Single-flight invariant.** Because `step-up.ts` guarantees only one outstanding call, `pending` is a single `ref`, not an array. Do not treat it as a queue.
- **`rejectStepUp`'s reason** is forwarded to the interceptor's rejection handler and is never displayed to the user directly.
