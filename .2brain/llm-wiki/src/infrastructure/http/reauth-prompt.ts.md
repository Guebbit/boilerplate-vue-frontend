---
source: src/infrastructure/http/reauth-prompt.ts
sha256: b78c430014a7c1c244e2e3a33b2db8fee614b11d556a911878ef3f181529db52
signature: 0b80176e31f3ae3e8d7d648795da426450666ba7c8953a113341bc195cda876a
generated_at: 2026-11-10T03:05:39.571881+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/reauth-prompt.ts

## Purpose

Pinia store that tracks the single open/closed state of the step-up (re-authentication) prompt. It exists in the `infrastructure/` tier rather than `ui/` so that `step-up.ts` can read it directly without violating the tier-import rules defined in `eslint.config.ts`. It resolves `void` (not `boolean`) because a step-up answers "a fresh session now exists," not a yes/no.

## Key elements

- **`useReauthPromptStore`** — the exported Pinia store (id `reauth-prompt`). Exposes:
  - `isOpen` (computed) — whether `ReauthDialog.vue` should be visible.
  - `requiredMethods` (computed) — additional proof methods the open prompt must collect (e.g. `['otp']`); empty while closed.
  - `requestStepUp(requiredMethods?)` — called by the step-up interceptor to open the prompt and return a `Promise<void>` that settles when the dialog resolves or rejects.
  - `resolveStepUp()` — marks the prompt as successfully answered (fresh session exists); clears `pending`.
  - `rejectStepUp(reason)` — marks the prompt as dismissed/failed; forwards `reason` to the caller's rejection; clears `pending`.
- **`PendingStepUp`** (interface, not exported) — the single in-flight entry: `requiredMethods`, `resolve`, `reject`.

## Relationships

- **`src/infrastructure/http/step-up.ts`** — the sole caller of `requestStepUp` / reader of `isOpen`. It is single-flight: it never calls `requestStepUp` a second time while one is outstanding, which is why this store holds at most one pending entry.

## Notes

- Unlike `ui/dialog.ts`, this store does **not** queue multiple prompts — it holds exactly one `PendingStepUp` at a time. Concurrent calls to `requestStepUp` would silently overwrite the previous pending entry.
- `requiredMethods` comes from the 401 response's `details.methods` (e.g. `['otp']` when a second factor is armed). An empty array means only password recency is required.
- The actual network call to `POST /account/reauth` and token adoption live in `app/components/ReauthDialog.vue` (the sole renderer), not in this store.
