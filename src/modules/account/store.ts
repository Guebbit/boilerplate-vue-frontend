import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import type { AxiosRequestConfig } from 'axios';
import {
    getPayloadFromResponse,
    getTokenFromResponse,
    useSessionStore
} from '@/infrastructure/session.ts';
import type { User } from '@types';
import {
    getAccount as apiGetAccount,
    requestAccountDelete as apiRequestAccountDelete,
    confirmAccountDelete as apiConfirmAccountDelete,
    login as apiLogin,
    signup as apiSignup,
    signupWithMultipart,
    requestPasswordReset as apiRequestPasswordReset,
    confirmPasswordReset as apiConfirmPasswordReset,
    updateAccount as apiUpdateAccount,
    changePassword as apiChangePassword,
    getSessions as apiGetSessions,
    revokeSession as apiRevokeSession,
    requestEmailVerification as apiRequestEmailVerification,
    confirmEmailVerification as apiConfirmEmailVerification,
    getAddresses as apiGetAddresses,
    addAddress as apiAddAddress,
    updateAddress as apiUpdateAddress,
    removeAddress as apiRemoveAddress
} from '@api';
import type { Address, AddressInput, Session, UpdateAddressRequest } from '@types';
import { useObservabilityStore, analyticsEvents } from '@/infrastructure/observability';

/**
 * The account domain: the visitor's own record, and every operation that changes it.
 *
 * What is deliberately NOT here is the session — the access token and the `{ id, email, admin }`
 * projection the app shell and the router guards read. Those live in `@/infrastructure/session.ts`, because
 * `infrastructure/http` must attach a token before any domain exists and a guard must decide access before
 * any domain loads. This store *writes* into that projection whenever it learns something new
 * about the visitor, and reads nothing back from it that it did not put there.
 *
 * The division is by question, not by endpoint prefix. `GET /account`, `/account/refresh` and
 * `/account/logout-all` answer "who holds this token, is it still valid, end it" — session. Signup,
 * the password resets, the deletion flow and editing your own record are operations *on* an
 * account — here.
 */

/**
 * While we can't access to inject/provide in guards or any non-components,
 * we can access Pinia, so it is useful to safely store "global" variables (if needed)
 */
