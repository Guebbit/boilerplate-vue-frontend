---
source: tests/unit/scripts/lighthouse/route.spec.ts
sha256: 01cb3d50ca3b7867ab5cd0848f90c28380a2e6326cca18d9ec551b21c4896fff
signature: 01cb3d50ca3b7867ab5cd0848f90c28380a2e6326cca18d9ec551b21c4896fff
generated_at: 2026-11-10T08:21:41.347195+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/lighthouse/route.spec.ts

## Purpose

Unit test suite for the `resolveRoute` utility that expands `{subject:…}` placeholders in a Lighthouse case's route into concrete published values. Ensures the placeholder grammar, pass-through behavior, and the failure mode (naming the missing subject and listing what *is* published) all behave as intended.

## Key elements

- **`describe('resolveRoute')`** – Vitest block covering three scenarios:
  - *Fills a subject placeholder with the published id* – verifies `{subject:product.rich}` is replaced by the corresponding value (`'42'`).
  - *Leaves a route without placeholders alone* – confirms an empty `published` map and a literal path (`/en/cart`) are returned unchanged.
  - *Names the subjects the backend does publish when one is missing* – asserts a thrown error whose message contains the missing key (`"nope"`) and the list of available published subjects (`order.paid`).

## Relationships

- **`scripts/lighthouse/route.ts`** – the sole production dependency; provides the `resolveRoute` function under test. No other modules are imported.

## Notes

- The placeholder syntax is `{subject:<key>}`; the `subject:` prefix is fixed and the key is looked up in the second argument object.
- The error-message assertion uses a regex (`/"nope".*published: order\.paid/`) rather than an exact string, so the test is tolerant of rewording but still pins the two required pieces of information (the offending key and the available keys).
- Tests are flat (no nested `describe`); there is no setup/teardown or mocking—`resolveRoute` is a pure function.
