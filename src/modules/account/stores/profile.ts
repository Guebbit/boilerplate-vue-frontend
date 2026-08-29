import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/stores/session.ts';
import { getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import type { User } from '@types';
import {
    getAccount as apiGetAccount,
    requestAccountDelete as apiRequestAccountDelete,
    confirmAccountDelete as apiConfirmAccountDelete,
    updateAccount as apiUpdateAccount,
    changePassword as apiChangePassword,
    requestEmailVerification as apiRequestEmailVerification,
    confirmEmailVerification as apiConfirmEmailVerification,
    updateUserById as apiUpdateUserById
} from '@api';
import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';

/**
 * The visitor's own editable record, and every operation on it: fetch/update, the role-view
 * widget, the live password change, email verification and account deletion.
 *
 * Deliberately NOT here: establishing or ending a session (`stores/auth.ts`'s `useAuthStore`), and
 * the device-session list / address book, each owned by the component that renders it
 * (`stores/sessions.ts`'s `useAccountSessionsStore`, `stores/addresses.ts`'s `useAddressesStore`).
 * See `docs/theory/modules.md` for why this domain is split this many ways.
 */
export const useProfileStore = defineStore('accountProfile', () => {
    const session = useSessionStore();
    const { getLoading, setLoading } = useCoreStore();
    const {
        selectedIdentifier,
        resetAll,
        selectedRecord: profile,
        loading,
        fetchAny,
        fetchTarget,
        updateTarget
    } = useStructureRestApi<User, string>({ getLoading, setLoading });

    /**
     * Push what the shell and the guards are allowed to know into the session store.
     *
     * Called on every path that learns the visitor's identity, so that `isAuth` / `isAdmin` never
     * lag behind the record this store holds.
     *
     * @param user - The freshly loaded or updated account record.
     */
    const publishViewer = (user?: User) => {
        session.setViewer(user && { id: user.id, email: user.email, admin: Boolean(user.admin) });
    };

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
                    // Identify user in observability tools after profile is fetched
                    const obs = useObservabilityStore();
                    obs.identifyUser(payload.id, payload.email);
                    // Keep the shell's projection in step with the record just loaded.
                    publishViewer(payload);
                    return payload;
                }),
            undefined,
            { forced }
        );
    };

    /**
     * Updates the current user's own profile through `PUT /account`.
     *
     * Its own endpoint, not `PUT /users/{id}`: the users writes sit behind the admin guard, and
     * routing self-service through them answered every non-admin a 403 — the bug this store
     * shipped until the API grew the self-service route. The payload is deliberately what a user
     * owns: no `password` (that is {@link changePassword}, which proves the current one) and no
     * role or account state. Changing the email unverifies the account server-side; the fresh
     * record in the response carries that, so the banner appears without a refetch.
     *
     * @param userData - Fields to change; `email`, `username`, `locale`, `imageUrl`, `phone` and
     *  `website` are sent.
     * @returns A promise resolving with the updated profile, rejected with an
     *  `invalid user` error when no profile is selected.
     */
    const updateProfile = (userData: Partial<User> = {}) => {
        if (!selectedIdentifier.value) return Promise.reject(new Error('invalid user'));
        return updateTarget(
            () =>
                apiUpdateAccount({
                    email: userData.email,
                    username: userData.username,
                    locale: userData.locale,
                    imageUrl: userData.imageUrl,
                    phone: userData.phone,
                    website: userData.website
                }).then((data) => {
                    const payload = getPayloadFromResponse<User>(data);
                    // The projection must not lag the record — same rule as fetchProfile.
                    if (payload) publishViewer(payload);
                    return data;
                }),
            userData,
            selectedIdentifier.value
        ).then((result) =>
            /*
             * Refetch rather than trust the local patch: `updateTarget` merges what was SENT,
             * and the server writes facts the patch never carried — an email change comes back
             * `verified: false`, and the banner reads the record, not the response. One extra
             * GET per profile save, for a store that never invents state.
             */
            fetchProfile(true).then(() => result)
        );
    };

    /**
     * Changes the visitor's OWN role, through the endpoint that owns roles.
     *
     * Deliberately not folded into {@link updateProfile}. `PUT /account` is the self-service
     * payload and carries no role by design — routing a role change through it would hand every
     * visitor the one field they must never set for themselves, which is the bug that endpoint
     * exists to prevent. This goes to `PUT /users/{id}` instead: the admin route, behind the admin
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
     * the shell's `isAdmin` projection must learn it from the record the server now holds — which
     * is what {@link publishViewer} does on the way through.
     *
     * @param admin - The role to hold: `true` administrator, `false` standard user.
     * @returns A promise resolving with the refreshed profile once the change has settled.
     */
    const updateOwnRole = (admin: boolean) => {
        if (!selectedIdentifier.value) return Promise.reject(new Error('invalid user'));
        const userId = selectedIdentifier.value;
        return fetchAny(() => apiUpdateUserById(userId, { admin }).then(() => fetchProfile(true)));
    };

    /**
     * Changes the password of the LIVE session by proving the current one — no email round-trip,
     * unlike the reset flow. Other sessions stay signed in; the sessions panel is where they end.
     *
     * @param currentPassword - The credential being replaced.
     * @param password - The new password.
     * @param passwordConfirm - Its confirmation.
     * @returns A promise resolving once the API accepts the change.
     */
    const changePassword = (currentPassword: string, password: string, passwordConfirm: string) =>
        fetchAny(() => apiChangePassword({ currentPassword, password, passwordConfirm }));

    /**
     * Re-sends the email-verification link — for the mail that never arrived. Signup already
     * sends the first one.
     *
     * @returns A promise resolving once the request is accepted (409 when already verified).
     */
    const requestEmailVerification = () => fetchAny(() => apiRequestEmailVerification());

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

    return {
        profile,
        loading,
        resetAll,
        fetchProfile,
        updateProfile,
        updateOwnRole,
        changePassword,
        requestEmailVerification,
        confirmEmailVerification,
        requestAccountDelete,
        confirmAccountDelete
    };
});
