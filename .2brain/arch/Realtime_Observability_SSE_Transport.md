---
tags:
  - 2brain
  - 2brain/arch
  - project/boilerplate-vue-frontend
type: architecture
component: Realtime_Observability_SSE_Transport
---

```mermaid
graph LR
    Admin_Module_Schema_Contracts["Admin Module Schema Contracts"]
    Admin_Credential_Webhook_Lifecycle_Stores["Admin Credential & Webhook Lifecycle Stores"]
    SSE_Transport_Realtime_Observability_Dashboard["SSE Transport & Realtime Observability Dashboard"]
```

## Details

The SSE (Server-Sent Events) client infrastructure and the admin-facing observability module that consumes it. The SSE client (createSseClient) is a reusable, callback-based transport that opens an EventSource, handles reconnection, and dispatches typed events to registered callbacks. The observability module's store (useRealtimeObservabilityStore) and composable (useRealtimeObservability) subscribe to the SSE stream to render live KPI cards, audit-trail entries, and realtime metrics on the admin dashboard. The API-keys module (schemas + store) and the demo store are co-located because they share the same admin-facing, non-visitor audience and the same SSE-driven refresh pattern.

### Admin Module Schema Contracts
This sub-component owns the Zod validation schemas that define the data contracts for every admin-facing domain module. It includes the API-key credential schemas (apiKeyNameSchema, apiKeyPermissionsSchema, apiKeyExpiresAtSchema with a .refine() callback for expiry validation), the orders status schema, the cart line-quantity composable (settle action that clamps and validates quantity transitions), and the locales store's entry-creation and tenant-binding logic. These schemas are the single source of truth for what shape of data the stores accept and what the SSE-driven refresh must conform to. They sit at the bottom of the subsystem's dependency chain: every store and composable above them validates against these contracts before mutating state.

**Related Classes/Methods**:

- `src.modules.api-keys.schemas.apiKeyPermissionsSchema`:24-26
- `src.modules.api-keys.schemas.apiKeyExpiresAtSchema`:35-40

**Source Files:**

- `contracts/asyncapi.generated.ts`
  - `contracts.asyncapi.generated.PaymentDisputeUpdatedEnvelope` (L178-L182) - Interface
  - `contracts.asyncapi.generated.UserUpdatedPayload` (L245-L248) - Interface
  - `contracts.asyncapi.generated.NotificationStaffWebhookDisabledPayload` (L253-L261) - Interface
  - `contracts.asyncapi.generated.ShipmentLostParamsPayload` (L388-L395) - Interface
  - `contracts.asyncapi.generated.NotificationCartMergeRefusedPayload` (L457-L465) - Interface
  - `contracts.asyncapi.generated.CartMergeRefusedParamsPayload` (L468-L470) - Interface
  - `contracts.asyncapi.generated.NotificationStaffReturnsUndecidedPayload` (L545-L553) - Interface
  - `contracts.asyncapi.generated.NotificationsReadPayload` (L621-L623) - Interface
- `src/app/tours/catalogue.ts`
  - `src.app.tours.catalogue.stepsOfTour` (L116-L122) - Class
  - `src.app.tours.catalogue.stepsOfTour.steps.filter() callback` (L118-L118) - Function
  - `src.app.tours.catalogue.stepsOfTour.toSorted() callback` (L120-L121) - Function
  - `src.app.tours.catalogue.visibleSteps` (L132-L135) - Class
  - `src.app.tours.catalogue.visibleSteps.steps.filter() callback` (L135-L135) - Function
- `src/app/tours/use-tour.ts`
  - `src.app.tours.use-tour.useTour.driveSteps` (L88-L92) - Class
  - `src.app.tours.use-tour.useTour.driveSteps.map() callback` (L89-L92) - Function
  - `src.app.tours.use-tour.useTour.whenAnchored` (L101-L110) - Class
  - `src.app.tours.use-tour.useTour.whenAnchored.<function>` (L102-L110) - Function
