---
source: src/modules/observability/tests/audit-target.spec.ts
sha256: 0b7698c8245976da379a479ef8f9c8796d9d4bd10f5d4ffbfa5e54e917cee6f7
signature: 0a4f7296fef9dea7bb13d2367b9eb06cb69c476558f639ba7f102696f5c1c148
generated_at: 2026-11-10T04:54:14.132885+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/audit-target.spec.ts

## Purpose

Vitest spec for the `audit-target` module. It verifies that `auditTargetLocation` returns the correct route link only when the target type has a detail route **and** the current build ships that route, and that `shortTargetId` truncates to the first eight characters.

## Key elements

- **`routerWith(...names)`** – local factory that returns a minimal `{ hasRoute }` mock. Tests pass it in place of a real router so they can control which route names "exist" in the build.
- **`describe('auditTargetLocation')`** – table-driven checks (order, user, product, webhook_subscription) that the returned object is `{ name, params: { id } }`; plus negative cases for unknown types, a build missing the route, and missing `targetType`/`id` arguments.
- **`describe('shortTargetId')`** – asserts the 8-char truncation and that short strings pass through unchanged.

## Relationships

- **`src/modules/observability/audit-target.ts`** – the module under test; this spec imports `auditTargetLocation` and `shortTargetId` from it and exercises their public contracts.
- **`src/modules/shop-tasks/tests/notices.spec.ts`** – graph neighbor; no direct import or code-level interaction is visible in this file.

## Notes

- The router argument is deliberately tiny (`hasRoute` only). Tests never touch a real router, so they won't break if the app's router API grows—only the `hasRoute` contract matters.
- `auditTargetLocation` is called with two and three arguments across different tests to cover the "row without a target" branch; the function signature appears to treat the third argument (`id`) as optional.
