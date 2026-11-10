---
source: tests/support/e2e/touch.ts
sha256: 483f8353e518a7f25dfdecfe82245836da5e6b3d2530badf81c19295cbdfd19c
signature: 49988518cffb8c7d7b6da638a061b6f5d0cf879b69e620a88831822e72e30b8e
generated_at: 2026-11-10T07:37:04.411700+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/touch.ts

## Purpose

Defines Cypress custom commands and a DOM-collection helper that emulate a real touchscreen in headless Chromium, so E2E specs can exercise Vuetify's touch-only CSS and verify that every control is reachable without a hover or mouse pointer.

## Key elements

- **`enableTouch()`** – CDP call (`Emulation.setTouchEmulationEnabled`) that flips `pointer: coarse` / `hover: none`; throws on non-Chromium browsers. Verifies the switch took effect via `matchMedia('(pointer: coarse)')`.
- **`resetTouch()`** – Disables the emulation (sends `enabled: false` only, because adding `maxTouchPoints: 0` throws). No-op if the spec never enabled it.
- **`shouldBeTappable()`** – Asserts the subject is visible, not disabled (form controls), and is the topmost element at its centre (hit-test via `elementFromPoint`). Scrolls the element into the centre first.
- **`tap()`** – Composes `shouldBeTappable` + `realTouch` after the element's bounding box has been stable for `STABLE_FRAMES` consecutive animation frames.
- **`tapAway()`** – Taps the page heading to dismiss sticky tooltips the way a user would.
- **`checkTouchReachable(context)`** – Scans the page using `PROBED_SELECTOR`, runs `classifyTouchProbes` / `gatedFindings` from the findings module, writes every finding to `reports/touch/<spec>.json` via the `recordTouchFindings` CDP task, and fails on gated kinds.
- **`collectTouchProbes(win)`** *(exported)* – Reads every control / titled / tooltip element into plain `TouchProbe` records (opacity chain, visibility, interactivity, clipping, Vuetify-specific flags). Exported so a shell spec can drive it on a doctored page.
- **`sendCdp(command, params)`** – Internal helper that wraps `Cypress.automation('remote:debugger:protocol', …)`.
- **`emulating`** – Module-level boolean tracking whether the current spec has turned touch on.
- **`CONTROL_SELECTOR` / `PROBED_SELECTOR`** – CSS selectors defining what counts as a control vs. a probed element.

## Relationships

- **`scripts/e2e/touch-findings.ts`** – Provides `classifyTouchProbes`, `gatedFindings`, and the `TouchProbe` type used by `checkTouchReachable` and `collectTouchProbes`.
- **`tests/support/e2e/touch-task.ts`** – Registers the `recordTouchFindings` CDP task (named by the `TOUCH_REPORT_TASK` constant here); this file imports the `TouchRecordRequest` type for the payload shape.
- **`tests/support/e2e/commands.ts`** – Supplies `waitForTransitions`, used by `tap` to let animations settle.
- **`tests/support/stub.ts`** – Provides `asStub`, a wrapper that adds structured logging to every command registered in this file.
- **`tests/e2e/specs/touch.cy.ts`** – The spec that calls these commands; a root `afterEach` in that spec calls `resetTouch` because CDP touch state leaks into the next test of the same spec.
- **`src/ui/organisms/FormCard.vue`** – A Vuetify component whose touch-specific CSS (selection controls, field inputs) is what the probes and `shouldBeTappable` assertions target.

## Notes

- Touch state is **leaky**: `Emulation.setTouchEmulationEnabled` persists to the next test in the same spec file, so `resetTouch` must be called in a root `afterEach`—not just where `enableTouch` is called.
- `resetTouch` sends `{ enabled: false }` **without** `maxTouchPoints`; including `maxTouchPoints: 0` throws a CDP validation error.
- `setEmulatedMedia` (for hover/pointer) and `setDeviceMetricsOverride` are silent no-ops for this purpose in the tested browsers; only `Emulation.setTouchEmulationEnabled` actually flips the media features.
- `shouldBeTappable` scrolls with `block: 'center'` (not top-aligned) to avoid a false "covered" result from the sticky app bar.
- The `settled` helper (used by `tap`) polls via `requestAnimationFrame` for `STABLE_FRAMES` identical bounding rects before dispatching `realTouch`, because `realTouch`—unlike Cypress's native `.click()`—does not wait for animations to finish.