- `src/kernel/inbox-notices.ts`
  - `src.kernel.inbox-notices.useInboxNotices` (L36-L45) - Class
  - `src.kernel.inbox-notices.useInboxNotices.computed() callback` (L39-L43) - Function
  - `src.kernel.inbox-notices.useInboxNotices.computed() callback.persistentMessages.value.flatMap() callback` (L40-L42) - Function
- `src/kernel/registry.ts`
  - `src.kernel.registry.AppNotice` (L229-L243) - Interface
  - `src.kernel.registry.AppNotice.describe` (L236-L236) - Method
  - `src.kernel.registry.AppNotice.target` (L242-L242) - Method
- `src/modules/api-keys/schemas.ts`
  - `src.modules.api-keys.schemas.apiKeyNameSchema` (L15-L18) - Class
  - `src.modules.api-keys.schemas.apiKeyNameSchema.error` (L18-L18) - Method
  - `src.modules.api-keys.schemas.apiKeyPermissionsSchema` (L24-L26) - Class
  - `src.modules.api-keys.schemas.apiKeyPermissionsSchema.error` (L26-L26) - Method
  - `src.modules.api-keys.schemas.apiKeyExpiresAtSchema` (L35-L40) - Class
  - `src.modules.api-keys.schemas.error` (L36-L36) - Method
  - `src.modules.api-keys.schemas.apiKeyExpiresAtSchema.refine() callback` (L38-L38) - Function
  - `src.modules.api-keys.schemas.apiKeyExpiresAtSchema.error` (L39-L39) - Method
- `src/modules/cart/composables/use-line-quantity.ts`
  - `src.modules.cart.composables.use-line-quantity.useLineQuantity.senderFor.send` (L89-L113) - Class
  - `src.modules.cart.composables.use-line-quantity.useLineQuantity.senderFor.send.debounce() callback` (L89-L113) - Function
  - `src.modules.cart.composables.use-line-quantity.settle` (L198-L204) - Class
  - `src.modules.cart.composables.use-line-quantity.useLineQuantity.settle.then() callback` (L200-L203) - Function
  - `src.modules.cart.composables.use-line-quantity.useLineQuantity.settle.then() callback.results.some() callback` (L201-L201) - Function
- `src/modules/delivery/domain/ship-lines.ts`
  - `src.modules.delivery.domain.ship-lines.ShipLineInput` (L12-L17) - Interface
  - `src.modules.delivery.domain.ship-lines.shipmentCount.physical` (L78-L78) - Class
  - `src.modules.delivery.domain.ship-lines.shipmentCount.physical.fulfillmentOrders.filter() callback` (L78-L78) - Function
  - `src.modules.delivery.domain.ship-lines.shipmentCount.physical.filter() callback` (L82-L82) - Function
- `src/modules/delivery/store.ts`
  - `src.modules.delivery.store.defineStore('delivery') callback.markLost` (L330-L335) - Class
- `src/modules/locales/composables/use-dictionary-aggregation.ts`
  - `src.modules.locales.composables.use-dictionary-aggregation.appKind` (L40-L42) - Class
  - `src.modules.locales.composables.use-dictionary-aggregation.useDictionaryAggregation.appKind.computed() callback` (L41-L41) - Function
  - `src.modules.locales.composables.use-dictionary-aggregation.useDictionaryAggregation.appKind.computed() callback.apps.value.find() callback` (L41-L41) - Function
  - `src.modules.locales.composables.use-dictionary-aggregation.useDictionaryAggregation.appOptions.computed() callback` (L64-L65) - Function
  - `src.modules.locales.composables.use-dictionary-aggregation.appOptions` (L64-L66) - Class
  - `src.modules.locales.composables.use-dictionary-aggregation.useDictionaryAggregation.appOptions.computed() callback.apps.value.map() callback` (L65-L65) - Function
