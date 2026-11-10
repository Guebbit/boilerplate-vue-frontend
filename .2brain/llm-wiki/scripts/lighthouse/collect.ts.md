---
source: scripts/lighthouse/collect.ts
sha256: 13a6acd2580df65ab5cfd623774434962257646f7b3e157f21a95a8c4351efd0
signature: a8cac6982fd0be62682d710240d54971f84ebeb58ff6b31a91cb80813ab1ffde
generated_at: 2026-11-10T02:42:57.108126+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/collect.ts

## Purpose

The I/O half of the Lighthouse runner. It drives a real Chrome browser through each test case—signing in a persona via the login form (including 2FA), running the case's `prepare` step, then executing Lighthouse N times—and hands back the measured reports for `evaluate` to score.

## Key elements

- **`MeasuredRun`** (exported interface) — one measured round: the narrowed `Report` for `evaluate`, the full Lighthouse `Result`, and the HTML report string.
- **`collectCase`** (exported) — public entry point. Creates an isolated browser context, opens a page, delegates to `measureCase`, and closes the context in `finally`.
- **`measureCase`** — resolves the persona's credentials from the scenario, signs in, runs `audit.prepare`, then calls `measureOnce` `runs` times sequentially.
- **`signIn`** — navigates to `/en/login`, types email/password, submits via `form.requestSubmit()`, answers the 2FA challenge if the account has a `totpSecret`, and waits until the URL leaves `/login`.
- **`answerChallenge`** — waits for the two-factor challenge element, generates a TOTP code via `loginTotpCodeFor`, types it, and clicks submit.
- **`measureOnce`** — calls `lighthouse(url, lighthouseFlags(port), undefined, page)` on the already-signed-in page and packages the result into a `MeasuredRun`.
- **`toReport`** — projects a full Lighthouse `Result` down to the `Report` shape that `evaluate` consumes (score, display mode, numeric value, a narrow view of `details`, category scores, and benchmark index).
- **`sequentially`** — generic loop that awaits `step()` `count` times in order; guarantees Lighthouse runs never overlap.

## Relationships

- **`tests/support/lighthouse/case.ts`** — source of the `LighthouseCase` type and `AUDIT_APP_ORIGIN` (the base URL for navigation and TOTP).
- **`tests/support/scenario-description.ts`** — provides the `ScenarioDescription` type describing what the backend seeded (accounts, subjects).
- **`scripts/e2e/totp.ts`** — provides `loginTotpCodeFor`, which turns a base32 secret into the one-time code typed into the challenge form.
- **`scripts/lighthouse/audit-environment.ts`** — provides `AUDIT_API_URL` passed to `loginTotpCodeFor`.
- **`scripts/lighthouse/chrome.ts`** — provides the `AuditBrowser` type (launched Chrome + debug port) that `collectCase` receives.
- **`scripts/lighthouse/evaluate.ts`** — defines the `Report` type that this file imports and that `toReport` produces.
- **`scripts/lighthouse/route.ts`** — provides `resolveRoute` to turn a case's route template + seeded subjects into a concrete URL.
- **`scripts/lighthouse/settings.ts`** — provides `lighthouseFlags` (the flags array passed to every Lighthouse invocation).
- **`scripts/lighthouse/run.ts`** — the runner that calls `collectCase` for each case in the suite.

## Notes

- **Isolation model:** Each case gets its own `BrowserContext` (created and closed inside `collectCase`), so cookies/storage from a signed-in persona never bleed into the next case.
- **Lighthouse 13 caching behavior:** Cookies and storage persist across successive `measureOnce` calls on the same page, but the HTTP cache is cleared each run—so runs 2..N represent a cold-cache, warm-session load.
- **Sequential constraint:** `sequentially` exists explicitly because concurrent Lighthouse runs against the same page corrupt results; the loop is intentional, not an oversight.
- **2FA + navigation:** The challenge page lives under the `/login` path, so `waitForFunction(!location.pathname.includes('/login'))` covers both a successful login and a rejected code (which stays on the challenge page and times out). The thrown error names the account email for easier diagnosis.
- **`toReport` cast:** The `details` field is cast to `{ items?: { url?: string }[] }` because `evaluate` only reads `network-requests` rows; the cast is safe by construction, not by runtime check.
