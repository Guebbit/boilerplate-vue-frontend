---
source: src/modules/account/tests/e2e/account.visual.cy.ts
sha256: 34c2a5ea7872e7c3090b839ff638043e45aa84e9de875e7b2325ee5d7d251798
signature: 34c2a5ea7872e7c3090b839ff638043e45aa84e9de875e7b2325ee5d7d251798
generated_at: 2026-11-10T03:32:04.424965+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/account.visual.cy.ts

## Purpose

Declares the list of screens (routes, viewports, and state-setup steps) that the account module's visual-regression sweep will snapshot. All machinery (viewport cycling, baseline comparison, re-recording) lives in the shared `visual-sweep.ts` helper; this file only *names* what to photograph and how to reach each state.

## Key elements

- **`sweepVisual('account', […])`** — single-screen sweep: the login page (`/en/login`) at `desktop` and `phone` viewports, gated on `#login-page` being ready.
- **`sweepVisual('account — signed in', […], 'user')`** — three sub-cases, all phone-only:
  - `profile, 2FA panel off` — shorthand tuple form (name, route, selector); captures the default profile view.
  - `profile, add-address dialog` — object form with a `prepare` callback that opens the address dialog and waits for it to be visible.
  - `profile, 2FA backup codes` — `prepare` drives a full email-2FA enrollment flow (click add → type mailed code → confirm) to surface the backup-codes screen; `redact` blanks the `li` elements under `[data-test=backup-codes-list]` because codes are random per enrollment.
- **`sweepVisual('account — 2FA login challenge', […])`** — one case; `prepare` logs in, enrolls 2FA, logs out, then re-logs in and submits credentials to land on the in-memory challenge page (unreachable via a plain `cy.visit`).
- **`seedAccount('user')`** — imported from `scenario.ts`; provides the seeded account's email/password so `prepare` callbacks can fill forms and `typeMailedTwoFactorCode` can retrieve the OTP.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides `sweepVisual`, the function this file calls three times. It handles viewport iteration, waiting on `readySelector`, invoking `prepare`, applying `redact`, taking snapshots, and comparing against baselines.
- **`tests/support/e2e/scenario.ts`** — provides `seedAccount`, which returns the seeded test account object (email, password, etc.) used inside the `prepare` callbacks to drive login and 2FA enrollment.

## Notes

- Baseline PNGs live in `__snapshots__/` **beside this file**; deleting the account module removes its snapshots automatically.
- Not included in `npm run complete`. Run with `npm run test:e2e:visual`; re-record with `npm run test:e2e:visual:update` **only after visually inspecting the diff image**.
- Cases that depend on a live mailbox use `cy.skipUnlessMailbox()` inside `prepare`, so they are silently skipped in environments without mail infrastructure (e.g., some CI runners).
- The 2FA backup-codes and challenge cases are state that Pinia holds in memory — they cannot be reached by `cy.visit` alone, hence the multi-step `prepare` sequences.
- Shorthand `[name, route, selector]` arrays are valid entries in the screen list alongside full object entries; use the object form when you need `viewports`, `prepare`, or `redact`.