- `src/modules/locales/schemas.ts`
  - `src.modules.locales.schemas.nativeName.error` (L55-L55) - Method
  - `src.modules.locales.schemas.localesEntrySchema.app.error` (L84-L84) - Method
- `src/modules/locales/store.ts`
  - `src.modules.locales.store.defineStore('locales') callback.fetchLanguages` (L254-L262) - Class
  - `src.modules.locales.store.defineStore('locales') callback.createLanguage` (L279-L280) - Class
  - `src.modules.locales.store.defineStore('locales') callback.editLanguage` (L292-L293) - Class
  - `src.modules.locales.store.defineStore('locales') callback.removeLanguage` (L321-L326) - Class
  - `src.modules.locales.store.defineStore('locales') callback.addEntry` (L339-L348) - Class
  - `src.modules.locales.store.defineStore('locales') callback.editEntry` (L359-L365) - Class
  - `src.modules.locales.store.defineStore('locales') callback.removeEntry` (L375-L376) - Class
  - `src.modules.locales.store.defineStore('locales') callback.importEntries` (L391-L411) - Class
  - `src.modules.locales.store.defineStore('locales') callback.fetchAllEntries` (L425-L435) - Class
  - `src.modules.locales.store.defineStore('locales') callback.fetchEntityTranslations` (L449-L453) - Class
  - `src.modules.locales.store.defineStore('locales') callback.saveEntityTranslations` (L465-L475) - Class
- `src/modules/orders/composables/use-order-documents.ts`
  - `src.modules.orders.composables.use-order-documents.viewInvoice` (L89-L95) - Class
- `src/modules/orders/domain/timeline.ts`
  - `src.modules.orders.domain.timeline.describeTimelineEntry.parts` (L296-L298) - Class
  - `src.modules.orders.domain.timeline.describeTimelineEntry.parts.filter() callback` (L297-L297) - Function
- `src/modules/orders/schemas.ts`
  - `src.modules.orders.schemas.ordersSchema.email.error` (L28-L28) - Method
- `src/modules/payments/composables/use-order-refund.ts`
  - `src.modules.payments.composables.use-order-refund.useOrderRefund.settle.then() callback` (L132-L132) - Function
- `src/modules/payments/schemas.ts`
  - `src.modules.payments.schemas.cancelRefundNoteSchema` (L20-L27) - Class
  - `src.modules.payments.schemas.cancelRefundNoteSchema.error` (L25-L26) - Method
- `src/modules/tasks/composables/use-task-badge.ts`
  - `src.modules.tasks.composables.use-task-badge.useTaskNoticeCount` (L28-L34) - Class
  - `src.modules.tasks.composables.use-task-badge.useTaskNoticeCount.computed() callback` (L32-L32) - Function
  - `src.modules.tasks.composables.use-task-badge.useTaskNoticeCount.computed() callback.notices.value.filter() callback` (L32-L32) - Function
  - `src.modules.tasks.composables.use-task-badge.useTaskBadge` (L41-L74) - Class
  - `src.modules.tasks.composables.use-task-badge.useTaskBadge.watch() callback` (L67-L69) - Function
  - `src.modules.tasks.composables.use-task-badge.useTaskBadge.computed() callback` (L71-L72) - Function
- `src/modules/tasks/schemas.ts`
  - `src.modules.tasks.schemas.cappedText` (L23-L24) - Class
  - `src.modules.tasks.schemas.cappedText.error` (L24-L24) - Method

### Admin Credential & Webhook Lifecycle Stores
This sub-component owns the Pinia stores that manage the lifecycle of admin credentials and webhook subscriptions. The useApiKeysStore exposes mintCredential (fetches a new API key via the generated client, validates it against the Group 1 schemas, and inserts it into reactive state) and revokeCredential (deletes the key server-side and removes it locally). The useWebhooksStore manages DeliveryFilters and SubscriptionFilters — the reactive filter state that scopes which webhook events the admin sees. The products schemas (productsPriceSchema, productsTitleSchema) provide the validation contracts for product data that these stores reference when cross-referencing credentials with product-scoped permissions. Together, these stores form the state-management layer that sits between the schema contracts below and the SSE-driven refresh above.

