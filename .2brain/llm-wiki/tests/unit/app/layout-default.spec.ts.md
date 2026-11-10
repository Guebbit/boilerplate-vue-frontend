---
source: tests/unit/app/layout-default.spec.ts
sha256: 078bc6ec479db72410eefcef58af21370da580488657d59c01c29045ae8eae2f
signature: d2996e163dc606d410bec9ce030e125296b687b68f95956c3c7f5b2230496f49
generated_at: 2026-11-10T07:47:26.267123+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/layout-default.spec.ts

## Purpose

Unit spec for `LayoutDefault.vue`, the single app shell the router mounts for every route. It verifies the layout's own behaviour — hero rendering from route meta, content centering, session-expiry re-entry, the operator footer line, and the privacy-choices link — while stubbing all chrome components (navigation, banners, dialogs) that have their own dedicated specs.

## Key elements

- **`answerConfig`** — Sets the value on the mocked `publicConfig` ref so footer/operator tests can control what `GET /config` returns. Casts past the readonly type of the real ref.
- **`leaf(text)`** — One-line component factory used as route targets so `<RouterView />` renders real DOM.
- **`router`** — Module-level memory-history router with routes for plain, custom-hero/centered, untitled, and all `STATIC_PAGES` (so footer `RouterLink`s resolve).
- **`CHROME_STUBS`** — Maps each chrome component (`AppNavigation`, banners, `DialogHost`, `ReauthDialog`) to `true` so Vue renders them as empty stubs.
- **`mountLayout`** — Mounts `LayoutDefault` with real Vuetify, i18n, router plugins and the chrome stubs.
- **`OPERATOR` / `mountWithOperator`** — Fixture identity and a helper that feeds it through `configAnswer` before mounting, for the footer-line tests.
- **Test suites** — `hero`, `matched view`, `session that died`, `operator line`, `privacy choices link`.

## Relationships

- **`tests/support/unit/config-answer.ts`** — Directly imported; provides `configAnswer`, a builder that shapes the mock config object (with an `operator` sub-object) and hands it to `answerConfig`, which writes it into the mocked `publicConfig` ref.
- **`scripts/audit/unused-locale-keys/scan.ts`** — Indirect: the test exercises i18n keys declared in route `meta` through the real `i18n` plugin; the scan script audits the locale bundles for keys that are never referenced in code, so the keys this spec relies on must remain present in those bundles.

## Notes

- The `@/infrastructure/config.ts` mock replaces `publicConfig` with a plain writable `ref()`; `answerConfig` uses a `Ref<unknown>` cast to bridge the readonly type of the production version.
- The `router` instance is a **module-level singleton** (created once, not in `beforeEach`). Test ordering matters if a route's side-effects accumulate.
- `vi.stubEnv` calls in the privacy-choices tests are never restored by a visible `afterEach`; a later test in the file (or in another file in the same worker) that reads those env vars could see stale values.
- Session-expiry test relies on `useSessionStore().expiredSignal` being a simple counter bump; the assertion checks that `router.replace` is called with `force: true`, distinguishing it from the `clearSession` path which must *not* trigger a re-entry.
