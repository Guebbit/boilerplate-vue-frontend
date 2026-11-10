---
source: tests/unit/ui/human-check.spec.ts
sha256: 587d7db67fd9cecfbf027e1c7c81bfba9805014dd8f911f852fd3bb7812b30fd
signature: 450977e3b5cbf131dc2f605878c64e366be1334d8bc5a4ca6d4574f7a01a79ad
generated_at: 2026-11-10T08:26:19.975620+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/human-check.spec.ts

## Purpose

Unit tests for `HumanCheck.vue`, the provider-neutral anti-bot challenge widget. The file verifies that the component renders the correct vendor branch (Altcha, Cloudflare Turnstile, or nothing) based on the `GET /config` response, and that it degrades gracefully when the config API is unreachable. The actual vendor widgets are mocked out entirely — the goal is to test the *branching logic*, not the third-party libraries.

## Key elements

- **`vi.mock('altcha', () => ({}))`** — Neutralises the `altcha` import's side-effect (custom-element registration / proof-of-work) so no real challenge code executes.
- **`vi.mock('@/infrastructure/http/antibot.ts', …)`** — Partial mock: keeps the module's real exports but replaces `fetchAntibotConfig` and `fetchAntibotChallenge` with `vi.fn()` spies.
- **`beforeEach` block** — Pre-resolves `fetchAntibotChallenge` with a valid Altcha challenge object. Without this, the Altcha branch's internal `.then()` would throw an unhandled rejection in *every* test case.
- **`config(provider, parameters)`** — Local helper that builds a realistic `GET /config` response body for a given provider name.
- **`afterEach` block** — Removes any `<script data-antibot-vendor>` elements injected into the document (Turnstile branch) and clears all mocks.
- **`describe('provider branching')`** — Four cases: `none` renders nothing; `altcha` renders `<altcha-widget>`; `turnstile` injects the vendor script tag; no `token` is exposed before the visitor solves the challenge.
- **`describe('an API that cannot be reached')`** — Single case: config fetch rejects with the value produced by `aProblem()`; asserts no widget renders, `logger.warn` is called once, and no unhandled rejection leaks.

## Relationships

- **`tests/support/stub.ts`** — Supplies `asStub<T>()`, a typed cast helper used on the mounted component's instance to read internal state without a full component type definition.
- **`tests/support/unit/fixtures.ts`** — Supplies `aProblem()`, a factory that builds a structured error response (status 0, `NETWORK_ERROR`) to simulate total API unavailability.

## Notes

- The Turnstile test asserts against the **real DOM** (`document.querySelector('script[data-antibot-vendor="…"]')`), not the component's rendered HTML. This is why `afterEach` manually removes injected scripts — `@vue/test-utils`' wrapper teardown won't clean them up.
- The `beforeEach` mock of `fetchAntibotChallenge` looks irrelevant to the non-Altcha tests but is load-bearing: the component fires the call unconditionally on mount, and an unresolved promise would reject in the `none`/`turnstile` tests as a side-effect.
- `flushPromises` (from `@vue/test-utils`) is used everywhere async setup settles; plain `await` on a microtask is not sufficient for the component's multi-step init.