**Related Classes/Methods**:

- `src.modules.api-keys.store.useApiKeysStore`:25-141
- `src.modules.webhooks.store.useWebhooksStore`:75-362
- `src.modules.webhooks.store.DeliveryFilters`:56-59
- `src.modules.products.schemas.productsPriceSchema`:41-49

**Source Files:**

- `contracts/asyncapi.generated.ts`
  - `contracts.asyncapi.generated.OrderCanceledEnvelope` (L45-L49) - Interface
  - `contracts.asyncapi.generated.ShipmentShippedEnvelope` (L62-L66) - Interface
  - `contracts.asyncapi.generated.AnonymousSchema34` (L97-L100) - Interface
  - `contracts.asyncapi.generated.PaymentRefundReversedEnvelope` (L146-L150) - Interface
  - `contracts.asyncapi.generated.NotificationStaffTaskDueSoonPayload` (L298-L306) - Interface
  - `contracts.asyncapi.generated.NotificationFulfillmentHeldPayload` (L358-L366) - Interface
  - `contracts.asyncapi.generated.FulfillmentDelayedParamsPayload` (L425-L431) - Interface
  - `contracts.asyncapi.generated.NotificationStaffLowStockPayload` (L557-L565) - Interface
- `src/modules/api-keys/store.ts`
  - `src.modules.api-keys.store.useApiKeysStore` (L25-L141) - Class
  - `src.modules.api-keys.store.useApiKeysStore.defineStore('api-keys') callback` (L25-L141) - Function
  - `src.modules.api-keys.store.useApiKeysStore.defineStore('api-keys') callback.mintCredential.fetchAny() callback` (L82-L96) - Function
  - `src.modules.api-keys.store.useApiKeysStore.defineStore('api-keys') callback.mintCredential.fetchAny() callback.then() callback` (L83-L96) - Function
  - `src.modules.api-keys.store.useApiKeysStore.defineStore('api-keys') callback.revokeCredential.fetchAny() callback` (L112-L112) - Function
  - `src.modules.api-keys.store.useApiKeysStore.defineStore('api-keys') callback.revokeCredential.then() callback` (L112-L122) - Function
- `src/modules/delivery/domain/ship-lines.ts`
  - `src.modules.delivery.domain.ship-lines.shipmentCount` (L74-L84) - Class
  - `src.modules.delivery.domain.ship-lines.shipmentCount.shipments.filter() callback` (L81-L81) - Function
- `src/modules/example/composables/use-example-transition.ts`
  - `src.modules.example.composables.use-example-transition.changeStatus` (L38-L51) - Class
- `src/modules/orders/composables/use-order-documents.ts`
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments` (L20-L186) - Class
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.invoiceAvailable.computed() callback` (L34-L34) - Function
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.withInvoice` (L60-L73) - Class
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.withInvoice.then() callback` (L66-L68) - Function
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.withInvoice.catch() callback` (L69-L69) - Function
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.withInvoice.finally() callback` (L70-L72) - Function
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.viewInvoice.withInvoice() callback` (L90-L95) - Function
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.viewInvoice.withInvoice() callback.tab.addEventListener('load') callback` (L93-L93) - Function
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.watch() callback` (L143-L148) - Function
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.downloadCreditNote.then() callback` (L166-L168) - Function
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.downloadCreditNote.catch() callback` (L169-L169) - Function
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.downloadCreditNote.finally() callback` (L170-L172) - Function
- `src/modules/orders/composables/use-order-hero.ts`
  - `src.modules.orders.composables.use-order-hero.useOrderHero.heroDescription.computed() callback` (L38-L39) - Function
  - `src.modules.orders.composables.use-order-hero.useOrderHero.orderStatus.computed() callback` (L45-L48) - Function
