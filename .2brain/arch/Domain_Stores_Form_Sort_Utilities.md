---
tags:
  - 2brain
  - 2brain/arch
  - project/boilerplate-vue-frontend
type: architecture
component: Domain_Stores_Form_Sort_Utilities
---

```mermaid
graph LR
    Request_Shaping_Core_Domain_Stores["Request Shaping & Core Domain Stores"]
    Order_Lifecycle_Store_Translation_Tab_Ordering["Order Lifecycle Store & Translation Tab Ordering"]
    Localized_Entity_Editing_List_Search["Localized Entity Editing & List Search"]
    Request_Shaping_Core_Domain_Stores -- "Cross-module cache invalidation: stock-affecting writes in orders invalidate the products cache" --> Order_Lifecycle_Store_Translation_Tab_Ordering
    Order_Lifecycle_Store_Translation_Tab_Ordering -- "Sort-token validation before REST dispatch" --> Request_Shaping_Core_Domain_Stores
    Localized_Entity_Editing_List_Search -- "Shapes translation payloads and dispatches CRUD mutations into the products store" --> Request_Shaping_Core_Domain_Stores
    Localized_Entity_Editing_List_Search -- "Drives the orders list search and consumes the shared translation-tab ordering" --> Order_Lifecycle_Store_Translation_Tab_Ordering
```

## Details

The domain-state and request-shaping layer that turns user input into contract-conformant request bodies and reads generated response types. It owns the form utilities (filter, omitNulls, shapeObject, toRequestBody, uploadThenClear) and the sort helpers (SingleSort, sortFieldsOf), the orders/products/users Pinia stores (listCreditNotes, idBatches, useUsersStore), and the products translation composables (translation-tab-errors, translations-body, use-active-locales, use-product-lines, use-translated-entity-form) that drive the localized entity editing surface.

### Request Shaping & Core Domain Stores
This is the foundational request-shaping and state-management backbone of the subsystem. It owns the form utility pipeline (filter → omitNulls → shapeObject → toRequestBody → uploadThenClear) that converts raw form model values into the exact JSON body the OpenAPI contract expects, stripping nulls, reshaping nested objects, and handling file-upload-then-clear semantics. The sort helpers (SingleSort, sortFieldsOf) translate user-facing sort selections into the sort query-parameter format the API requires. The two core Pinia stores — useProductsStore (101–404 lines, the largest store in the subsystem) and useUsersStore (65–261 lines) — encapsulate all CRUD and list-fetching state for their respective domains, consuming the generated client and the form/sort utilities above. Supporting composables (use-active-locales, use-product-lines) and the user-access dialog / roles helpers round out the products and users editing surfaces. This group is the entry point for every domain mutation: no store action reaches the network without passing through the form-shaping pipeline.

**Related Classes/Methods**:

- `src.infrastructure.utils.forms.toRequestBody`:169-179
- `src.infrastructure.utils.forms.shapeObject`:108-121
- `src.infrastructure.utils.sort.sortFieldsOf`:100-102
- `src.modules.products.store.useProductsStore`:153-546
- `src.modules.users.store.useUsersStore`:73-368

**Source Files:**

- `src/infrastructure/utils/forms.ts`
  - `src.infrastructure.utils.forms.shapeObject` (L108-L121) - Class
  - `src.infrastructure.utils.forms.filter() callback` (L115-L115) - Function
  - `src.infrastructure.utils.forms.shapeObject.map() callback` (L117-L118) - Function
  - `src.infrastructure.utils.forms.shapeObject.filter() callback` (L120-L120) - Function
  - `src.infrastructure.utils.forms.toRequestBody` (L169-L179) - Class
  - `src.infrastructure.utils.forms.toRequestBody.then() callback` (L175-L178) - Function
  - `src.infrastructure.utils.forms.uploadThenClear` (L204-L221) - Class
  - `src.infrastructure.utils.forms.uploadThenClear.clears` (L212-L214) - Class
  - `src.infrastructure.utils.forms.uploadThenClear.clears.entries.filter() callback` (L213-L213) - Function
  - `src.infrastructure.utils.forms.uploadThenClear.rest` (L215-L217) - Class
  - `src.infrastructure.utils.forms.uploadThenClear.rest.entries.filter() callback` (L216-L216) - Function
  - `src.infrastructure.utils.forms.uploadThenClear.then() callback` (L218-L219) - Function
  - `src.infrastructure.utils.forms.omitNulls` (L232-L238) - Class
  - `src.infrastructure.utils.forms.omitNulls.keys.filter() callback` (L237-L237) - Function
  - `src.infrastructure.utils.forms.omitNulls.map() callback` (L237-L237) - Function
