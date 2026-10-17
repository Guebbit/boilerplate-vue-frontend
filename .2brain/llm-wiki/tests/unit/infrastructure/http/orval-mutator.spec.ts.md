---
source: tests/unit/infrastructure/http/orval-mutator.spec.ts
sha256: 93b7469134124dbddbec17cc157b74f4ec424cd55fe1a84dec4b9f5bfe535ed9
generated_at: 2026-10-17T02:36:50.088237+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/orval-mutator.spec.ts

## Purpose

Unit tests for `orvalMutator`'s header-merge precedence logic in `src/infrastructure/http/index.ts`. This spec exists because no other test in the repo exercises the case where both a generated `config` and a caller-supplied `options` object carry overlapping header keys — the precedence rule (config wins) that the antibot token and multipart-boundary paths depend on.

## Key elements

- **`okResponse(data)`** – Local helper that fabricates a minimal `AxiosResponse` (only `.data` is read by `orvalMutator`). Uses `asStub` to satisfy the `InternalAxiosRequestConfig` type without real values.
- **`afterEach`** – Calls `vi.restoreAllMocks()` so each test gets a fresh spy.
- **Test: caller option headers preserved alongside config headers** – Verifies that non-conflicting keys from both sources appear in the merged request.
- **Test: config header wins on same-key conflict** – `Content-Type` from generated config overrides the caller's option value.
- **Test: non-header option/config merge** – `timeout` (caller) and `url` (config) both land on the outgoing request; config wins on key conflicts.
- **Test: resolves with unwrapped body** – `orvalMutator` returns `response.data`, not the full `AxiosResponse`.

## Relationships

- **`tests/support/stub.ts`** → provides `asStub<T>()`, used inside `okResponse` to create a type-correct but empty `InternalAxiosRequestConfig` object.
- **`src/infrastructure/http/index.ts`** → source of `orvalMutator` (the SUT).
- **`src/infrastructure/http/client.ts`** → source of `instance` (the axios instance whose `.request` method is spied on).

## Notes

- Spies on `instance.request` directly rather than routing through MSW — the target is the config object `orvalMutator` assembles, not the network round-trip.
- The file's leading docblock documents *why* this spec is separate: other specs either mock `orvalMutator` entirely or drive it via MSW without ever supplying both a config and an options object with overlapping header keys.
