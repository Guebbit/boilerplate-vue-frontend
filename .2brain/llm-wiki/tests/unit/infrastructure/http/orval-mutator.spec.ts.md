---
source: tests/unit/infrastructure/http/orval-mutator.spec.ts
sha256: d90c935b62b9e0f3f0b16c1b9d14049853a546b45dc610065152323adcdaafa8
signature: 5c27f61f50f5614afdb02493b06735baa95fa02db6b7a6e63a5286f7720e87d3
generated_at: 2026-11-10T07:59:09.494913+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/orval-mutator.spec.ts

## Purpose

Unit-tests the header and option merge logic inside `orvalMutator` (exported from `src/infrastructure/http/index.ts`). It is the only spec that drives the mutator with **both** a generated `config` and a caller `options` object sharing overlapping header keys, proving that `config` wins on conflict — a precedence the antibot token and multipart boundary paths rely on.

## Key elements

- **`okResponse(data)`** – local helper that returns a minimal `AxiosResponse` stub (only `.data` is read by `orvalMutator`). Uses `asStub<InternalAxiosRequestConfig>({})` to satisfy the type.
- **`describe('orvalMutator')`** – four tests:
  - *keeps the caller's own option headers alongside the generated config's* – verifies both header sets coexist when keys differ.
  - *lets the generated config's header win over the caller option's, for the same key* – asserts `config.headers` overrides `options.headers` for an identical key (e.g. `Content-Type`).
  - *merges non-header options and config, config winning on conflict* – confirms scalar options like `timeout` and `signal` are merged with config-wins precedence.
  - *resolves with the unwrapped response body, not the whole axios response* – asserts the returned value is `response.data`, not the full `AxiosResponse`.

## Relationships

- **`tests/support/stub.ts`** – imports `asStub`, a utility that casts an empty object to a given type without runtime cost; used to fill the `config` field of the `okResponse` helper.

## Notes

- The spy target is `instance.request`, not MSW handlers. The test inspects the **first argument** passed to `request` (i.e. the config `orvalMutator` assembles); it never asserts on a network round-trip.
- All four tests follow the same pattern: `vi.spyOn(instance, 'request').mockResolvedValue(okResponse(…))`, then call `orvalMutator(config, options)`, then read `request.mock.calls[0]?.[0]`.
- The file's docblock explicitly calls out that no other spec exercises the two-argument merge path; if `orvalMutator`'s signature or merge order changes, these tests are the regression guard.