export const useAccountStore = defineStore('account', () => {
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
     * Warning: can't use useI18n because it wouldn't work in global guards
     * (It works correctly on changes and so on)
     */

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
     * Authenticates the user, stores the access token, flags the `isAuth`
     * cookie and loads the profile.
     *
     * @param email - Account email.
     * @param password - Plain-text password, sent over the wire only.
     * @returns A promise resolving once the token is stored and the profile has
     *  been (re)fetched.
     */
    const login = (email: string, password: string) =>
        fetchAny(() =>
            apiLogin({ email, password })
                .then((data) => {
                    session.setAccessToken(getTokenFromResponse(data));
                })
                .then(() => {
                    const obs = useObservabilityStore();
                    obs.track(analyticsEvents.USER_LOGGED_IN, { method: 'email' });
                    return fetchProfile(true);
                })
        );

    /**
     * Registers a new user account, as multipart when a profile image is attached
     * and as plain JSON otherwise.
     *
     * The backend does not auto-login on signup: the user must confirm their
     * email address and then log in separately, so no token/session is set here.
     *
     * Takes its fields as one object rather than positionally, matching
     * `createUser` / `createProduct`. Positionally this reached six arguments,
     * two of them defaulted from earlier ones — an arity at which a caller can
     * transpose `imageUpload` and `options`, or forget that `passwordConfirm`
     * defaults from `password` while `username` defaults from `email`, with
     * nothing but argument order to catch it.
     *
     * @param credentials - Account fields. `username` defaults to `email` and
     *  `passwordConfirm` to `password`; an `imageUpload` switches the call to
     *  `multipart/form-data`.
     * @param options - Per-call axios overrides, forwarded to `orvalMutator` —
     *  `Signup.vue` passes `onUploadProgress` through it.
     * @returns A promise resolving once the account has been created.
     */
    const signup = (
        {
            email,
            password,
            username = email,
            passwordConfirm = password,
            imageUpload
        }: {
            email: string;
            password: string;
            username?: string;
            passwordConfirm?: string;
            imageUpload?: File;
        },
        options?: AxiosRequestConfig
    ) =>
        fetchAny(() =>
            (imageUpload
                ? signupWithMultipart(
                      { email, username, password, passwordConfirm, imageUpload },
                      options
                  )
                : apiSignup({ email, username, password, passwordConfirm }, options)
            ).then(() => {
                const obs = useObservabilityStore();
                obs.track(analyticsEvents.USER_SIGNED_UP, { method: 'email' });
            })
        );

    /**
     * Starts the password reset flow by sending a token to the provided email.
     *
     * @param email - Email of the account to reset.
     * @returns A promise resolving once the request has been accepted.
     */
    const requestPasswordReset = (email: string) =>
        fetchAny(() => apiRequestPasswordReset({ email }));

    /**
     * Completes the password reset using the one-time token and a new password.
     *
     * @param token - One-time token received by email.
     * @param password - New password.
     * @param passwordConfirm - Confirmation of the new password.
     * @returns A promise resolving once the password has been changed.
     */
    const confirmPasswordReset = (token: string, password: string, passwordConfirm: string) =>
        fetchAny(() => apiConfirmPasswordReset({ token, password, passwordConfirm }));

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
     * @param userData - Fields to change; `email`, `username`, `locale` and `imageUrl` are sent.
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
                    imageUrl: userData.imageUrl
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
     * The visitor's live sessions — one entry per refresh token, the current one flagged.
     * A plain ref rather than the record structure: a session is not a domain record, it has no
     * detail page, and the list is only ever read whole.
     */
    const sessions = ref<Session[]>([]);

    /**
     * Loads the sessions list.
     *
     * @returns A promise resolving with the sessions.
     */
    const fetchSessions = () =>
        fetchAny(() =>
            apiGetSessions().then((data) => {
                const payload = getPayloadFromResponse<{ sessions: Session[] }>(data);
                sessions.value = payload?.sessions ?? [];
                return sessions.value;
            })
        );

    /**
     * Ends one session — "log out that device" — and reloads the list, because the answer worth
     * rendering after a revocation is the list without it.
     *
     * @param sessionId - Handle from {@link fetchSessions}; never a token value.
     * @returns A promise resolving with the refreshed sessions.
     */
    const revokeSession = (sessionId: string) =>
        fetchAny(() => apiRevokeSession(sessionId).then(() => fetchSessions()));

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
     * The visitor's address book. Whole-list state like `sessions`, and for the same reason —
     * the invariant worth rendering after any write is "exactly one default", which is a
     * property of the list.
     */
    const addresses = ref<Address[]>([]);

    /** Replace the local book with the payload every address endpoint answers with. */
    const readAddressesResponse = (data: unknown) => {
        const payload = getPayloadFromResponse<{ addresses: Address[] }>(
            data as { data?: { addresses: Address[] } }
        );
        addresses.value = payload?.addresses ?? [];
        return addresses.value;
    };

    /**
     * Loads the address book.
     *
     * @returns A promise resolving with the addresses.
     */
    const fetchAddresses = () =>
        fetchAny(() => apiGetAddresses().then((data) => readAddressesResponse(data)));

    /**
     * Adds an entry. The first one becomes the default server-side.
     *
     * @param address - The entry's fields; `default: true` claims the default slot.
     * @returns A promise resolving with the updated book.
     */
    const addAddress = (address: AddressInput) =>
        fetchAny(() => apiAddAddress(address).then((data) => readAddressesResponse(data)));

    /**
     * Updates one entry. `default: true` claims the slot; absent leaves it alone.
     *
     * @param addressId - Which entry.
     * @param changes - The fields to change.
     * @returns A promise resolving with the updated book.
     */
    const updateAddress = (addressId: string, changes: UpdateAddressRequest) =>
        fetchAny(() =>
            apiUpdateAddress(addressId, changes).then((data) => readAddressesResponse(data))
        );

    /**
     * Removes one entry; removing the default promotes the oldest survivor server-side.
     *
     * @param addressId - Which entry.
     * @returns A promise resolving with the updated book.
     */
    const removeAddress = (addressId: string) =>
        fetchAny(() => apiRemoveAddress(addressId).then((data) => readAddressesResponse(data)));

    /**
     * Drops every trace of the current session: cached records, query cache, token and cookie.
     *
     * `resetAll()` rather than emptying `itemDictionary` by hand, because the hand-written version
     * left the TanStack entries behind — so a logout followed by a login could be served the
     * previous user's cached response until it went stale.
     *
     * @returns Nothing; state is cleared as a side effect.
     */
    const clearSession = () => {
        // `resetAll()` rather than emptying `itemDictionary` by hand, because the hand-written
        // version left the TanStack entries behind — so a logout followed by a login could be
        // served the previous user's cached response until it went stale.
        resetAll();
        session.clearSession();
    };

    /**
     * Logs out of THIS session and clears all cached user data. Other devices stay signed in —
     * ending everything is {@link logoutEverywhere}, offered from the sessions panel.
     *
     * @returns A promise resolving once the API call succeeds and the local
     *  token, cached records and `isAuth` cookie have been cleared. The httpOnly
     *  jwt cookie can only be cleared server-side.
     */
    const logout = () => {
        // The httpOnly jwt cookie can only be cleared server-side; isAuth is JS-accessible.
        const obs = useObservabilityStore();
        obs.track(analyticsEvents.USER_LOGGED_OUT);
        obs.unidentifyUser();
        return session.logout().then(() => {
            resetAll();
        });
    };

    /**
     * Ends EVERY session for this account — the compromised-credentials button.
     *
     * @returns A promise resolving once every refresh token is revoked and local state cleared.
     */
    const logoutEverywhere = () => {
        const obs = useObservabilityStore();
        obs.track(analyticsEvents.USER_LOGGED_OUT);
        obs.unidentifyUser();
        return session.logoutAll().then(() => {
            resetAll();
        });
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
     *  session, cached records and observability identity have been cleared.
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
        publishViewer,
        sessions,
        addresses,

        loading,
        login,
        signup,
        requestPasswordReset,
        confirmPasswordReset,
        requestAccountDelete,
        confirmAccountDelete,
        fetchProfile,
        updateProfile,
        changePassword,
        fetchSessions,
        revokeSession,
        requestEmailVerification,
        confirmEmailVerification,
        fetchAddresses,
        addAddress,
        updateAddress,
        removeAddress,
        logout,
        logoutEverywhere
    };
});
