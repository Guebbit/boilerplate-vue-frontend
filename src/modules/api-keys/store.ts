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
import { ref } from 'vue';
import { useSessionStore } from '@/infrastructure/session.ts';
import { queryClient } from '@/infrastructure/query-client.ts';
import { listApiKeys, mintApiKey, revokeApiKey } from '@api';
import type { ApiKey, MintApiKeyRequest } from '@types';

/**
 * Machine-to-machine credentials: list, mint, revoke.
 */
export const useApiKeysStore = defineStore('api-keys', () => {
    /**
     * The latest `expiresAt` a mint accepts, as the last list response published it. Absent until
     * the list has loaded; the server's 422 is the guard either way.
     */
    const maxExpiresAt = ref<string>();

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
                listApiKeys({ page, pageSize: size }).then((response) => {
                    maxExpiresAt.value = response.maxExpiresAt;
                    return {
                        items: response.items,
                        totalItems: response.meta.totalItems
                    };
                })
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
            mintApiKey(data).then((created) => {
                const { secret: _secret, ...record } = created;
                // A key just minted is live. The mint response carries neither a status nor
                // `actions`; the next list read replaces this row with the server's own answer.
                editApiKeyRecord(
                    {
                        ...record,
                        status: 'active',
                        actions: { revoke: useSessionStore().can('delete', 'ApiKey') }
                    },
                    record.id
                );
                return created;
            })
        );

    /**
     * Revokes a credential. The revoke answers 204 with no body, so there is no updated record
     * (unlike webhooks' replay) and this cannot be `updateTarget` over the raw response — the row
     * is patched by hand instead.
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
            editApiKeyRecord(
                {
                    revokedAt: new Date().toISOString(),
                    status: 'revoked',
                    actions: { revoke: false }
                },
                id,
                false
            );
        });

    return {
        apiKeys,
        apiKeysList,
        maxExpiresAt,
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
