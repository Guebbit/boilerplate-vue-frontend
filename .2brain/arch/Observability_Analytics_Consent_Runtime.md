---
tags:
  - 2brain
  - 2brain/arch
  - project/boilerplate-vue-frontend
type: architecture
component: Observability_Analytics_Consent_Runtime
---

```mermaid
graph LR
    Observability_Analytics_Consent_Runtime_Core["Observability & Analytics-Consent Runtime Core"]
    Account_Auth_List_State_Composables["Account Auth & List-State Composables"]
    Order_Filter_Interaction_Composables["Order & Filter Interaction Composables"]
    Observability_Analytics_Consent_Runtime_Core -- "Reads session/auth state to gate tracker startup and defer consent prompt" --> Account_Auth_List_State_Composables
    Account_Auth_List_State_Composables -- "Provides URL-driven list state and sort contract consumed by order filter composables" --> Order_Filter_Interaction_Composables
    Order_Filter_Interaction_Composables -- "Reports domain-action errors to the unified telemetry capture pipeline" --> Observability_Analytics_Consent_Runtime_Core
    Order_Filter_Interaction_Composables -- "Shares the useServerSort composable for wire-format sort binding on list views" --> Account_Auth_List_State_Composables
```

## Details

The secondary runtime concern that consumes the generated contract surface for telemetry and consent. It owns the Faro/Umami configuration readers (FaroConfig, UmamiConfig, readFaroConfig, readUmamiConfig, readUmamiRequireConsent, origin→regex helpers), the observability Pinia store (ApiRejectEnvelope, UmamiTracker), and the analytics-consent store (useAnalyticsConsentStore with its promptOpen callback). It also carries the account auth/profile stores and the orders/products/users stores plus the use-order-actions-refetch / reorder / use-any-filter-choice composables that wire domain actions to the generated API types.

### Observability & Analytics-Consent Runtime Core
The heart of the subsystem. Owns the Faro/Umami configuration readers and origin-to-regex helpers, the observability Pinia store that wraps both telemetry SDKs (Faro tracing/errors + Umami pageviews) with sensitive-URL redaction and the setUmamiConsent gate, and the analytics-consent store that manages the visitor's consent choice, cookie persistence, and the promptOpen banner callback. Per the cluster membership it also carries the account auth/profile stores that feed the consent/tracker lifecycle. This is the primary flow node: config → store init → consent decision → tracker on/off.

**Related Classes/Methods**:

- `src.infrastructure.observability.config.readFaroConfig`:129-161
- `src.infrastructure.observability.config.readUmamiConfig`:69-82
- `src.infrastructure.observability.store.useObservabilityStore`:217-502
- `src.infrastructure.analytics-consent.useAnalyticsConsentStore`:84-213

**Source Files:**

- `src/infrastructure/analytics-consent.ts`
  - `src.infrastructure.analytics-consent.useAnalyticsConsentStore` (L84-L213) - Class
- `src/infrastructure/observability/config.ts`
  - `src.infrastructure.observability.config.FaroConfig` (L14-L36) - Interface
  - `src.infrastructure.observability.config.UmamiConfig` (L41-L50) - Interface
  - `src.infrastructure.observability.config.originToRegExp` (L58-L61) - Function
  - `src.infrastructure.observability.config.readUmamiConfig` (L69-L82) - Function
  - `src.infrastructure.observability.config.readUmamiRequireConsent` (L91-L95) - Function
  - `src.infrastructure.observability.config.umamiOriginPattern` (L107-L111) - Function
  - `src.infrastructure.observability.config.readFaroConfig` (L129-L161) - Function
- `src/infrastructure/observability/store.ts`
  - `src.infrastructure.observability.store.ApiRejectEnvelope` (L161-L168) - Interface
  - `src.infrastructure.observability.store.describeApiRejectError` (L191-L194) - Class
  - `src.infrastructure.observability.store.describeApiRejectError.filter() callback` (L193-L193) - Function
  - `src.infrastructure.observability.store.useObservabilityStore` (L217-L502) - Class
  - `src.infrastructure.observability.store.useObservabilityStore.defineStore('observability') callback` (L217-L502) - Function
  - `src.infrastructure.observability.store.defineStore('observability') callback.initFaro` (L268-L348) - Class
  - `src.infrastructure.observability.store.useObservabilityStore.defineStore('observability') callback.initFaro.then() callback` (L280-L332) - Function
  - `src.infrastructure.observability.store.useObservabilityStore.defineStore('observability') callback.initFaro.catch() callback` (L333-L345) - Function
  - `src.infrastructure.observability.store.normalizeContext` (L510-L512) - Function
  - `src.infrastructure.observability.store.normalizeContext.mapValues() callback` (L511-L511) - Function

