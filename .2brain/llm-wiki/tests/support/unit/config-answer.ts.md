---
source: tests/support/unit/config-answer.ts
sha256: 93922f0b3f5bb6ff75c82a6b543c4055a8e98edb32e455fff31b9d5256963e2f
signature: 91ad726dc3b4aac438ccb607ccbc17d7d4140bc9a6e8ecb34ac7483ebaf43134
generated_at: 2026-11-10T07:40:04.395764+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/config-answer.ts

## Purpose

Shared unit-test fixture that builds a `GET /config` response conforming to the API contract. It gives every spec a realistic, fully-shaped answer with sensible "minimal" defaults (JWT session, no OAuth, no challenge) while allowing any single field to be overridden, so tests never re-declare the full object.

## Key elements

- **`ConfigParts` (interface)** — describes the six overridable segments of the config answer: `session`, `oauthProviders`, `antibot`, `supportEmail`, `operator`, `termsVersion`. All fields are optional; omitted fields fall back to the defaults in `configAnswer`.
- **`configAnswer` (function, exported)** — accepts a partial `ConfigParts` (defaults to `{}`) and returns a complete config-response object. Defaults: JWT mode with 1/7/30-day lifetimes, empty OAuth list, `provider: 'none'` antibot with identity-budgets on and email-policy off, a placeholder support email, a fictional Italian operator block, and `termsVersion: '1'`.

## Relationships

Consumed as a fixture by unit specs across the repo that need a `GET /config`-shaped object:

- **Account module specs** (`auth-session`, `auth-signup`, `oauth-buttons`, `oauth-continue`, `oauth`, `password-breach-hint`, `signup-antibot`, `signup-continue`) — supply the config context their auth/signup/OUI flows read.
- **App-level specs** (`layout-default`, `operator-identity-block`, `privacy-page`, `terms-page`) — provide the operator, terms-version, and support-email values the UI renders.
- **Infrastructure spec** (`tests/unit/infrastructure/session.spec.ts`) — uses the `session` segment to exercise session-handling logic.
- **Tasks spec** (`src/modules/tasks/tests/contact-view.spec.ts`) — reads `supportEmail` for the contact view.

## Notes

- The function is pure and side-effect-free; it is safe to call repeatedly in a single test file.
- `antibot` defaults to `provider: 'none'` — tests that need a real challenge (e.g. Cloudflare Turnstile) must pass an explicit `antibot` override.
- The operator default is a hardcoded fictional entity ("Guebbit Demo Shop Srl", Milano). Pages that render legal/identity blocks inherit these values unless overridden.