- `src/infrastructure/utils/money.ts`
  - `src.infrastructure.utils.money.normalizeAmount.mark` (L176-L176) - Class
  - `src.infrastructure.utils.money.normalizeAmount.mark.parts.find() callback` (L176-L176) - Function
- `src/infrastructure/utils/sort.ts`
  - `src.infrastructure.utils.sort.SingleSort` (L17-L22) - Interface
  - `src.infrastructure.utils.sort.sortTokensOf.tokens` (L86-L89) - Class
  - `src.infrastructure.utils.sort.sortTokensOf.tokens.map() callback` (L88-L88) - Function
  - `src.infrastructure.utils.sort.sortTokensOf.tokens.filter() callback` (L89-L89) - Function
  - `src.infrastructure.utils.sort.sortTokensOf.valid` (L90-L90) - Class
  - `src.infrastructure.utils.sort.sortTokensOf.valid.tokens.filter() callback` (L90-L90) - Function
  - `src.infrastructure.utils.sort.sortFieldsOf` (L100-L102) - Class
  - `src.infrastructure.utils.sort.sortFieldsOf.map() callback` (L101-L101) - Function
- `src/modules/products/composables/use-product-lines.ts`
  - `src.modules.products.composables.use-product-lines.ProductLines` (L17-L65) - Interface
  - `src.modules.products.composables.use-product-lines.useProductLines` (L85-L114) - Class
  - `src.modules.products.composables.use-product-lines.useProductLines.loadProducts` (L93-L94) - Method
  - `src.modules.products.composables.use-product-lines.useProductLines.titleOf` (L96-L97) - Method
- `src/modules/products/store.ts`
  - `src.modules.products.store.useProductsStore` (L153-L546) - Class
  - `src.modules.products.store.useProductsStore.defineStore('products') callback` (L153-L546) - Function
  - `src.modules.products.store.defineStore('products') callback.hardDeleteProduct` (L377-L378) - Class
  - `src.modules.products.store.useProductsStore.defineStore('products') callback.hardDeleteProduct.deleteTarget() callback` (L378-L378) - Function
  - `src.modules.products.store.defineStore('products') callback.restoreProduct` (L387-L393) - Class
  - `src.modules.products.store.useProductsStore.defineStore('products') callback.restoreProduct.fetchAny() callback` (L388-L392) - Function
  - `src.modules.products.store.useProductsStore.defineStore('products') callback.restoreProduct.fetchAny() callback.then() callback` (L389-L392) - Function
  - `src.modules.products.store.defineStore('products') callback.fetchProductsByIds` (L430-L442) - Class
  - `src.modules.products.store.useProductsStore.defineStore('products') callback.fetchProductsByIds.fetchMultiple() callback` (L432-L439) - Function
  - `src.modules.products.store.useProductsStore.defineStore('products') callback.fetchProductsByIds.fetchMultiple() callback.map() callback` (L434-L437) - Function
  - `src.modules.products.store.useProductsStore.defineStore('products') callback.fetchProductsByIds.fetchMultiple() callback.map() callback.then() callback` (L436-L436) - Function
  - `src.modules.products.store.useProductsStore.defineStore('products') callback.fetchProductsByIds.fetchMultiple() callback.then() callback` (L439-L439) - Function
  - `src.modules.products.store.defineStore('products') callback.fetchFacets` (L504-L510) - Class
  - `src.modules.products.store.useProductsStore.defineStore('products') callback.fetchFacets.fetchAny() callback` (L505-L509) - Function
  - `src.modules.products.store.useProductsStore.defineStore('products') callback.fetchFacets.fetchAny() callback.then() callback` (L506-L509) - Function
- `src/modules/users/composables/use-user-access-dialog.ts`
  - `src.modules.users.composables.use-user-access-dialog.UserAccessDialogTarget` (L17-L29) - Interface
  - `src.modules.users.composables.use-user-access-dialog.UserAccessDialogRequestOptions` (L36-L40) - Interface
  - `src.modules.users.composables.use-user-access-dialog.UserAccessDialogResult` (L47-L51) - Interface
  - `src.modules.users.composables.use-user-access-dialog.useUserAccessDialog` (L59-L119) - Class
  - `src.modules.users.composables.use-user-access-dialog.useUserAccessDialog.confirm` (L116-L116) - Method
  - `src.modules.users.composables.use-user-access-dialog.useUserAccessDialog.cancel` (L117-L117) - Method
