---
source: tests/support/lighthouse/case.ts
sha256: 84c1fb297658c198025eb7a6987686927bc1e55c396e8d779ae67f34469f90fb
signature: 067b7ee071b1b9fa27db8bde5dfb5cbd9066409bbe04abfd0eac4174c1accef6
generated_at: 2026-11-10T07:38:22.108489+00:00
model: ollama:qwen3.8:27b
---

# tests/support/lighthouse/case.ts

## Purpose

Defines the type-level contract for a single Lighthouse audit case — the route to load, the persona to sign in as, optional pre-audit interactions, SEO opt-in, and accepted audit exceptions. It lives in `tests/support/` so both module-local case files and the shared `tests/lighthouse/site.ts` can import the same shape without circular dependencies.

## Key elements

- **`AUDIT_APP_ORIGIN`** (`const`) — The fixed origin (`http://localhost:8085`) where the `vite preview` build is served; every e2e script uses this port.
- **`PrepareContext`** (interface) — The object handed to a case's `prepare` callback: the app origin and a `subjects` map (guarantee name → row id) fetched from `/__test/scenario`.
- **`LighthouseCase`** (interface) — The full case shape:
  - `name` — `<module>/<name>` identifier used in reports and baselines.
  - `route` — App path; supports `{subject:…}` placeholders resolved from the scenario.
  - `persona` — Optional `E2ERole` to sign in as before audit.
  - `prepare` — Optional async hook that drives the page (e.g. add to cart) once before the runs.
  - `seo` — Optional flag opting in to SEO audits (default off to avoid crawling signed-in/cart pages).
  - `exceptions` — Optional map of audit id → reason; a stale exception (audit that now passes) causes the run to fail.
- **`CaseRules`** (type alias) — `Pick<LighthouseCase, 'name' | 'seo' | 'exceptions'>`; the subset the evaluation step reads, separating "what to assert" from "how to reach the page."

## Relationships

- **`tests/support/scenario-description.ts`** — Provides the `E2ERole` type imported for use in `LighthouseCase`.
- **`src/modules/cart/tests/lighthouse.ts`, `src/modules/example/tests/lighthouse.ts`, `src/modules/orders/tests/lighthouse.ts`, `src/modules/products/tests/lighthouse.ts`** — Each module's case file imports `LighthouseCase` (and often `PrepareContext`) to declare its audit cases alongside the module code.
- **`tests/lighthouse/site.ts`** — Uses the same interfaces for cases that don't belong to a single module.
- **`scripts/lighthouse/run.ts` / `collect.ts` / `evaluate.ts`** — The CLI scripts that consume `LighthouseCase` (to navigate, sign in, and prepare) and `CaseRules` (to assert results against the baseline and exceptions).

## Notes

- Cases are deliberately co-located with their module so `npm run demo:remove` deletes them automatically; only truly cross-cutting cases live in `site.ts`.
- `seo` is **opt-in by design**: a signed-in page or the cart is never SEO-audited unless the case explicitly sets `seo: true`.
- An entry in `exceptions` that no longer fails in any run is treated as a **stale exception** and causes the audit run to fail — it must be removed rather than left as noise.
- The `{subject:…}` placeholder in `route` is resolved at runtime from the `/__test/scenario` response, not at import time.
