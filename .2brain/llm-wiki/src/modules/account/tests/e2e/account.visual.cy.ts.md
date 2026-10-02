---
source: src/modules/account/tests/e2e/account.visual.cy.ts
sha256: f7e0caae9b6f644087f159757e718285d8d64ffabd8d285e8688bef893f5ef30
generated_at: 2026-10-02T12:22:16.844406+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/account.visual.cy.ts

## Purpose

Declares the list of screens to capture in the account module's visual-regression sweep. It contains no snapshot logic itself — that mechanism lives in `visual-sweep.ts`; this file only names routes, readiness selectors, and any per-screen `prepare` / `redact` hooks needed to reach a specific state.

## Key elements

- **`sweepVisual('account', …)`** — Single-screen sweep: the `/en/login` page (`#login-page`), no special setup.
- **`sweepVisual('account — signed in', …, 'user')`** — Two screens on `/en/profile`:
  - *2FA panel off* — plain visit, no `prepare`.
  - *2FA backup codes* — `prepare` drives a full email-2FA enrollment flow (add → code → confirm); `redact` masks the `<li>` elements in `#backup-codes-list` because the codes are random on every enrollment.
- **`sweepVisual('account — 2FA login challenge', …)`** — The `/en/login` page in its 2FA-challenge state. `prepare` enrolls 2FA, logs out, re-logs in, and submits credentials so the Pinia-held challenge state renders. No `readySelector` beyond `#profile-page`-style check via `#two-factor-challenge-page`.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` helper that iterates over the screen list, drives the browser, and writes PNG baselines into `__snapshots__/`.
- **`tests/support/e2e/scenario.ts`** — Provides `seedAccount('user')`, which returns the demo user's credentials (email, password) used in both `prepare` callbacks.

## Notes

- Baselines are co-located in `__snapshots__/` next to this file; deleting the module directory removes the snapshots automatically.
- Not included in `npm run complete`. Run with `npm run test:e2e:visual`; re-record with `npm run test:e2e:visual:update` **only after inspecting the diff image**.
- Both `prepare` callbacks call `cy.skipUnlessMailbox()` — the 2FA flows require a working demo mailbox and are skipped otherwise.
- The 2FA challenge screen is unreachable via a plain `cy.visit` because it depends on in-memory Pinia state; the `prepare` hook must perform a real login cycle.
