---
source: src/modules/account/components/PurchaseHoldNotice.vue
sha256: c5d25f975a7fc555fba35043614b28597dc8ea7a185251cc37a0a4af0f91e88b
signature: 588879b94e2c2fcd91a4940728286f6182dd2d74e145e3bc8ac34cb0d11eefec
generated_at: 2026-11-10T03:22:29.451700+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/PurchaseHoldNotice.vue

## Purpose

A presentational Vue component that displays a warning alert when the signed-in buyer's account is under an active purchase hold. It surfaces the hold's reason, end date, any staff note, and a link to contest the decision (GDPR Art. 22(3)). Renders nothing when no hold is in force.

## Key elements

- **`props.refreshSignal`** — optional numeric counter; any change triggers a cache-bypassing `fetchProfile(true)` so a refused checkout immediately surfaces the new hold.
- **`hold` (computed)** — reads the purchase hold record from the profile store and returns it only if its `until` date is in the future; otherwise `undefined` (component renders nothing).
- **`hasContact` (computed)** — checks via `router.hasRoute('Contact')` whether the build includes a contact page, gating the contest link.
- **`onMounted` hook** — initial `fetchProfile()` (cache-first) so the component is self-sufficient when mounted.
- **Template** — a single `<v-alert type="warning">` with i18n-interpolated reason text, optional staff note, a "still allowed" reassurance line, and a conditional `RouterLink` to the Contact route (queried with `category: 'account'`).
- **`data-test` attributes** — `purchase-hold-notice`, `purchase-hold-note`, `purchase-hold-contact` for E2E selectors.

## Relationships

- **`src/modules/account/stores/profile.ts`** — the component's sole data source; calls `fetchProfile()` on mount and on `refreshSignal` change, and reactively reads the purchase hold record from the store's state via `storeToRefs`.
- **`src/modules/account/views/Profile.vue`** — expected host page; mounts this component and raises `refreshSignal` after a refused checkout so the alert appears without a full page reload.
- **`src/modules/account/index.ts`** — module barrel; re-exports the component for use by the profile view.
- **`src/modules/account/tests/purchase-hold-notice.spec.ts`** — dedicated unit test covering the hold-present / hold-absent / expired-date rendering paths.

## Notes

- The component does its own initial fetch (`onMounted`), so a parent page doesn't need to pre-load the profile, but the store's cache is shared—if the parent already fetched, the cache hit avoids a second request.
- `refreshSignal` is a monotonic counter; only *change* matters, not the value.
- The hold expiry is re-evaluated client-side (`new Date(current.until) > Date.now()`) because the record may be stale relative to the page session.
- The Contact link is fully conditional on route existence; if the `tasks` module isn't bundled, the contest paragraph still renders but without a link.
