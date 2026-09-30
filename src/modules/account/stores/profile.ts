/**
 * @module
 * Pinia store (Composition API form) wrapping `useStructureRestApi` for the visitor's own
 * editable record: fetch/update, role self-service, live password change, email verification and
 * account deletion each reuse the shared `selectedIdentifier`/`fetchTarget`/`updateTarget`
 * primitives rather than duplicating request/cache logic per action.
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { omitNulls, uploadThenClear } from '@/infrastructure/utils/forms.ts';
import { queryClient } from '@/infrastructure/query-client.ts';
import { getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import type { AxiosRequestConfig } from 'axios';
import type { User, AccountExportResponse } from '@types';
import {
    getAccount as apiGetAccount,
    requestAccountDelete as apiRequestAccountDelete,
    confirmAccountDelete as apiConfirmAccountDelete,
    updateAccount as apiUpdateAccount,
    updateAccountWithMultipart as apiUpdateAccountWithMultipart,
    cancelPendingEmailChange as apiCancelPendingEmailChange,
    changePassword as apiChangePassword,
    confirmEmailVerification as apiConfirmEmailVerification,
    confirmEmailChange as apiConfirmEmailChange,
    updateUserById as apiUpdateUserById,
    exportAccountData as apiExportAccountData
} from '@api';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';
import {
    useAnalyticsConsentStore,
    isAnalyticsGuestConsentEnabled
} from '@/infrastructure/analytics-consent.ts';
import { getTokenFromResponse } from '@/infrastructure/http/envelope.ts';

/**
 * Which `isLoading`/mutation key `updateProfile` runs under: one per avatar path, none for an
 * ordinary field save, which has no button of its own to spin.
 *
 * @param imageUpload - The picked file, when the call carries one.
 * @param imageUrl - The record's picture field, `null` when the call is a removal.
 * @returns The bucket key, or `undefined` for a plain save (matches the whole-resource `loading`).
 */
const avatarLoadingKey = (imageUpload?: File, imageUrl?: null): string[] | undefined => {
    if (imageUpload) return ['avatar-upload'];
    // `null` is the removal — the contract's `minLength: 1` refuses `''`.
    return imageUrl === null ? ['avatar-remove'] : undefined;
};

/**
 * The visitor's own editable record, and every operation on it: fetch/update, the role-view
 * widget, the live password change, email verification and account deletion.
 *
 * Separate from `session`, which holds the minimal `{ id, email, admin }` projection the shell
 * and the guards need. This store holds the whole `User` — the split `docs/theory/layers.md`
 * describes.
 *
 * Deliberately NOT here: establishing or ending a session (`stores/auth.ts`'s `useAuthStore`), and
 * the device-session list / address book, each owned by the component that renders it
 * (`stores/sessions.ts`'s `useAccountSessionsStore`, `stores/addresses.ts`'s `useAddressesStore`).
 * See `docs/theory/modules.md` for why this domain is split this many ways.
 */

