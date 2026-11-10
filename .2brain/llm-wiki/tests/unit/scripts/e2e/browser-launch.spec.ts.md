---
source: tests/unit/scripts/e2e/browser-launch.spec.ts
sha256: e5d2b740878ee02b7ba68dd877e0aeb3022782a9ff3cad2f499668ed55b61050
signature: 97167d6163b561a41376bb9a382a1ca5690a72b37f6ebd80989d32c550d9da29
generated_at: 2026-11-10T08:14:56.046779+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/browser-launch.spec.ts

## Purpose
Unit tests for the three browser-window helpers exported by `scripts/e2e/browser-launch.ts`. They verify how a headless Playwright run gets its window size (via Electron preferences or a `--window-size` flag) and its pointer-type emulation, and confirm that each helper is a no-op for browser targets it does not apply to.

## Key elements

- **`SIZE`** — `{ width: 1280, height: 844 }`, the canonical desktop viewport used across most assertions.
- **`EMPTY`** — minimal baseline options object (`args: ['--existing']`, `preferences: { keep: true }`) so tests can assert the exact shape after mutation.
- **`describe('windowFor')`** — three cases: picking width from one entry and height from another in a two-entry matrix; returning the sole entry of a single-entry matrix; and resolving the full `VIEWPORTS` matrix to `SIZE`.
- **`describe('withWindowSize')`** — four cases: Electron gets `width`/`height` written into `preferences`; plain Chromium gets `--window-size=1280,844` appended to `args`; a headed run returns the input object unchanged (`toBe`); Firefox returns the input unchanged.
- **`describe('withDesktopPointer')`** — three cases: plain Chromium gets a `--blink-settings=…` hover/pointer arg; Electron and Firefox both return the input unchanged.

## Relationships

- **`scripts/e2e/browser-launch.ts`** — the module under test; this spec imports `windowFor`, `withDesktopPointer`, and `withWindowSize` and exercises their public behavior.
- **`scripts/e2e/viewports.ts`** — provides the `VIEWPORTS` constant, used as real-world input data in the `windowFor` full-matrix test.

## Notes

- The three "browser targets" are discriminated by the `{ name, family }` pair on the descriptor: `{ name: 'electron', family: 'chromium' }`, `{ name: 'chromium', family: 'chromium' }`, and `{ name: 'firefox', family: 'firefox' }`.
- For no-op cases the tests assert **identity** (`toBe`) rather than deep equality, confirming the function returns the exact same object reference instead of a clone.
- `windowFor` merges a viewport *matrix* (record of name → `{ width, height }`) by taking the maximum width and maximum height across all entries, not a simple union or last-wins.