- `src/modules/orders/schemas.ts`
  - `src.modules.orders.schemas.addressText` (L41-L45) - Class
  - `src.modules.orders.schemas.addressText.error` (L45-L45) - Method
  - `src.modules.orders.schemas.requiredAddressText` (L53-L54) - Class
  - `src.modules.orders.schemas.requiredAddressText.error` (L54-L54) - Method
- `src/modules/payments/composables/use-paged-table.ts`
  - `src.modules.payments.composables.use-paged-table.PagedTable` (L21-L28) - Interface
- `src/modules/payments/composables/use-row-select.ts`
  - `src.modules.payments.composables.use-row-select.useRowSelect.watch() callback.picked` (L27-L27) - Class
  - `src.modules.payments.composables.use-row-select.useRowSelect.watch() callback.picked.rows.value.find() callback` (L27-L27) - Function
- `src/modules/products/composables/use-release-date-confirm.ts`
  - `src.modules.products.composables.use-release-date-confirm.useReleaseDateConfirm.confirmReleaseDateMove.catch() callback` (L86-L86) - Function
- `src/modules/products/schemas.ts`
  - `src.modules.products.schemas.productsTitleSchema` (L30-L35) - Class
  - `src.modules.products.schemas.productsTitleSchema.error` (L34-L34) - Method
  - `src.modules.products.schemas.productsPriceSchema` (L41-L49) - Class
  - `src.modules.products.schemas.productsPriceSchema.transform() callback` (L44-L44) - Function
  - `src.modules.products.schemas.productsPriceSchema.error` (L47-L47) - Method
  - `src.modules.products.schemas.productTranslationFieldsSchema.description.error` (L63-L63) - Method
- `src/modules/products/store.ts`
  - `src.modules.products.store.defineStore('products') callback.loadingProductForEdit` (L415-L415) - Class
- `src/modules/returns/schemas.ts`
  - `src.modules.returns.schemas.cancelNoteSchema` (L64-L72) - Class
  - `src.modules.returns.schemas.cancelNoteSchema.error` (L68-L71) - Method
- `src/modules/returns/store.ts`
  - `src.modules.returns.store.defineStore('returns') callback.close` (L225-L226) - Class
- `src/modules/shop-tasks/notices.ts`
  - `src.modules.shop-tasks.notices.summaryNotice` (L58-L62) - Class
  - `src.modules.shop-tasks.notices.summaryNotice.describe` (L59-L60) - Method
  - `src.modules.shop-tasks.notices.summaryNotice.target` (L61-L61) - Method
  - `src.modules.shop-tasks.notices.shopNotices.'shop-tasks.staff.purchase-hold-placed'.describe` (L99-L102) - Method
