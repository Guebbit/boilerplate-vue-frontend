---
source: tests/unit/ui/human-check.spec.ts
sha256: 55a443d792d8e8e07aa8b41ab67f010af1a769e89576a035ce220745b0ae19d4
generated_at: 2026-10-17T02:46:32.155005+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/human-check.spec.ts

## Purpose

Unit-test suite for the `HumanCheck.vue` provider-neutral widget. It verifies that the component renders the correct vendor branch (Altcha, Cloudflare Turnstile, or nothing) based on the `GET /antibot/config` response, and that network failures are handled gracefully. All real vendor logic (Altcha proof-of-work, Turnstile script) is mocked so the tests exercise *branch selection*, not third-party libraries.

## Key elements

- **`vi.mock('altcha', () => ({}))`** — replaces the `altcha` module with an empty object so the custom-element registration side-effect never executes.
- **`vi.mock('@/infrastructure/http/antibot.ts', …)`** — preserves the real module shape but replaces `fetchAntibotConfig` and `fetchAntibotChallenge` with `vi.fn()` spies.
- **`config(provider, parameters)`** (local helper) — builds a well-formed `GET /antibot/config` envelope for a given provider string and optional parameter bag.
- **`beforeEach`** — pre-resolves `fetchAntibotChallenge` with a valid Altcha challenge payload; prevents unhandled rejections in non-Altcha test cases (the Altcha branch fetches on mount).
- **`afterEach`** — removes any `<script[data-antibot-vendor]>` tags injected into the DOM by the Turnstile branch, then clears all mocks.
- **`describe('HumanCheck — provider branching')`** — four tests: `none` renders nothing; `altcha` renders the `<altcha-widget>` tag; `turnstile` renders the wrapper and injects the vendor `<script>`; token is `undefined` before the visitor solves.
- **`describe('HumanCheck — an API that cannot be reached')`** — asserts no widget is rendered, `logger.warn` is called once, and no unhandled rejection escapes.

## Relationships

- **`tests/support/stub.ts`** — provides the `asStub<T>()` generic used to type-cast `wrapper.vm` when asserting on the component's reactive `token` property without a full typed-component setup.

## Notes

- The Turnstile test asserts against a **real `<script>` tag in `document`**, not a Vue-managed node. Cleanup is manual in `afterEach` (`querySelectorAll('script[data-antibot-vendor]')`) because Vitest's DOM teardown does not remove imperatively-injected scripts.
- `fetchAntibotChallenge` is resolved unconditionally in `beforeEach` even for the `none`/`turnstile` cases; omitting this causes a silent unhandled rejection in the Altcha mount path that bleeds into sibling assertions.
- The `altcha` mock is a **module-level side-effect mock** (empty object), not a per-test spy—there is no callable API to assert against because the test only cares that the `<altcha-widget>` tag is present.
