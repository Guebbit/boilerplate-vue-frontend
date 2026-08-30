# tests/unit/infrastructure/stores/observability.spec.ts

## Purpose

Unit tests for the `useObservabilityStore` Pinia store, covering the Umami analytics half (script injection, readiness guards, event buffering, `track*` helpers) and the safety contract when Faro is absent. The file exists because `src/infrastructure/observability.ts` previously carried 123 mutants with zero coverage — nothing in the telemetry surface was ever exercised.

## Key elements

- **`installUmamiTracker()`** – test helper that attaches a `vi.fn()`-based `{ track, identify }` object to `globalThis.umami`, simulating the real script's global.
- **`scriptLoads()`** – dispatches a `load` event on the injected `<script data-website-id>` tag, mimicking the browser's post-load callback.
- **`readyStore()`** – stubs `VITE_UMAMI_WEBSITE_ID` / `VITE_UMAMI_SRC`, calls `store.initUmami()`, and returns the store in its "analytics on" state.
- **`describe('analyticsEvents')`** – asserts the event-name catalogue is an exact set of four keys (guards against drift with the backend, checked by `check:spec-identity`).
- **`describe('initUmami')`** – verifies: no-op when ID is empty/whitespace; injects a single deferred `<script>` tag; idempotent across repeated calls.
- **`describe('track')`** – verifies events are dropped when tracker is absent, forwarded with correct name/payload when ready, and do not throw in the "injected but not loaded" window.
- **`describe('events tracked before the tracker arrives')`** – pins the buffer contract: events are queued, delivered once the `load` event fires, preserve order and payload, are sent exactly once even if `load` fires multiple times, bypass the buffer if the tracker already exists, and are capped at 50 entries (FIFO eviction of the oldest).
- **`describe('with Faro disabled')`** – verifies `identifyUser` still reaches Umami, tolerates a tracker without `identify` or no tracker at all; `unidentifyUser` and `captureException` are safe no-ops for any input (including non-`Error` values).

## Relationships

- **`@/infrastructure/stores/observability.ts`** – the system under test; all `describe` blocks exercise its exported store.
- **`@/infrastructure/observability/analytics-events.ts`** – provides the `analyticsEvents` constant whose shape is asserted verbatim.
- **`pinia` / `vitest`** – test framework and DI container (`createPinia` / `setActivePinia` per test).
- No other graph neighbors are recorded.

## Notes

- The Umami tracker is a **global** (`globalThis.umami`), not an injected dependency. Each test installs its own spy and `afterEach` deletes it; forgetting the cleanup causes cross-test contamination (a test that never inits analytics still sees the prior test's spy).
- `umamiReady` means "the `<script>` tag was injected," **not** "the script finished loading and attached its global." The buffer exists to bridge that one-round-trip gap; `main.ts` emits `app_started` inside it every session.
- The buffer is capped at **50** entries; the oldest are evicted first. This is a deliberate leak-prevention choice (ad-blocker or Umami outage scenario) and is pinned by the 60-event test.
- `initFaro` is **explicitly not tested** — it dynamically imports two large Grafana SDKs. Only the "Faro is off" safety branches (the state of every telemetry-disabled visitor) are covered.
- Environment variables are stubbed via `vi.stubEnv` and unstubbed in `afterEach`; `document.head.innerHTML` is cleared in `beforeEach` to prevent stale script tags leaking between tests.
