/**
 * @module
 * Pinia store for machine-to-machine credentials — one `useStructureCrudApi` instance (search
 * only: there is no `GET`/`PATCH` for a single credential, and no filters, since
 * `ListApiKeysParams` takes only `page`/`pageSize`), plus the two hand-written actions that do
 * not fit the generic shape.
 *
 * `mintCredential` is hand-written rather than the generic `createOne`: the response carries a
 * plaintext secret meant to be shown exactly once, and the generic path (`createTarget`) caches
 * whatever the API call resolves to verbatim — caching the raw response would park that plaintext
 * in this store's state forever, readable by anything with `getRecord(id)`. Same reasoning as
 * `webhooks/store.ts`'s `createSubscription`.
 */
import { useCoreStore, useStructureCrudApi } from '@guebbit/vue-toolkit';
import { defineStore } from 'pinia';
import { useServerPageTotal } from '@/ui/composables/use-server-page-total.ts';
import { listApiKeys, mintApiKey, revokeApiKey } from '@api';
import type { ApiKey, MintApiKeyRequest } from '@types';

/**
 * Machine-to-machine credentials: list, mint, revoke.
 */
export const useApiKeysStore = defineStore('api-keys', () => {
    /**
     * Shared per-key loading flags, keyed internally by this store's name.
     */
    const { getLoading, setLoading } = useCoreStore();

    /**
     * Credentials: search only. No `list`/`get`/`update` — no matching endpoints — and no
     * `create`/`remove` either, since both need the hand-written scrubbing below.
     */
    const {
        itemDictionary: apiKeys,
        itemList: apiKeysList,
        editRecord: editApiKeyRecord,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageItemList,

        watchList: watchApiKeysSearch,
        fetchAny
    } = useStructureCrudApi<ApiKey, string>(
        {
            search: (_filters, page, size) =>
                listApiKeys({ page, pageSize: size }).then((response) => {
                    captureTotal(response.data.meta.totalPages);
                    return response.data.items;
                })
        },
        { loadingKey: 'api-keys', getLoading, setLoading }
    );

    /**
     * `pageTotal` for `search`'s real, server-paginated results — `captureTotal` is called from
     * `search:` above, once its response's `meta.totalPages` is in.
     */
    const { pageTotal, captureTotal } = useServerPageTotal();

    /**
     * Mints a credential.
     *
     * `fetchAny` runs the call with no caching at all; the non-secret fields are then cached by
     * hand via `editRecord`, and the full response (secret included) is returned to the caller so
     * the create view can still show the one-time reveal modal.
     *
     * @param data - name, permissions and an optional expiry for the new credential
     * @returns The full response, including the plaintext `secret` — the caller must not persist
     *  it anywhere beyond the reveal modal
     */
    const mintCredential = (data: MintApiKeyRequest) =>
        fetchAny(() => mintApiKey(data).then((response) => response.data)).then((created) => {
            if (!created) return created;
            const { secret: _secret, ...record } = created;
            editApiKeyRecord(record, record.id);
            return created;
        });

    /**
     * Revokes a credential. `RevokeApiKeyResponse` is a bare success envelope with no updated
     * record in it (unlike webhooks' replay), so this cannot be `updateTarget` over the raw
     * response — the row is patched by hand instead.
     *
     * An optimistic local timestamp is fine: revocation is immediate server-side, no grace
     * window. `false` (the `create` argument) is load-bearing — `editRecord` defaults to
     * `create: true` and would otherwise insert a ghost record holding nothing but `revokedAt` if
     * the id were not cached.
     *
     * @param id - the credential to revoke
     */
    const revokeCredential = (id: string) =>
        fetchAny(() => revokeApiKey(id)).then(() => {
            editApiKeyRecord({ revokedAt: new Date().toISOString() }, id, false);
        });

    return {
        apiKeys,
        apiKeysList,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,

        watchApiKeysSearch,
        mintCredential,
        revokeCredential
    };
});