- `src/modules/users/store.ts`
  - `src.modules.users.store.useUsersStore` (L73-L368) - Class
  - `src.modules.users.store.useUsersStore.defineStore('users') callback` (L73-L368) - Function
  - `src.modules.users.store.defineStore('users') callback.hardDeleteUser` (L200-L201) - Class
  - `src.modules.users.store.useUsersStore.defineStore('users') callback.hardDeleteUser.deleteTarget() callback` (L201-L201) - Function
  - `src.modules.users.store.defineStore('users') callback.restoreUser` (L210-L216) - Class
  - `src.modules.users.store.useUsersStore.defineStore('users') callback.restoreUser.fetchAny() callback` (L211-L215) - Function
  - `src.modules.users.store.useUsersStore.defineStore('users') callback.restoreUser.fetchAny() callback.then() callback` (L212-L215) - Function
- `src/ui/composables/use-server-sort.ts`
  - `src.ui.composables.use-server-sort.useServerSort.sortBy.get` (L58-L58) - Method
  - `src.ui.composables.use-server-sort.useServerSort.sortBy.set` (L59-L59) - Method

### Order Lifecycle Store & Translation Tab Ordering
This sub-component owns the orders domain store and its full lifecycle operation set: cancelOrder, restoreOrder, hardDeleteOrder, overrideStatus, fetchCreditNote, fetchInvoice, and listCreditNotes. Unlike the products/users stores (which are CRUD-centric), the orders store models a state-machine workflow — orders transition through statuses, can be soft-deleted and restored, and have associated financial artifacts (credit notes, invoices) fetched on demand. The listCreditNotes function is a standalone exported helper that batches credit-note retrieval. The second half of this group is the translation tab ordering composable (useTranslationTabOrder), which computes the display order of locale tabs in the translation editing UI by filtering and sorting the tags array — a shared UI concern that the orders store's detail view and the products translation surface both consume. This group is architecturally distinct because it introduces asynchronous lifecycle operations (cancel → confirm → status change) and financial sub-resource fetching that have no parallel in the products/users stores.

**Related Classes/Methods**:

- `src.modules.orders.store.useOrdersStore`:171-399
- `src.modules.orders.store.listCreditNotes`:158-159

**Source Files:**

- `src/modules/orders/store.ts`
  - `src.modules.orders.store.listCreditNotes` (L158-L159) - Class
  - `src.modules.orders.store.listCreditNotes.then() callback` (L159-L159) - Function
  - `src.modules.orders.store.useOrdersStore` (L171-L399) - Class
  - `src.modules.orders.store.useOrdersStore.defineStore('orders') callback` (L171-L399) - Function
  - `src.modules.orders.store.defineStore('orders') callback.hardDeleteOrder` (L268-L269) - Class
  - `src.modules.orders.store.useOrdersStore.defineStore('orders') callback.hardDeleteOrder.deleteTarget() callback` (L269-L269) - Function
  - `src.modules.orders.store.defineStore('orders') callback.restoreOrder` (L278-L279) - Class
  - `src.modules.orders.store.useOrdersStore.defineStore('orders') callback.restoreOrder.updateTarget() callback` (L279-L279) - Function
  - `src.modules.orders.store.defineStore('orders') callback.cancelOrder` (L296-L304) - Class
  - `src.modules.orders.store.useOrdersStore.defineStore('orders') callback.cancelOrder.updateTarget() callback` (L298-L301) - Function
  - `src.modules.orders.store.useOrdersStore.defineStore('orders') callback.cancelOrder.updateTarget() callback.then() callback` (L300-L300) - Function
  - `src.modules.orders.store.defineStore('orders') callback.overrideStatus` (L318-L319) - Class
  - `src.modules.orders.store.useOrdersStore.defineStore('orders') callback.overrideStatus.updateTarget() callback` (L319-L319) - Function
  - `src.modules.orders.store.defineStore('orders') callback.fetchInvoice` (L352-L352) - Class
  - `src.modules.orders.store.useOrdersStore.defineStore('orders') callback.fetchInvoice.fetchAny() callback` (L352-L352) - Function
  - `src.modules.orders.store.defineStore('orders') callback.fetchCreditNote` (L362-L363) - Class
  - `src.modules.orders.store.useOrdersStore.defineStore('orders') callback.fetchCreditNote.fetchAny() callback` (L363-L363) - Function