export const useProfileStore = defineStore('accountProfile', () => {
    /**
     * The session store, whose token and viewer this store writes.
     */
    const session = useSessionStore();

    /**
     * The toolkit's REST slice, with `selectedRecord` renamed to `profile`: there is only ever
     * one record here, and it is the visitor's own. `isLoading` backs the two avatar computeds.
     */
    const {
        selectedIdentifier,
        resetAll,
        selectedRecord: profile,
        loading,
        isLoading,
        fetchAny,
        fetchTarget,
        updateTarget
    } = useStructureRestApi<User, string>({
        resourceKey: 'accountProfile',
        queryClient
    });

    /**
     * Push what the shell and the guards are allowed to know into the session store.
     *
     * Called on every path that learns the visitor's identity, so that `isAuth` and the rules the
     * guards read never lag behind the record this store holds.
     *
     * @param user - The freshly loaded or updated account record.
     * @returns A promise resolving once the shell also holds the rules that go with them.
     */
    const publishViewer = (user?: User) =>
        session.setViewer(
            user && {
                id: user.id,
                email: user.email,
                // `unverified`, not `customer` — same least-privileged fallback the backend
                // resolves an absent role to (`account/module.ts`).
                role: user.role ?? 'unverified',
                imageUrl: user.imageUrl,
                // Absent means unverified: the backend sends the field only once it's set.
                verified: user.verifiedAt != null
            }
        );

    /**
     * FA-D5: whether this store instance has already tried syncing a guest's cookie-held consent
     * choice onto a freshly-authenticated account (see {@link syncGuestAnalyticsConsent}). Set
     * BEFORE the sync's own `PATCH /account` call, not after it resolves — so a slow request, or
     * one that somehow answers with `analyticsConsent` still absent, can never be retried by a
     * later `fetchProfile` in the same session and loop.
     */
    const guestConsentSyncSettled = ref(false);

    /**
     * Loads the authenticated user's profile and identifies them in the
     * observability tools.
     *
     * Requires authentication, but an expired or missing access token triggers
     * an automatic refresh (using the jwt refresh cookie) and a retry.
     *
     * @param forced - Bypass the store cache and always hit the API.
     * @returns A promise resolving with the profile, or `undefined` when the
     *  response carries no payload.
     */
    const fetchProfile = (forced = false) => {
        return fetchTarget(
            () =>
                apiGetAccount().then((data) => {
                    const payload = getPayloadFromResponse<User>(data);
                    if (!payload) return;
                    // to handle single-target stores we just need to select the correct identifier
                    selectedIdentifier.value = payload.id;
                    // Umami/Faro identity follows the visitor's own analytics consent, checked
                    // fresh on every fetch — this store also refetches right after a consent
                    // toggle (`updateProfile`), which is what turns a withdrawal into an unidentify.
                    const obs = useObservabilityStore();
                    if (payload.analyticsConsent === true) obs.identifyUser(payload.id);
                    else obs.unidentifyUser();
                    // Keep the shell's projection in step with the record just loaded, rules
                    // included: a screen that renders before them hides what it should show.
                    return publishViewer(payload).then(() => payload);
                }),
            undefined,
            { forced }
        ).then((payload) => {
            // Outside `fetchTarget`'s own callback on purpose: `syncGuestAnalyticsConsent` may
            // call `updateProfile`, which calls back into THIS function — nesting that inside the
            // callback `fetchTarget` is still tracking as in-flight would re-enter its own loading
            // state before it ever settles.
            if (!payload) return payload;
            return syncGuestAnalyticsConsent(payload).then(() => payload);
        });
    };

    /**
     * What a profile write may carry: the record's own fields, widened where the wire accepts
     * `null` (a clear) but the local `User` never holds one.
     */
    type ProfileWrite = Partial<Omit<User, 'imageUrl' | 'locale' | 'phone' | 'website'>> & {
        imageUrl?: null;
        locale?: string | null;
        phone?: string | null;
        website?: string | null;
    };

    /**
     * The local cache patch for a profile write: the sent fields, minus any that carry `null`.
     *
     * @param userData - What the caller passed to {@link updateProfile}, `imageUpload` removed.
     * @returns A `Partial<User>` safe to merge into the cached record.
     */
    const optimisticPatch = ({
        locale,
        phone,
        website,
        imageUrl,
        ...rest
    }: ProfileWrite): Partial<User> => ({
        ...rest,
        ...omitNulls({ locale, phone, website, imageUrl }, [
            'locale',
            'phone',
            'website',
            'imageUrl'
        ])
    });

    /**
     * Updates the current user's own profile through `PATCH /account` — a PATCH merges what it
     * sends, so a field the caller leaves out stays as it is (a `PUT /account` would clear every
     * field left out instead, RFC 9110 §9.3.4).
     *
     * Its own endpoint, not `PATCH /users/{id}`: the users writes sit behind the admin guard, and
     * routing self-service through them answered every non-admin a 403 — the bug this store
     * shipped until the API grew the self-service route. The payload is deliberately what a user
     * owns: no `password` (that is {@link changePassword}, which proves the current one) and no
     * role or account state. A new email is parked in `pendingEmail` rather than applied — `email`
     * and the verification state stay untouched until `POST /account/email-change-confirm` proves
     * it — so the fresh record in the response is what shows the caller their change is pending.
     *
     * @param userData - Fields to change; `email`, `username`, `locale`, `imageUrl`, `phone`,
     *  `website` and `analyticsConsent` are sent. An `imageUpload` switches the call to
     *  `multipart/form-data` — the `{ imageUpload, ...rest }` split `modules/users/store.ts`
     *  already has for the admin form,
     *  one shape for both call sites. `imageUrl` and `imageUpload` are mutually exclusive in
     *  practice, and only `ProfileAvatar.vue` ever sets either: its remove button sends
     *  `imageUrl: null` alone (never `''` — the contract's own `minLength: 1` refuses that with a
     *  422), its picker sends `imageUpload` alone. `Profile.vue`'s own details form must send
     *  neither: re-sending the already-loaded `imageUrl` there would overwrite a concurrent avatar
     *  change and orphan the file it just uploaded. `imageUrl` widens past `Partial<User>`'s own
     *  (read-shape, non-null) type for exactly this: the write contract allows `null`, the record
     *  itself never reads back as one. `phone` and `website` widen the same way: `null` clears
     *  them, and `Profile.vue` sends it for a field the visitor emptied.
     * @param options - Per-call axios overrides, forwarded to `orvalMutator` —
     *  `ProfileAvatar.vue` passes `onUploadProgress` through it.
     * @returns A promise resolving with the updated profile, rejected with an
     *  `invalid user` error when no profile is selected.
     */
    const updateProfile = (
        { imageUpload, ...userData }: ProfileWrite & { imageUpload?: File } = {},
        options?: AxiosRequestConfig
    ) => {
        if (!selectedIdentifier.value) return Promise.reject(new Error('invalid user'));
        // Listed field by field rather than spread: a `Partial<User>` can carry `role`,
        // `verifiedAt` or `deletedAt`, and none of those is a user's to send. The two branches
        // differ only in how the picture travels.
        const fields = {
            email: userData.email,
            username: userData.username,
            locale: userData.locale,
            phone: userData.phone,
            website: userData.website,
            analyticsConsent: userData.analyticsConsent
        };
        // `in`, not a truthiness check: a caller that means to CLEAR the image passes
        // `imageUrl: null`, a present key with a falsy value. Only `Profile.vue`'s details form
        // omits the key outright, which is what keeps its save from re-sending a stale image.
        const withImageUrl =
            'imageUrl' in userData ? { ...fields, imageUrl: userData.imageUrl } : fields;
        return updateTarget(
            () =>
                (imageUpload
                    ? // A clear cannot ride a multipart part: it follows as a JSON PATCH.
                      uploadThenClear(
                          fields,
                          (rest) =>
                              apiUpdateAccountWithMultipart({ ...rest, imageUpload }, options),
                          (clears) => apiUpdateAccount(clears, { signal: options?.signal })
                      )
                    : apiUpdateAccount(withImageUrl, options)
                ).then((data) => {
                    const payload = getPayloadFromResponse<User>(data);

                    // The projection must not lag the record — same rule as fetchProfile.
                    return payload ? publishViewer(payload).then(() => data) : data;
                }),
            // The new imageUrl comes back from the API; a Blob has no business in store state.
            // `null` (image, phone, website) is dropped from this OPTIMISTIC patch only — the
            // toolkit's `Partial<User>` (the record's read shape) never carries a null, and the
            // refetch right below corrects the visible state within one round trip regardless.
            optimisticPatch(userData),
            selectedIdentifier.value,
            // One action, two avatar buttons: each path gets its own bucket key so the picker
            // and the remove button spin one at a time. `imageUrl: null` is the removal.
            { key: avatarLoadingKey(imageUpload, userData.imageUrl) }
        ).then((result) =>
            /*
             * Refetch rather than trust the local patch: `updateTarget` merges what was SENT, and
             * the server writes facts the patch never carried — a new `pendingEmail`, a processed
             * avatar digest. One extra GET per profile save, for a store that never invents state.
             */
            fetchProfile(true).then(() => result)
        );
    };

    /**
     * FA-D5: the one place a guest's cookie-held consent choice crosses over into the account —
     * a no-op unless ALL of: the feature is built (`VITE_ANALYTICS_GUEST_CONSENT`), this account
     * has never recorded a preference of its own (`analyticsConsent` absent — signup always sends
     * one, so this is an OAuth signup or an admin-created account), the browser holds an answered
     * guest cookie, and this store has not already tried the sync this session.
     *
     * @param payload - The freshly loaded profile — read, never mutated, by `fetchProfile`.
     * @returns A promise resolving once the sync (if any) settles; `updateProfile`'s own refetch
     *  reruns this function too, where the now-defined `analyticsConsent` short-circuits it.
     */
    const syncGuestAnalyticsConsent = (payload: User): Promise<unknown> => {
        if (
            guestConsentSyncSettled.value ||
            !isAnalyticsGuestConsentEnabled() ||
            payload.analyticsConsent !== undefined
        )
            return Promise.resolve();
        const guestChoice = useAnalyticsConsentStore().choice;
        if (guestChoice === 'unknown') return Promise.resolve();
        guestConsentSyncSettled.value = true;
        return updateProfile({ analyticsConsent: guestChoice === 'granted' });
    };

    /**
     * Cancels a pending email change, through the endpoint dedicated to it — `DELETE
     * /account/pending-email`. Resending the current address is a no-op, not a cancel, so a
     * routine save never drops a change in flight by accident; this is the only thing that does.
     *
     * @returns A promise resolving once the change is discarded and the profile refetched.
     */
    const cancelPendingEmailChange = () =>
        fetchAny(() =>
            apiCancelPendingEmailChange().then(() => fetchProfile(true).then(() => undefined))
        );

    /**
     * Changes the visitor's OWN role, through the endpoint that owns roles.
     *
     * Deliberately not folded into {@link updateProfile}. `PUT/PATCH /account` is the self-service
     * payload and carries no role by design — routing a role change through it would hand every
     * visitor the one field they must never set for themselves, which is the bug that endpoint
     * exists to prevent. This goes to `PATCH /users/{id}` instead: the admin route, behind the admin
     * guard, so the API authorises the change rather than a hidden form field doing it. A
     * non-admin calling this gets the 403 it deserves.
     *
     * There is no self-service "change my own role" endpoint on the backend today — checked
     * `openapi.yaml`, only the admin users routes touch `admin`. Reusing the admin one here is the
     * chosen trade-off, not an oversight: adding a dedicated endpoint is a backend contract change,
     * left for its own pass.
     *
     * `updateUserById` is reached through `@api` rather than through the users module: `@api` is
     * infrastructure, not a sibling, so this is a contract call and not an `account → users` edge
     * — the same reasoning that lets the cart resolve product titles without depending on
     * products. The users barrel publishes vocabulary, and it stays that way.
     *
     * The profile is refetched rather than patched: demoting yourself is a real outcome here, and
     * the rules the shell renders from must be re-fetched for the role the server now holds —
     * which is what {@link publishViewer} does on the way through.
     *
     * @param role - The role name to hold, one of the presets the server declares.
     * @returns A promise resolving with the refreshed profile once the change has settled.
     */
    const updateOwnRole = (role: string) => {
        if (!selectedIdentifier.value) return Promise.reject(new Error('invalid user'));
        const userId = selectedIdentifier.value;
        // PATCH, not PUT (AUDIT_0924 D17d): this sends `{ role }` alone, and a PUT's every
        // omitted field is cleared (RFC 9110 §9.3.4) — the wrong verb for a single-field change.
        return fetchAny(() => apiUpdateUserById(userId, { role }).then(() => fetchProfile(true)));
    };

    /**
     * Changes the password of the LIVE session by proving the current one — no email round-trip,
     * unlike the reset flow.
     *
     * The API revokes every OTHER session on success and answers with a fresh access token for
     * THIS one (plus fresh session cookies), so the token is adopted here the way login adopts
     * its own — without it, this session would be living on borrowed time. `remember` is omitted:
     * a password change is not the place to rewrite the visitor's remember-me choice.
     *
     * @param currentPassword - The credential being replaced.
     * @param password - The new password.
     * @param passwordConfirm - Its confirmation.
     * @returns A promise resolving once the API accepts the change and the fresh token is stored.
     */
    const changePassword = (currentPassword: string, password: string, passwordConfirm: string) =>
        fetchAny(() =>
            apiChangePassword({ currentPassword, password, passwordConfirm }).then((data) => {
                session.setAccessToken(getTokenFromResponse(data));
            })
        );

    /**
     * Spends the emailed verification token. Public — the visitor following the link is not
     * necessarily signed in — so the profile is refetched only when a session exists, to pull
     * the freshly verified record into the store.
     *
     * @param token - One-time token from the email link.
     * @returns A promise resolving once the address is verified.
     */
    const confirmEmailVerification = (token: string) =>
        fetchAny(() =>
            apiConfirmEmailVerification({ token }).then(() =>
                session.isAuth ? fetchProfile(true).then(() => undefined) : undefined
            )
        );

    /**
     * Spends the emailed email-change token — the other half of `updateProfile`'s `pendingEmail`
     * flow, proving the NEW address rather than the account's original one. Public, like
     * {@link confirmEmailVerification}: the link arrives by email and the visitor following it is
     * not necessarily signed into the session that requested the change.
     *
     * @param token - One-time token from the email-change link.
     * @returns A promise resolving once the address has swapped in.
     */
    const confirmEmailChange = (token: string) =>
        fetchAny(() =>
            apiConfirmEmailChange({ token }).then(() =>
                session.isAuth ? fetchProfile(true).then(() => undefined) : undefined
            )
        );

    /**
     * Drops the cached record and the session it belongs to. Used once the account itself is
     * gone — a cache that survived would let a stale profile flash before the guard redirects.
     */
    const clearSession = () => {
        resetAll();
        session.clearSession();
    };

    /**
     * Initiates the account deletion flow, sending a confirmation token to the
     * user's email.
     *
     * @returns A promise resolving once the request has been accepted.
     */
    const requestAccountDelete = () => fetchAny(() => apiRequestAccountDelete());

    /**
     * Exports every record the API holds for the visitor's own account (profile, addresses,
     * orders, payments, shipments, cart, wishlist, sessions, audit log — GDPR Art. 15/20).
     *
     * `POST /account/export` demands a FRESH session rather than a request body. This action does
     * not handle that itself: an expired session falls through the step-up interceptor
     * (`infrastructure/http/step-up.ts`), which prompts for the password and retries transparently.
     *
     * @returns A promise resolving with the export payload, or `undefined` when the response
     *  carries none.
     */
    const exportAccountData = () =>
        fetchAny(() =>
            apiExportAccountData().then((data) =>
                getPayloadFromResponse<AccountExportResponse>(data)
            )
        );

    /**
     * Completes account deletion using the one-time token.
     *
     * @param token - Confirmation token received by email.
     * @returns A promise resolving once the account is deleted and the local
     *  session, cached record and observability identity have been cleared.
     */
    const confirmAccountDelete = (token: string) =>
        fetchAny(() =>
            apiConfirmAccountDelete({ token }).then(() => {
                // Clear user identity from observability tools
                const obs = useObservabilityStore();
                obs.unidentifyUser();
                clearSession();
            })
        );

    /**
     * Whether a picked avatar is being uploaded.
     */
    const uploadingAvatar = computed(() => isLoading(['avatar-upload']));

    /**
     * Whether the stored avatar is being removed.
     */
    const removingAvatar = computed(() => isLoading(['avatar-remove']));

    return {
        profile,
        uploadingAvatar,
        removingAvatar,
        loading,
        resetAll,
        fetchProfile,
        updateProfile,
        cancelPendingEmailChange,
        updateOwnRole,
        changePassword,
        confirmEmailVerification,
        confirmEmailChange,
        requestAccountDelete,
        confirmAccountDelete,
        exportAccountData
    };
});