### Account Auth & List-State Composables
Bridges the account domain to the generated API and to list-view state. Owns the account auth store (useAuthStore) whose login/logout/confirmPasswordReset actions call the generated fetchAny client, plus the useListUrlState and useServerSort composables that keep filter/sort choices in sync with the URL and the server-side sort contract. This group represents the user action → generated API call → list state flow for the account/list surface.

**Related Classes/Methods**: _None_

**Source Files:**

- `src/ui/composables/use-list-url-state.ts`
  - `src.ui.composables.use-list-url-state.ListUrlStateOptions` (L25-L39) - Interface
  - `src.ui.composables.use-list-url-state.ListUrlState` (L44-L50) - Interface
  - `src.ui.composables.use-list-url-state.useListUrlState.sync.foreign` (L153-L155) - Class
  - `src.ui.composables.use-list-url-state.useListUrlState.sync.foreign.filter() callback` (L154-L154) - Function
- `src/ui/composables/use-row-actions.ts`
  - `src.ui.composables.use-row-actions.run` (L90-L97) - Class
  - `src.ui.composables.use-row-actions.run.then() callback` (L93-L93) - Function
- `src/ui/composables/use-server-sort.ts`
  - `src.ui.composables.use-server-sort.useServerSort.choice.get` (L63-L63) - Method
  - `src.ui.composables.use-server-sort.useServerSort.choice.set` (L64-L64) - Method

### Order & Filter Interaction Composables
The domain-action layer that wires order and product interactions to the generated API types. Owns useOrderActionsRefetch (refetching order state after an action), the reorder domain logic (ReorderedOrderLine, leftOutByReorder), and the shared filter/UX composables useAnyFilterChoice, useDeletedFilterOptions, useReturnFocus, useServerSort, and useTouchFriendlySize. This group represents the order/filter interaction → generated API → refetch flow.

**Related Classes/Methods**:

- `src.ui.composables.use-any-filter-choice.useAnyFilterChoice`:23-30
- `src.ui.composables.use-deleted-filter-options.useDeletedFilterOptions`:26-33

**Source Files:**

- `src/modules/orders/domain/reorder.ts`
  - `src.modules.orders.domain.reorder.ReorderedOrderLine` (L13-L16) - Interface
- `src/ui/composables/use-any-filter-choice.ts`
  - `src.ui.composables.use-any-filter-choice.useAnyFilterChoice` (L23-L30) - Class
  - `src.ui.composables.use-any-filter-choice.useAnyFilterChoice.get` (L28-L28) - Method
  - `src.ui.composables.use-any-filter-choice.useAnyFilterChoice.set` (L29-L29) - Method
- `src/ui/composables/use-deleted-filter-options.ts`
  - `src.ui.composables.use-deleted-filter-options.DeletedFilterOption` (L14-L19) - Interface
  - `src.ui.composables.use-deleted-filter-options.useDeletedFilterOptions` (L26-L33) - Class
  - `src.ui.composables.use-deleted-filter-options.useDeletedFilterOptions.computed() callback` (L28-L32) - Function
- `src/ui/composables/use-list-url-state.ts`
  - `src.ui.composables.use-list-url-state.useListUrlState.hydrate.present` (L119-L119) - Class
- `src/ui/composables/use-return-focus.ts`
  - `src.ui.composables.use-return-focus.useReturnFocus` (L17-L62) - Class
  - `src.ui.composables.use-return-focus.useReturnFocus.watch() callback` (L42-L52) - Function
  - `src.ui.composables.use-return-focus.useReturnFocus.watch() callback.nextTick() callback` (L51-L51) - Function
- `src/ui/composables/use-server-sort.ts`
  - `src.ui.composables.use-server-sort.ServerSortOptions` (L15-L20) - Interface
  - `src.ui.composables.use-server-sort.ServerSort` (L25-L30) - Interface
- `src/ui/composables/use-touch-friendly-size.ts`
  - `src.ui.composables.use-touch-friendly-size.useTouchFriendlySize` (L38-L41) - Class
  - `src.ui.composables.use-touch-friendly-size.useTouchFriendlySize.computed() callback` (L40-L40) - Function
