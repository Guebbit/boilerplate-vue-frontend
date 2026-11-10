---
source: src/infrastructure/reauth.ts
sha256: a1ec061218bb383a1cc27cb3b48524eef98bcc1b65d5f2e00ad39c4a1355a010
signature: 485a7ba927add77f0564f7cc652d471f17a4fd1f538dc4f4d5fffcf233bceb77
generated_at: 2026-11-10T03:09:14.275045+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/reauth.ts

## Purpose

Implements the step-up re-authentication flow: a small Pinia store that tracks the dialog's spinner and performs the single write (proving identity and adopting the new session), plus two stateless helper calls that feed the prompt (available answer methods and the mailed code). It lives in `infrastructure` rather than `account` because the shell renders the re-auth prompt on every page, independent of any account-specific routing.

## Key elements

- **`reauthSendRetryAfter(error)`** – Extracts the 429 cooldown (seconds) from a refused code-send response via `getRetryAfter`, checking for `TWO_FACTOR_RESEND_TOO_SOON`. Returns `undefined` for any other error.
- **`reauthMethods()`** – Fetches the ordered list of ways the account can answer the step-up prompt (password, mail code, etc.). Returns an empty array when no method is available.
- **`sendReauthCode()`** – Requests a step-up code by mail (hardcoded `'email'` channel). Returns the server's `resendAfter` cooldown in seconds so the UI can avoid triggering the 429.
- **`useReauthStore`** (Pinia store `'reauth'`) – Exposes:
  - `reauthing: Ref<boolean>` – Whether a re-proof request is in flight; drives the dialog's own spinner, independent of login/signup spinners.
  - `reauth(proof: ReauthRequest)` – Sends the tagged proof (password or mailed code) to the API, then calls `useSessionStore().adoptSession(data)` to store the fresh token. Sets `reauthing` true/false around the request.

## Relationships

No graph neighbors are listed for this file in the dependency graph; it is a leaf node.

## Notes

- A **422** response from `reauth()` means a wrong password or wrong code; the API reserves **401** exclusively for "your session is gone entirely." Do not conflate them in error handling.
- `sendReauthCode` hardcodes `'email'` as the channel — it is the only channel the endpoint accepts, so there is no parameter to vary.
- The store is deliberately narrow (one boolean, one action). It holds no token, no user data, and no methods list; those live in the API response or the session store.
