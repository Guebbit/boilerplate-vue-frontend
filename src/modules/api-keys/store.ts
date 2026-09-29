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
import { useStructureCrudApi } from '@guebbit/vue-toolkit';
import { defineStore } from 'pinia';
import { queryClient } from '@/infrastructure/query-client.ts';
import { listApiKeys, mintApiKey, revokeApiKey } from '@api';
import type { ApiKey, MintApiKeyRequest } from '@types';

/**
 * Machine-to-machine credentials: list, mint, revoke.
 */
export const useApiKeysStore = defineStore('api-keys', () => {
    /**
     * Credentials: search only. No `list`/`get`/`update` — no matching endpoints — and no
     * `create`/`remove` either, since both need the hand-written scrubbing below.
     */
    const {
        itemDictionary: apiKeys,
        itemList: apiKeysList,
        addRecord: addApiKeyRecord,
        editRecord: editApiKeyRecord,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,

        watchList: watchApiKeysSearch,
        fetchAny
    } = useStructureCrudApi<ApiKey, string>(
        {
            search: (_filters, page, size) =>
                listApiKeys({ page, pageSize: size }).then((response) => ({
                    items: response.data.items,
                    totalItems: response.data.meta.totalItems
                }))
        },
        { resourceKey: 'api-keys', queryClient }
    );

    /**
     * Mints a credential.
     *
     * `fetchAny` runs the call with no caching at all; the non-secret fields are then cached by
     * hand via `editRecord`, and the full response (secret included) is returned to the caller so
     * the create view can still show the one-time reveal modal.
     *
     * The scrub-and-cache sits INSIDE the call handed to `fetchAny`, where the response is known
     * to exist, rather than in a `.then` on its result — `fetchAny` widens its return to
     * `| undefined` for the cached path, and this call site passes no `key`, so that half of the
     * union is unreachable here.
     *
     * @param data - name, permissions and an optional expiry for the new credential
     * @returns The full response, including the plaintext `secret` — the caller must not persist
     *  it anywhere beyond the reveal modal
     */
    const mintCredential = (data: MintApiKeyRequest) =>
        fetchAny(() =>
            mintApiKey(data).then(({ data: created }) => {
                const { secret: _secret, ...record } = created;
                editApiKeyRecord(record, record.id);
                return created;
            })
        );

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
        addApiKeyRecord,

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
