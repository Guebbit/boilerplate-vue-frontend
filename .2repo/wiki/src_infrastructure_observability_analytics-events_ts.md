# src/infrastructure/observability/analytics-events.ts

## Purpose

A generated, byte-identical catalogue of the analytics event names this frontend app is allowed to emit. It exists so both repos in the paired architecture share a single event-name contract with no collisions, enforced by an identity gate at build time.

## Key elements

- **`analyticsEvents`** — `const` object (not an `enum`) listing the four client-only event names: `APP_STARTED`, `APP_READY`, `USER_LOGGED_OUT`, `CHECKOUT_REQUEST_FAILED`. Each value is a snake_case string. The `as const` assertion makes every value a literal type.
- **`AnalyticsEventName`** — Derived union type of the four literal strings, representing "any name this app can emit."

## Relationships

- **`scripts/spec-identity.ts`** — Runs the `check:spec-identity` gate that compares this file's bytes against the paired backend's copy. If the two diverge (i.e., someone hand-edits one side), the build fails on that commit.
- **`src/infrastructure/stores/observability.ts`** — Consumes `analyticsEvents` / `AnalyticsEventName` as the typed vocabulary for dispatching events to Umami. This file is the only place in the frontend that defines which names are legal.

## Notes

- **Generated — do not edit.** Produced by the paired backend's `contracts:bundle` task and synced via `sync:frontend`. Any change must be made in the backend's `analytics.frontend` contract fragment and re-synced.
- **`const` object instead of `enum`** is deliberate: the frontend's lint requires `E`-prefixed enums while the backend's does not, so no single `enum` syntax satisfies both repos.
- **The list is intentionally short.** All events backed by an API call (signup, login, cart, checkout outcome, orders, payments) are emitted by the backend, not here. Only client-only facts (lifecycle, local token discard, a checkout that never left the browser) appear in this catalogue.
- **`CHECKOUT_REQUEST_FAILED` ≠ `checkout_failed`.** The former is a dropped/never-sent request (outage); the latter is a server-side rejection with a reason (product problem). They are deliberately separate names and must not be merged.