- `src/modules/stock-alerts/store.ts`
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback.replaceItems` (L59-L65) - Class
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback.replaceItems.fetchAny() callback` (L60-L64) - Function
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback.replaceItems.fetchAny() callback.then() callback` (L61-L64) - Function
  - `src.modules.stock-alerts.store.defineStore('stock-alerts') callback.fetchStockAlerts` (L72-L72) - Class
  - `src.modules.stock-alerts.store.defineStore('stock-alerts') callback.ensureStockAlerts` (L82-L89) - Class
  - `src.modules.stock-alerts.store.defineStore('stock-alerts') callback.ask` (L98-L98) - Class
  - `src.modules.stock-alerts.store.defineStore('stock-alerts') callback.cancel` (L106-L106) - Class
- `src/modules/users/composables/use-user-summary.ts`
  - `src.modules.users.composables.use-user-summary.useUserSummary.heroTitle.computed() callback` (L31-L31) - Function
- `src/modules/webhooks/schemas.ts`
  - `src.modules.webhooks.schemas.webhookCreateSchema.description.error` (L51-L51) - Method
- `src/modules/webhooks/store.ts`
  - `src.modules.webhooks.store.SubscriptionFilters` (L48-L53) - Interface
  - `src.modules.webhooks.store.DeliveryFilters` (L56-L59) - Interface
  - `src.modules.webhooks.store.useWebhooksStore` (L75-L362) - Class
  - `src.modules.webhooks.store.useWebhooksStore.defineStore('webhooks') callback` (L75-L362) - Function
  - `src.modules.webhooks.store.useWebhooksStore.defineStore('webhooks') callback.createSubscription.fetchAnySubscriptions() callback` (L153-L158) - Function
  - `src.modules.webhooks.store.useWebhooksStore.defineStore('webhooks') callback.createSubscription.fetchAnySubscriptions() callback.then() callback` (L154-L158) - Function
  - `src.modules.webhooks.store.useWebhooksStore.defineStore('webhooks') callback.removeSecret.fetchAnySubscriptions() callback` (L206-L210) - Function
  - `src.modules.webhooks.store.useWebhooksStore.defineStore('webhooks') callback.removeSecret.fetchAnySubscriptions() callback.then() callback` (L207-L210) - Function
  - `src.modules.webhooks.store.useWebhooksStore.defineStore('webhooks') callback.replayDelivery.updateTargetDelivery() callback` (L290-L290) - Function

### SSE Transport & Realtime Observability Dashboard
This is the core realtime pipeline of the subsystem. createSseClient is a reusable, callback-based transport factory that opens an EventSource, wires up open/error/named-event listeners, handles reconnection with backoff, and dispatches typed events to the SseClientCallbacks interface. The observability module consumes this transport through three composables: use-realtime-observability (the connect action that subscribes to the SSE stream and projects RealtimeMetricsEntry objects into reactive KPI state), use-admin-observability (renders AdminKpiCard and AdminAuditFilters for the admin dashboard), and use-audit-trail (streams audit-trail entries into a scrollable log). The useDemoStore is co-located here because it drives the same SSE refresh pattern for the demo mode. The types file defines the event payload contracts that the SSE client deserializes and the composables render. This sub-component is the top of the flow: it receives raw SSE bytes, deserializes them into typed entries, and projects them into the reactive state that the admin UI reads.

**Related Classes/Methods**:

- `src.infrastructure.create-sse-client.createSseClient`:122-203
- `src.infrastructure.create-sse-client.SseClientCallbacks`:27-41
- `src.modules.observability.types.RealtimeMetricsEntry`:58-75

**Source Files:**

- `contracts/asyncapi.generated.ts`
  - `contracts.asyncapi.generated.UserErasedEnvelope` (L230-L234) - Interface
  - `contracts.asyncapi.generated.OutboxDeadParamsPayload` (L337-L340) - Interface
  - `contracts.asyncapi.generated.NotificationStaffPurchaseHoldPlacedPayload` (L342-L350) - Interface
  - `contracts.asyncapi.generated.ReturnRequestedParamsPayload` (L488-L491) - Interface
  - `contracts.asyncapi.generated.NotificationStaffTransfersDuePayload` (L493-L501) - Interface
- `src/infrastructure/browser-storage.ts`
  - `src.infrastructure.browser-storage.BrowserStorageItem` (L40-L67) - Interface
  - `src.infrastructure.browser-storage.browserStorageFor` (L100-L104) - Class
  - `src.infrastructure.browser-storage.browserStorageFor.BROWSER_STORAGE_ITEMS.filter() callback` (L104-L104) - Function
- `src/infrastructure/create-sse-client.ts`
  - `src.infrastructure.create-sse-client.SseClientCallbacks` (L27-L41) - Interface
  - `src.infrastructure.create-sse-client.SseClient` (L46-L48) - Interface
  - `src.infrastructure.create-sse-client.createSseClient` (L122-L203) - Class
  - `src.infrastructure.create-sse-client.createSseClient.close` (L197-L201) - Method
- `src/kernel/use-badge-refresh.ts`
  - `src.kernel.use-badge-refresh.watch() callback` (L83-L86) - Function
- `src/modules/account/schemas.ts`
  - `src.modules.account.schemas.signupPasswordConfirmSchema` (L76-L78) - Class
  - `src.modules.account.schemas.signupPasswordConfirmSchema.error` (L77-L77) - Method
- `src/modules/delivery/domain/ship-lines.ts`
  - `src.modules.delivery.domain.ship-lines.shippableLines` (L35-L36) - Class
  - `src.modules.delivery.domain.ship-lines.shippableLines.lines.filter() callback` (L36-L36) - Function
  - `src.modules.delivery.domain.ship-lines.readShipLines.rows` (L49-L56) - Class
  - `src.modules.delivery.domain.ship-lines.readShipLines.rows.map() callback` (L49-L56) - Function
  - `src.modules.delivery.domain.ship-lines.readShipLines.lines.picked.map() callback` (L60-L60) - Function
- `src/modules/delivery/store.ts`
  - `src.modules.delivery.store.defineStore('delivery') callback.fetchPreorderSummaries` (L141-L157) - Class
  - `src.modules.delivery.store.defineStore('delivery') callback.fetchFulfillmentForOrder` (L196-L196) - Class
  - `src.modules.delivery.store.defineStore('delivery') callback.release` (L301-L306) - Class
- `src/modules/example/provided.ts`
  - `src.modules.example.provided.ProvidedExample` (L19-L24) - Interface
- `src/modules/example/schemas.ts`
  - `src.modules.example.schemas.exampleBodySchema` (L24-L27) - Class
  - `src.modules.example.schemas.error` (L26-L26) - Method
  - `src.modules.example.schemas.exampleBodySchema.error` (L27-L27) - Method
- `src/modules/observability/composables/use-admin-observability.ts`
  - `src.modules.observability.composables.use-admin-observability.useAdminObservability.fetchHealth.then() callback` (L107-L107) - Function
  - `src.modules.observability.composables.use-admin-observability.useAdminObservability.fetchMetrics.then() callback` (L112-L112) - Function
  - `src.modules.observability.composables.use-admin-observability.useAdminObservability.fetchAll.then() callback` (L119-L119) - Function
- `src/modules/observability/composables/use-audit-trail.ts`
  - `src.modules.observability.composables.use-audit-trail.UseAuditTrailReturn` (L27-L40) - Interface
  - `src.modules.observability.composables.use-audit-trail.entries` (L87-L87) - Class
  - `src.modules.observability.composables.use-audit-trail.useAuditTrail.entries.computed() callback` (L87-L87) - Function
  - `src.modules.observability.composables.use-audit-trail.total` (L92-L92) - Class
  - `src.modules.observability.composables.use-audit-trail.useAuditTrail.total.computed() callback` (L92-L92) - Function
  - `src.modules.observability.composables.use-audit-trail.pages` (L97-L97) - Class
  - `src.modules.observability.composables.use-audit-trail.useAuditTrail.pages.computed() callback` (L97-L97) - Function
  - `src.modules.observability.composables.use-audit-trail.fetchPage` (L106-L106) - Class
  - `src.modules.observability.composables.use-audit-trail.useAuditTrail.fetchPage.then() callback` (L106-L106) - Function
- `src/modules/observability/types.ts`
  - `src.modules.observability.types.AdminKpiCard` (L21-L30) - Interface
  - `src.modules.observability.types.AdminAuditFilters` (L35-L52) - Interface
  - `src.modules.observability.types.RealtimeMetricsEntry` (L58-L75) - Interface
- `src/modules/observability/use-realtime-observability.ts`
  - `src.modules.observability.use-realtime-observability.connect` (L71-L114) - Class
  - `src.modules.observability.use-realtime-observability.useRealtimeObservability.connect.onOpen` (L77-L77) - Method
  - `src.modules.observability.use-realtime-observability.useRealtimeObservability.connect.onError` (L78-L81) - Method
  - `src.modules.observability.use-realtime-observability.useRealtimeObservability.connect.onEvent` (L82-L112) - Method
- `src/modules/orders/composables/use-order-documents.ts`
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.loadCreditNotes` (L125-L138) - Class
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.loadCreditNotes.then() callback` (L132-L134) - Function
  - `src.modules.orders.composables.use-order-documents.useOrderDocuments.loadCreditNotes.catch() callback` (L135-L137) - Function
  - `src.modules.orders.composables.use-order-documents.downloadCreditNote` (L160-L173) - Class
- `src/modules/orders/composables/use-order-hero.ts`
  - `src.modules.orders.composables.use-order-hero.useOrderHero.heroTitle.computed() callback` (L32-L32) - Function
- `src/modules/orders/schemas.ts`
  - `src.modules.orders.schemas.shippingAddressCorrectionSchema.country.error` (L69-L69) - Method
- `src/modules/payments/composables/use-order-refund.ts`
  - `src.modules.payments.composables.use-order-refund.useOrderRefund.settleable.computed() callback.filter() callback` (L72-L72) - Function
  - `src.modules.payments.composables.use-order-refund.useOrderRefund.cancelNotice` (L115-L122) - Method
- `src/modules/payments/refund-notice.ts`
  - `src.modules.payments.refund-notice.RefundNotice` (L18-L23) - Interface
- `src/modules/payments/store.ts`
  - `src.modules.payments.store.defineStore('payments') callback.readPayment` (L156-L156) - Class
  - `src.modules.payments.store.defineStore('payments') callback.cancelRefund` (L328-L348) - Class
  - `src.modules.payments.store.defineStore('payments') callback.cancelRefund.fetchAny() callback.then() callback` (L335-L335) - Function
  - `src.modules.payments.store.defineStore('payments') callback.fetchAwaitingPage` (L460-L473) - Class
- `src/modules/returns/schemas.ts`
  - `src.modules.returns.schemas.declineMessageSchema` (L38-L46) - Class
  - `src.modules.returns.schemas.declineMessageSchema.error` (L42-L45) - Method
- `src/modules/shop-tasks/describe.ts`
  - `src.modules.shop-tasks.describe.describeLost` (L171-L188) - Class
  - `src.modules.shop-tasks.describe.describeLost.filter() callback` (L186-L186) - Function
- `src/modules/shop-tasks/notices.ts`
  - `src.modules.shop-tasks.notices.shopNotices.'shop-tasks.staff.return-requested'.target` (L110-L113) - Method
- `src/modules/stock-alerts/store.ts`
  - `src.modules.stock-alerts.store.useStockAlertsStore` (L19-L117) - Class
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback` (L19-L117) - Function
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback.askedProductIds` (L36-L36) - Class
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback.askedProductIds.computed() callback` (L36-L36) - Function
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback.askedProductIds.computed() callback.items.value.map() callback` (L36-L36) - Function
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback.fetchStockAlerts.replaceItems() callback` (L72-L72) - Function
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback.ensureStockAlerts.catch() callback` (L83-L87) - Function
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback.ask.replaceItems() callback` (L98-L98) - Function
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback.cancel.replaceItems() callback` (L106-L106) - Function
  - `src.modules.stock-alerts.store.useStockAlertsStore.defineStore('stock-alerts') callback.useResetOnViewerChange() callback` (L111-L114) - Function
- `src/modules/tasks/schemas.ts`
  - `src.modules.tasks.schemas.contactSchema.message.error` (L40-L40) - Method
- `src/ui/composables/use-row-actions.ts`
  - `src.ui.composables.use-row-actions.useRowActions.runConfirmed.singleFlight() callback` (L106-L109) - Function
