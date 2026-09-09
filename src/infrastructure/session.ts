/**
 * @module
 * Pinia store for the token/viewer pair that gates the app: an in-memory access token plus a
 * minimal projection of who holds it. `isAuth`/`isAdmin` derive from both together, never either
 * alone, so a restored-but-not-yet-identified session cannot be read as authenticated.
 */

import { ref, shallowRef, computed } from 'vue';
import { defineStore } from 'pinia';
import { getCookie } from '@guebbit/js-toolkit';
import {
    getAccount as apiGetAccount,
    getMyAbilities as apiGetMyAbilities,
    refreshToken as apiRefreshToken,
    logout as apiLogout,
    logoutAll as apiLogoutAll,
    updateAccount as apiUpdateAccount
} from '@api';
import { getTokenFromResponse, getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import { createMongoAbility, type MongoAbility } from '@casl/ability';
import { unpackRules } from '@casl/ability/extra';

/**
 * The least the app shell and the guards need to know about the signed-in visitor.
 *
 * Deliberately a minimal projection — `{ id, email, role }` — rather than the domain `User`,
 * which lives in `src/modules/account`. See `docs/theory/layers.md` for the split and for which
 * `/account` calls belong here.
 */
export interface SessionViewer {
    /**
     * The visitor's own id, as the API knows them.
     */
    id: string;
    /**
     * Their address — what the account menu shows to say who is signed in.
     */
    email: string;
    /**
     * The role they hold inside the shop, by name — `customer`, `manager`, `warehouse`,
     * `support`, `owner`, or one a deployment added.
     *
     * Read by the route guards, so it is the one field here that decides what is RENDERED rather
     * than describing a person. It decides nothing else: the server re-evaluates every request,
     * and a client that believed itself an owner would still be refused.
     */
    role: string;
    /**
     * The visitor's own picture, for the avatar the account menu wears — the shell renders it on
     * every page, so it is one of the few user fields the shell genuinely needs rather than one
     * the account module could keep to itself.
     */
    imageUrl?: string;
    /**
     * The small variant of {@link imageUrl}, shown as the avatar's first-paint tier. Absent for a
     * remote/default image or while a digest job is still pending.
     */
    thumbnailUrl?: string;
}

/**
 * Writes a cookie through the prototype setter rather than `document.cookie`.
 *
 * Going through the original descriptor keeps the write working even when a library (or a test
 * double) has shadowed `document.cookie` on the instance.
 *
 * @param value - Full cookie string, attributes included.
 */
const setCookie = (value: string) => {
    const cookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    cookieDescriptor?.set?.call(document, value);
};

/**
 * `; Secure` over HTTPS, or nothing over plain HTTP.
 *
 * Neither `isAuth` nor `rememberMe` carries a credential, but there is no reason to leave them
 * the one cookie pair this app sends over an unencrypted connection when it does not have to.
 * Checked against `location.protocol` rather than a build-mode flag: a `Secure` cookie is
 * silently DROPPED by the browser on plain HTTP, which would break the local dev server if this
 * were on by default instead of tracking the scheme actually in use.
 */
const secureAttribute = () => (location.protocol === 'https:' ? '; Secure' : '');

/**
 * Writes one of this app's two JS-readable cookies, attributes included.
 *
 * `path=/` and `SameSite=Lax` are decided here rather than at each call site, which is where a
 * security attribute belongs: one place to read, one place to change.
 *
 * @param name - Cookie name.
 * @param value - Cookie value.
 * @param maxAgeSeconds - Lifetime. Omitted, the cookie lasts for the browser session.
 */
const writeCookie = (name: string, value: string, maxAgeSeconds?: number) => {
    const maxAge = maxAgeSeconds === undefined ? '' : `; max-age=${maxAgeSeconds}`;
    setCookie(`${name}=${value}; path=/${maxAge}; SameSite=Lax${secureAttribute()}`);
};

/**
 * Expires one of those cookies: the same write, empty and already stale.
 *
 * @param name - Cookie name.
 */
const clearCookie = (name: string) => writeCookie(name, '', 0);

/**
 * Store instance: see the module doc above for the `isAuth`/`isAdmin` derivation rule.
 */
export const useSessionStore = defineStore('session', () => {
    /**
     * User access token. In memory only — the refresh token is an httpOnly cookie the browser
     * never exposes, which is what makes a stolen bundle useless.
     */
    const accessToken = ref<string>();

    /**
     * The signed-in visitor, as much of them as the shell and the guards are entitled to.
     */
    const viewer = ref<SessionViewer>();

    /**
     * Both derive from token AND viewer, not either alone: a token with no viewer is a session
     * that has been restored but not yet identified, and treating it as authenticated lets a
     * guard admit someone whose role is still unknown.
     */
    const isAuth = computed(() => Boolean(accessToken.value && viewer.value));

    /**
     * The rules the SERVER enforces, unpacked from `GET /account/abilities`.
     *
     * Not a copy of the policy — the policy itself, evaluated here. That is the whole point: a
     * client that decides what to render from its own rules keeps a duplicate, and the duplicate
     * drifts silently until somebody is shown a button that answers 403.
     *
     * **It has no authority.** It decides what to RENDER, never what is allowed; every request is
     * re-evaluated server-side. An empty ability — before the fetch lands, or after it fails — is
     * the least-privileged answer, so a slow network greys things out rather than opening them.
     *
     * `shallowRef`, not `ref`: an `Ability` holds its compiled rules in a frozen array, and Vue's
     * deep proxy cannot hand those back unchanged — the read throws. Nothing here mutates the
     * ability anyway; it is replaced wholesale when new rules arrive, which is exactly what a
     * shallow ref is for.
     */
    const ability = shallowRef<MongoAbility>(createMongoAbility());

    /**
     * Replace the rules wholesale with what the server just published.
     *
     * @param rules - CASL's packed rule tuples, exactly as `GET /account/abilities` returns them
     */
    const setAbility = (rules: unknown[]) => {
        ability.value = createMongoAbility(unpackRules(rules as never) as never);
    };

    /**
     * Whether the visitor may do everything the shop has to offer. Derived from token AND viewer
     * for the reason given above.
     *
     * Asked of the RULES rather than of a role name, so it stays true through any renaming of a
     * role: deleting a product is a key only an unrestricted role holds, and no rule with a
     * `manage` action is ever published — the server expands those into concrete actions before
     * packing, precisely so a wildcard cannot leak to the client as an unbounded grant.
     */
    const isAdmin = computed(
        () => Boolean(accessToken.value && viewer.value) && ability.value.can('delete', 'Product')
    );

    /**
     * Whether the visitor may read entity translations, over the generic
     * `/locales/translations/{entityType}/{id}` door — the `translator` role's key, distinct from
     * {@link isAdmin} on purpose: that role never gets `products.manage`, so a mistranslation can
     * never become a mischanged price. `route
     * meta.access: 'translator'` reads this (alongside `isAdmin`, who can reach anything) rather
     * than gating the screen on full admin.
     */
    const canReadTranslations = computed(
        () => Boolean(accessToken.value && viewer.value) && ability.value.can('read', 'Translation')
    );

    /**
     * Whether the visitor may WRITE entity translations — `translations.manage`. Gates the save
     * action on `EntityTranslations.vue`; {@link canReadTranslations} alone only gets a visitor
     * into the screen, not through its submit.
     */
    const canManageTranslations = computed(
        () =>
            Boolean(accessToken.value && viewer.value) && ability.value.can('manage', 'Translation')
    );

    /**
     * Thirty days — what "remember me" conventionally promises. Also stamped onto the durable
     * `rememberMe` marker, so a later silent refresh (which does not know the original choice)
     * can tell the two cases apart. See `useAuthStore.login`'s `remember` param.
     */
    const REMEMBER_ME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

    /**
     * Records a freshly issued token and flags the JS-readable `isAuth` cookie.
     *
     * The cookie is not the credential — it is the hint that lets `tryRestoreAuth` skip a
     * pointless refresh round-trip for a visitor who was never signed in. Its own lifetime
     * mirrors the `rememberMe` marker rather than defaulting to session-only: otherwise a
     * "remember me" visitor's httpOnly refresh cookie would outlive the JS-readable hint that
     * tells the app to even try it, silently dropping the remembered session at browser restart.
     *
     * @param token - Access token from a login or refresh response.
     * @param remember - Whether to (re)start the 30-day `rememberMe` marker. `true`/`false` at
     *  login, when the caller knows the visitor's choice; omitted on a silent refresh, which
     *  reads whatever marker login left rather than guessing.
     */
    const setAccessToken = (token?: string, remember?: boolean) => {
        accessToken.value = token;
        if (remember === true) writeCookie('rememberMe', 'true', REMEMBER_ME_MAX_AGE_SECONDS);
        else if (remember === false) clearCookie('rememberMe');
        if (!token) return;
        const remembered = remember ?? Boolean(getCookie('rememberMe'));
        // No max-age for an unremembered visitor: the hint dies with the browser session, the
        // same way their refresh cookie does.
        writeCookie('isAuth', 'true', remembered ? REMEMBER_ME_MAX_AGE_SECONDS : undefined);
    };

    /**
     * Records who the token belongs to, and asks the server what they may do.
     *
     * The two travel together on purpose: a viewer without rules is a shell that hides every
     * control the visitor is entitled to, and the rules are fetched rather than derived from
     * `role` because only the server's own rules say what a name allows.
     *
     * **Awaited by whoever restores the session**, so a route guard reading `isAdmin` decides on
     * the rules rather than on the empty ability that precedes them — the redirect it would
     * otherwise perform is indistinguishable from "not allowed".
     *
     * It fails quietly: an ability that never arrives is the empty one, which greys everything
     * out. A shell that refused to render because it could not learn what to hide would be worse
     * than one that hides too much.
     *
     * @param nextViewer - The claims projection, or `undefined` to forget it.
     * @returns A promise resolving once the rules that go with the viewer have settled.
     */
    const setViewer = (nextViewer?: SessionViewer): Promise<void> => {
        viewer.value = nextViewer;

        if (!nextViewer) {
            setAbility([]);
            return Promise.resolve();
        }

        return apiGetMyAbilities()
            .then((answer) => {
                setAbility(getPayloadFromResponse<{ rules: unknown[] }>(answer)?.rules ?? []);
            })
            .catch(() => undefined);
    };

    /**
     * Renews the in-memory access token using the httpOnly refresh cookie.
     *
     * @returns A promise resolving once the new token is stored.
     */
    const refreshToken = () =>
        apiRefreshToken().then((data) => {
            setAccessToken(getTokenFromResponse(data));
        });

    /**
     * Asks the API who the current token belongs to and stores the projection.
     *
     * @returns A promise resolving once `viewer` reflects the response.
     */
    const loadViewer = () =>
        apiGetAccount().then((data) => {
            // Typed structurally rather than as the generated `User`: naming the domain entity
            // here would put a `User` back into `infrastructure`.
            const payload = getPayloadFromResponse<{
                id: string;
                email: string;
                role?: string;
                imageUrl?: string;
                thumbnailUrl?: string;
            }>(data);
            return setViewer(
                payload && {
                    id: payload.id,
                    email: payload.email,
                    role: payload.role ?? 'customer',
                    imageUrl: payload.imageUrl,
                    thumbnailUrl: payload.thumbnailUrl
                }
            ).then(() => payload);
        });

    /**
     * Remembers a signed-in visitor's language choice on their account.
     *
     * A guest's choice lives in the URL (`/:locale/...`) and dies with the tab, which is the right
     * lifetime for someone with no record to write to; a signed-in visitor's account record is the
     * one place a preference outlives the tab.
     *
     * The `isAuth` check is here rather than at the call site because it is a rule about the
     * preference, not about the button — a caller that forgot it would send an anonymous
     * `PUT /account` and get a 401. It is also what keeps `AppLanguageSwitcher` out of this store.
     *
     * Best-effort: callers fire it without awaiting, and a failed write is invisible, leaving the
     * stored preference stale until the next switch. A toast about a preference nobody asked to be
     * told about is the worse trade.
     *
     * @param locale - Language tag the visitor just chose.
     * @returns Resolves once the write settles, or immediately for a guest. Never rejects.
     */
    const persistLocalePreference = (locale: string): Promise<void> =>
        isAuth.value
            ? apiUpdateAccount({ locale })
                  .then(() => undefined)
                  .catch(() => undefined)
            : Promise.resolve();

    /**
     * Drops every trace of the session held here: token, viewer and the `isAuth` cookie.
     *
     * Domain caches are NOT cleared from here — the account module resets its own on logout.
     *
     * @returns Nothing; state is cleared as a side effect.
     */
    const clearSession = () => {
        accessToken.value = undefined;
        viewer.value = undefined;
        // Back to the empty ability: a stranger's rules arrive with the next viewer, and until
        // they do the least-privileged answer is the right one.
        setAbility([]);
        // The httpOnly jwt cookie can only be cleared server-side; isAuth/rememberMe are JS-accessible.
        clearCookie('isAuth');
        clearCookie('rememberMe');
    };

    /**
     * Ends THIS session only: the refresh cookie's token is revoked server-side and local state is
     * cleared. Other devices keep their own tokens — `logoutAll` is the one that ends everything.
     *
     * @returns A promise resolving once the API call succeeds and local state is cleared.
     */
    const logout = () => apiLogout().then(() => clearSession());

    /**
     * Ends every session for this visitor, server-side and locally.
     *
     * @returns A promise resolving once the API call succeeds and local state is cleared.
     */
    const logoutAll = () => apiLogoutAll().then(() => clearSession());

    return {
        ability,
        setAbility,
        accessToken,
        viewer,
        isAuth,
        isAdmin,
        canReadTranslations,
        canManageTranslations,
        setAccessToken,
        setViewer,
        refreshToken,
        loadViewer,
        persistLocalePreference,
        clearSession,
        logout,
        logoutAll
    };
});