- `src/ui/composables/use-translation-tab-order.ts`
  - `src.ui.composables.use-translation-tab-order.computed() callback.tags.filter() callback` (L30-L30) - Function
  - `src.ui.composables.use-translation-tab-order.useTranslationTabOrder.computed() callback.tags` (L30-L30) - Class
  - `src.ui.composables.use-translation-tab-order.useTranslationTabOrder.computed() callback.tags.filter() callback` (L32-L32) - Function

### Localized Entity Editing & List Search
This sub-component is the localized entity editing surface — the composables and helpers that drive multi-locale content editing for products (and by extension any translatable entity). useTranslatedEntityForm is the central composable: it manages the TranslatedForm reactive state, handles handleSubmitFailure (mapping API errors back to per-locale form fields), tracks openTags (which locale tabs are expanded), and exposes TranslatedEntityFormOptions for configuration. translations-body provides toCreateTranslations and toPatchTranslations — the request-body shapers that convert the form's per-locale field map into the nested translations object the OpenAPI contract expects. translation-tab-errors defines the TranslationIssue type and the error-mapping logic that surfaces per-locale validation failures. idBatches in the products store manages batch ID tracking for bulk translation operations. The useListSearch composable (with ListSearchOptions and ListSearchHandlers) provides the shared list-filtering/search state that the products list view and other list views consume, bridging user search input to the query parameters the generated client expects. This group is the presentation-logic layer for the most complex editing surface in the application.

**Related Classes/Methods**:

- `src.modules.products.composables.use-translated-entity-form.useTranslatedEntityForm`:86-232
- `src.ui.composables.use-list-search.useListSearch`:43-58
- `src.modules.products.store.idBatches`:142-145

**Source Files:**

- `src/modules/products/composables/use-translated-entity-form.ts`
  - `src.modules.products.composables.use-translated-entity-form.TranslatedForm` (L26-L31) - Interface
  - `src.modules.products.composables.use-translated-entity-form.TranslatedEntityFormOptions` (L36-L72) - Interface
  - `src.modules.products.composables.use-translated-entity-form.useTranslatedEntityForm` (L86-L232) - Class
  - `src.modules.products.composables.use-translated-entity-form.useTranslatedEntityForm.validation` (L103-L107) - Class
  - `src.modules.products.composables.use-translated-entity-form.useTranslatedEntityForm.validation.onInvalid` (L106-L106) - Method
  - `src.modules.products.composables.use-translated-entity-form.openTags` (L117-L117) - Class
  - `src.modules.products.composables.use-translated-entity-form.useTranslatedEntityForm.openTags.useTranslationTabOrder() callback` (L117-L117) - Function
  - `src.modules.products.composables.use-translated-entity-form.watch() callback` (L127-L129) - Function
  - `src.modules.products.composables.use-translated-entity-form.useTranslatedEntityForm.watch() callback` (L196-L205) - Function
  - `src.modules.products.composables.use-translated-entity-form.handleSubmitFailure` (L215-L221) - Class
  - `src.modules.products.composables.use-translated-entity-form.useTranslatedEntityForm.handleSubmitFailure.onUnmapped` (L220-L220) - Method
- `src/modules/products/store.ts`
  - `src.modules.products.store.idBatches` (L142-L145) - Class
  - `src.modules.products.store.idBatches.Array.from() callback` (L143-L144) - Function
- `src/ui/composables/use-list-search.ts`
  - `src.ui.composables.use-list-search.ListSearchOptions` (L11-L25) - Interface
  - `src.ui.composables.use-list-search.ListSearchHandlers` (L30-L35) - Interface
  - `src.ui.composables.use-list-search.useListSearch` (L43-L58) - Class
  - `src.ui.composables.use-list-search.useListSearch.handleSearch` (L46-L50) - Method
  - `src.ui.composables.use-list-search.useListSearch.handleReset` (L51-L57) - Method
- `src/ui/composables/use-translation-tab-order.ts`
  - `src.ui.composables.use-translation-tab-order.useTranslationTabOrder` (L23-L34) - Class
  - `src.ui.composables.use-translation-tab-order.useTranslationTabOrder.computed() callback` (L27-L34) - Function
