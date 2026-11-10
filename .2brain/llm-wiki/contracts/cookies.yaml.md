---
source: contracts/cookies.yaml
sha256: f59594058df97f2df3f2543a6adef68ce185d1da24d586fb73fac49e1c1a23ff
signature: f59594058df97f2df3f2543a6adef68ce185d1da24d586fb73fac49e1c1a23ff
generated_at: 2026-11-10T02:10:49.197644+00:00
model: ollama:qwen3.8:27b
---

# contracts/cookies.yaml

## Purpose

Single source of truth for every cookie the backend sets. It defines each cookie's name, purpose, secrecy, and lifetime so that the setting code, the log scrubber, and the GDPR documentation all agree on the same set.

## Key elements

- **`cookies` map** — keyed by camelCase id (which doubles as the frontend's i18n translation key for the purpose text). Each entry carries: `name` (the wire cookie name), `setter`, `kind`, `purpose`, `necessity`, `secret`, and either `lifetime` (a tier name like `sessionTier` or `challenge`) or an explicit `maxAgeMs`.
- **`session`** — the credential cookie (`__Host-session`). Carries the refresh token in `jwt` mode or the session id in `cookie` mode. Its `name` must equal the contract's `cookieAuth.name` (guarded by a cross-cutting test).
- **`isAuth`** — signed-in flag; frontend-only hint, not a credential.
- **`device`** — up to five HMAC tokens (one per account), 180-day lifetime, renewed on each successful login.
- **OAuth attempt cookies** (`oauthState`, `oauthVerifier`, `oauthContinue`, `oauthLocale`, `oauthLink`) — 5-minute window around a provider sign-in; cleared by the callback.
- **Challenge cookies** (`oauthMfaChallenge`, `oauthDeletionChallenge`) — carry a login or deletion claim across a redirect; lifetime tied to the challenge itself (`lifetime: challenge`).

## Relationships

- **contracts/log-redaction.yaml** — The effective log-redaction set is that file's entries **union** the `secret: true` names here. The frontend twin must apply the same union.
- **contracts/browser-storage.yaml** — The frontend's counterpart for client-side storage; uses the same entry format so the two files stay structurally parallel.
- **docs/theory/data-protection.md** — The GDPR cookie table is generated/maintained from the `purpose`, `necessity`, and `secret` fields in this file.

## Notes

- The map key (camelCase) is **not** the wire cookie name — it is the i18n key the frontend uses to look up the purpose string.
- `secret: true` does not only mean "httpOnly"; it is the signal that tells the log scrubber to redact that value.
- `session` and `device` use `lifetime: sessionTier`; challenge cookies use `lifetime: challenge`; OAuth-attempt cookies use an explicit `maxAgeMs: 300000` (5 min).
- All backend cookies carry the `__Host-` prefix (host-bound, no `Path` or `Domain` attribute), except `isAuth`.
