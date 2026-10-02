---
source: src/infrastructure/http/reauth-prompt.ts
sha256: 6735fe0d3d5bce60073f53a32b097be6de67ff45cc642e2931b97050ee661a40
generated_at: 2026-10-02T11:57:24.837652+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/reauth-prompt.ts

## Purpose

Pinia store that tracks the single open/closed state of the step-up (reauth) prompt. It exposes a promise-based API so the HTTP interceptor can block a request until a fresh session is confirmed or the visitor dismisses the dialog. It resolves `void` (not `boolean`) because the semantic is "a new session now exists," not a yes/no answer. Placed in `infrastructure/` rather than `ui/` so that `step-up.ts` can import it without violating the tier rules in `eslint.config.ts`.

## Key elements

- **`PendingStepUp`** (internal interface) — holds the `resolve`/`reject` pair for the one outstanding step-up request.
- **`useReauthPromptStore`** — the exported Pinia store (`'reauthPrompt'`) exposing:
  - `isOpen` — computed; `true` while a prompt is pending. Drives `ReauthDialog.vue` visibility.
  - `requestStepUp()` — sets `pending` and returns a `Promise<void>`. Called by the interceptor, never by a component.
  - `resolveStepUp()` — fulfils the pending promise and clears state.
  - `rejectStepUp(reason)` — rejects the pending promise (forwarded to the caller) and clears state.

## Relationships

- **`src/infrastructure/http/step-up.ts`** — the sole caller of `requestStepUp`. It is single-flight: it will not invoke `requestStepUp` a second time while one is outstanding, which is why this store only ever holds one `PendingStepUp` entry. `step-up.ts` reads `isOpen` / calls the resolve/reject methods directly; no intermediate UI-layer import is needed.

## Notes

- Only ever holds **one** pending entry (unlike `ui/dialog.ts`, which queues independent confirmations). If `requestStepUp` is called while one is already pending, it overwrites `pending` and the earlier promise is orphaned — the single-flight guarantee in `step-up.ts` is what prevents this.
- The actual `POST /account/reauth` call and token adoption live in `app/components/ReauthDialog.vue` (via `useSessionStore().reauth()`), not in this store. This file is pure state bookkeeping.
- `rejectStepUp`'s `reason` is forwarded to the interceptor's rejection chain; it is **not** surfaced to the visitor directly.
