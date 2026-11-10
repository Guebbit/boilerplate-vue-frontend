---
source: src/modules/webhooks/components/SubscriptionStatusChip.vue
sha256: f98d89ff3ae4b13c67e1b85dd246e21833466920c857a5b6569e40e45470f80c
signature: ce2bfc7c1bb4f023912c691736912da9f2da88c0d498e4bc70dc0eb41314e4fd
generated_at: 2026-11-10T06:12:05.897342+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/components/SubscriptionStatusChip.vue

## Purpose
Renders a webhook subscription's status (enabled, paused, or auto-disabled) as a single colored `v-chip`. It centralizes the status→translation-key and status→colour mapping so the list view and the detail view display identical wording and colors without each page defining its own.

## Key elements
- **`subscription` prop** — Accepts `Pick<WebhookSubscription, 'enabled' | 'autoDisabledAt'>`; only the two fields the domain helper needs are required.
- **`STATUS_COLOR`** — Static `Record<SubscriptionStatus, ThemeColor>` mapping: `enabled → 'success'`, `paused → 'secondary'`, `'auto-disabled' → 'error'`.
- **`status` (computed)** — Calls `subscriptionStatusOf(subscription)` from the domain layer to derive the current `SubscriptionStatus`.
- **Template** — A single `v-chip` (`size="small"`, `variant="tonal"`) whose `color` and interpolated text (`t(\`webhook-status.${status}\`)`) are driven by the computed `status`; emits `data-test="webhook-status"` and `data-status` attributes for E2E/Cypress targeting.
- **i18n** — Chip text resolved via `t(\`webhook-status.${status}\`)`; no hardcoded strings.

## Relationships
- **`src/modules/webhooks/domain/subscription-status.ts`** — Source of the `SubscriptionStatus` type and the `subscriptionStatusOf()` function that turns the two raw fields into a tri-state. This component contains no status-derivation logic itself.
- **`src/modules/webhooks/views/WebhooksList.vue`** — Consumes the chip inside the table row for each webhook subscription.
- **`src/modules/webhooks/views/WebhookTarget.vue`** — Consumes the chip on the per-target detail page. Both views rely on this component so the display cannot drift between them.

## Notes
- The component is intentionally **stateless and prop-driven**; it holds no local state and emits no events.
- Only two fields are needed on the subscription object, so callers can pass a lightweight object rather than the full entity.
- Test selectors: `data-test="webhook-status"` scopes the chip, `data-status` carries the tri-state string for assertions.
- Colour is expressed as a Vuetify `ThemeColor` token (`success`, `secondary`, `error`) rather than a raw hex, so it follows the app's current theme automatically.
