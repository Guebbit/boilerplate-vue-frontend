/**
 * @module
 * Pinia store for the token/viewer pair that gates the app: an in-memory access token plus a
 * minimal projection of who holds it, and the two CASL abilities every screen is gated on.
 * `isAuth` derives from token AND viewer together, never either alone, so a
 * restored-but-not-yet-identified session cannot be read as authenticated.
 */

import { ref, shallowRef, computed, onScopeDispose } from 'vue';
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
import { warn } from '@/infrastructure/utils/logger.ts';
import { createMongoAbility, type MongoAbility, type RawRuleOf } from '@casl/ability';
import { unpackRules, type PackRule } from '@casl/ability/extra';
import type { Abilities, PackedRules } from '@types';
import type { AxiosError } from 'axios';
import type { AxiosRequestConfigWithRetry } from '@/infrastructure/http/types.ts';

/**
 * Cross-tab logout: another tab's `clearSession` reaches this one over `BroadcastChannel`, not on
 * this tab's next request. `undefined` in an environment with none (older browsers, some test
 * runners) — cross-tab sync degrades quietly rather than being something to retry or polyfill.
 */
const sessionChannel =
    typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel('session');

/**
 * Whether an axios rejection is a definitive "this session is dead" answer from the refresh
 * endpoint specifically — 401 (expired/revoked) or 403 (blocked account) — as opposed to a
 * network failure, timeout or 5xx, none of which say the refresh cookie is actually bad.
 *
 * @param error - The rejection `apiRefreshToken` settled with.
 */
const isDefinitiveAuthFailure = (error: unknown): boolean => {
    const status = (error as AxiosError | undefined)?.response?.status;
    return status === 401 || status === 403;
};

/**
 * Turns one scope's packed rules — `GET /account/abilities`'s own wire shape — into the CASL
 * rule objects {@link createMongoAbility} builds an ability from.
 *
 * The cast is the one place this file trusts the contract rather than the compiler: OpenAPI/JSON
 * Schema cannot express CASL's discriminated `[action, subject, conditions?, fields?, inverted?,
 * reason?]` tuple, so the generated `PackedRules` type is the loose `unknown[][]` shape Orval
 * falls back to. `unpackRules`'s own `PackRule<T>` is exactly that tuple, which is what the
 * backend actually sends — a single, named cast to it, rather than laundering the value through
 * `never` twice.
 *
 * @param packed - One scope's rules exactly as the ability endpoint returns them.
 * @returns Unpacked CASL rules, ready for {@link createMongoAbility}.
 */
const unpackAbilityRules = (packed: PackedRules): RawRuleOf<MongoAbility>[] =>
    unpackRules(packed as PackRule<RawRuleOf<MongoAbility>>[]);

/**
 * The concrete actions a screen may ask about — CASL's own vocabulary, as
 * `shared/authorization-keys.yaml` declares it. Beyond CRUD: `checkout` (`cart.self.checkout`),
 * `override` (`orders.any.override`), `sweep` (`inventory.any.sweep`) and `start`
 * (`delivery.any.start`) — one action per non-CRUD write the contract actually exposes.
 *
 * `manage` is deliberately absent from what a CLIENT may ask for: no key in the shared file
 * declares that action, and there is no wildcard of any kind to expand into one — every key
 * spells out its own concrete action, so asking for `manage` always answers no. A screen asks for
 * the action it actually performs.
 */
export type PermissionAction =
    'read' | 'create' | 'update' | 'delete' | 'checkout' | 'override' | 'sweep' | 'start';

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
     * `support`, `admin`, or one a deployment added.
     *
     * Read by the route guards, so it is the one field here that decides what is RENDERED rather
     * than describing a person. It decides nothing else: the server re-evaluates every request,
     * and a client that believed itself an admin would still be refused.
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
    /**
     * Whether the address on file has been proven — `verifiedAt != null` on the record. The one
     * field here read by something OTHER than a route guard: `AppVerificationBanner` keys on it
     * directly, deliberately not on a shop permission (an unverified operator on a platform-only
     * site must see it too).
     *
     * Optional rather than required: every real projection (`loadViewer`, `publishViewer`) always
     * sets it, but widening it to required would force `verified: true` onto every other module's
     * `SessionViewer` test double, most of which are outside this lane's clusters and have nothing
     * to do with verification. `!viewer.verified` reads a missing value as unverified, which is
     * the fail-safe direction for a fixture that never set it on purpose.
     */
    verified?: boolean;
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
 * Store instance: see the module doc above for the `isAuth` derivation rule.
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
     * Bumped by {@link clearSession}. A refresh started before a clear must not act on its result
     * once it lands — a continuation whose captured epoch no longer matches the current one is
     * stale and is dropped, which is what stops a refresh that resolves just after logout from
     * silently signing the visitor back in.
     */
    const sessionEpoch = ref(0);

    /**
     * Bumped only when the session died on its own — the refresh endpoint answered a definitive
     * 401/403 — never on an explicit {@link logout}/{@link logoutAll}. `LayoutDefault.vue` watches
     * this to turn it into a toast and a redirect to login; a plain logout needs neither.
     */
    const expiredSignal = ref(0);

    /**
     * The rules the SERVER enforces, unpacked from `GET /account/abilities` — one ability per
     * scope, because the model has two worlds and they never merge. `tenant` is what the caller
     * may do inside this shop; `platform` is what they may do across the installation.
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
     * deep proxy cannot hand those back unchanged — the read throws. Nothing here mutates an
     * ability anyway; each is replaced wholesale when new rules arrive, which is exactly what a
     * shallow ref is for.
     */
    const tenantAbility = shallowRef<MongoAbility>(createMongoAbility());

    /** The caller's rules over the INSTALLATION — health, metrics, the operational audit. Empty for almost everyone. */
    const platformAbility = shallowRef<MongoAbility>(createMongoAbility());

    /**
     * Every CASL subject a declared key names, as last published by `GET /account/abilities` —
     * not caller-specific (it is the registry's whole declared set, the same for everyone who
     * asks), so unlike the two abilities above it is never emptied on logout; there is nothing
     * privileged in it to revoke. Empty until the first fetch lands, which {@link can} treats as
     * "not yet known" rather than "no subject is valid".
     */
    const declaredSubjects = ref<Set<string>>(new Set());

    /** Subjects already warned about, so a route repeatedly asking about the same typo logs once. */
    const warnedSubjects = new Set<string>();

    /**
     * Replace both rule sets wholesale with what the server just published.
     *
     * @param rules - the payload's two packed-rule lists, exactly as `GET /account/abilities`
     *  returns them, plus its declared subject set; omit `tenant`/`platform` to empty them
     */
    const setAbilities = (
        rules: Pick<Partial<Abilities>, 'tenant' | 'platform' | 'subjects'> = {}
    ) => {
        tenantAbility.value = createMongoAbility(unpackAbilityRules(rules.tenant ?? []));
        platformAbility.value = createMongoAbility(unpackAbilityRules(rules.platform ?? []));
        if (rules.subjects) declaredSubjects.value = new Set(rules.subjects);
    };

    /**
     * May this visitor do `action` to `subject`, according to the server's own rules?
     *
     * The one question every guard, nav entry and action button asks — never a role name, so it
     * stays true through any renaming or re-cutting of a role, and never a hand-written list of
     * "what an admin can do", which is the duplicate this whole mechanism exists to delete.
     *
     * Asks BOTH abilities rather than picking one by subject: a subject is declared in exactly one
     * scope (`shared/authorization-keys.yaml`), so at most one of them can ever answer yes, and
     * the alternative is a hand-maintained subject-to-scope table in this repo that would drift
     * from the one in that file. The two rule sets stay separate objects — this asks them in turn,
     * it does not merge them, which is what keeps a tenant rule from satisfying a platform key.
     *
     * Answers `false` for a signed-out visitor without consulting anything: a stranger's rules are
     * the `guest` role's, which is a value in the model, but nothing here is rendered for someone
     * the app has not identified yet.
     *
     * A subject nothing declares matches no rule and answers `false` — the fail-closed direction,
     * but in development it is also a LOUD one: {@link declaredSubjects} names the real set, so a
     * typo in a route's `meta.can` warns once in the console instead of just rendering an
     * unreachable page with no clue why.
     *
     * @param action - a CASL action: `read`, `create`, `update`, `delete`
     * @param subject - the CASL subject type the key names, e.g. `Product`, `WebhookSubscription`
     */
    const can = (action: PermissionAction, subject: string): boolean => {
        if (
            import.meta.env.DEV &&
            declaredSubjects.value.size > 0 &&
            !declaredSubjects.value.has(subject) &&
            !warnedSubjects.has(subject)
        ) {
            warnedSubjects.add(subject);
            warn(
                `[session] "${subject}" is not a subject any declared key names — check meta.can for a typo. Known subjects: ${[...declaredSubjects.value].toSorted().join(', ')}`
            );
        }

        return (
            Boolean(accessToken.value && viewer.value) &&
            (tenantAbility.value.can(action, subject) || platformAbility.value.can(action, subject))
        );
    };

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
     * **Awaited by whoever restores the session**, so a route guard asking {@link can} decides on
     * the rules rather than on the empty abilities that precede them — the redirect it would
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
            setAbilities();
            return Promise.resolve();
        }

        return apiGetMyAbilities()
            .then((answer) => {
                setAbilities(getPayloadFromResponse<Abilities>(answer));
            })
            .catch(() => undefined);
    };

    /**
     * The one refresh attempt in flight, or `undefined` between attempts — single-flight (several
     * requests failing with 401 in the same tick must share one `GET /account/refresh`, not fire
     * one each) and, unlike a generic `singleFlight` wrapper, inspectable: {@link logout} reads it
     * directly to wait out an attempt already running rather than starting a fresh one.
     */
    let refreshInFlight: Promise<string | undefined> | undefined;

    /**
     * Renews the in-memory access token using the httpOnly refresh cookie. Single-flight: a
     * caller arriving while a refresh is already running gets that SAME promise. Also the one
     * place a definitively dead refresh cookie (401/403) ends the session — a network error or a
     * 5xx stays non-fatal, since neither says the cookie itself is bad.
     *
     * Callers outside this module reach this through `http/refresh.ts`'s interceptor, which is
     * what makes THIS the single shared refresh attempt rather than a second one of its own — see
     * that module's own docblock.
     *
     * @returns A promise resolving with the fresh token, or `undefined` when the refresh failed,
     *  answered with none, or landed after a {@link clearSession} that makes it moot.
     */
    const refreshToken = (): Promise<string | undefined> => {
        if (!refreshInFlight) {
            // Captured before the request goes out, not read again after: this attempt answers
            // for the session as it was when it started, not as it is when the response lands.
            const epochAtStart = sessionEpoch.value;
            refreshInFlight = apiRefreshToken({
                _refreshed: true
            } as AxiosRequestConfigWithRetry)
                .then((data) => {
                    const token = getTokenFromResponse(data);
                    if (epochAtStart === sessionEpoch.value) setAccessToken(token);
                    return token;
                })
                .catch((error: AxiosError) => {
                    if (isDefinitiveAuthFailure(error) && epochAtStart === sessionEpoch.value)
                        signalExpired();
                    return undefined;
                })
                .finally(() => {
                    refreshInFlight = undefined;
                });
        }
        return refreshInFlight;
    };

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
                verifiedAt?: string | null;
            }>(data);
            return setViewer(
                payload && {
                    id: payload.id,
                    email: payload.email,
                    // `unverified`, not `customer` — same least-privileged fallback the backend
                    // resolves an absent role to (`account/module.ts`).
                    role: payload.role ?? 'unverified',
                    imageUrl: payload.imageUrl,
                    thumbnailUrl: payload.thumbnailUrl,
                    // Absent means unverified: the backend sends the field only once it's set.
                    verified: payload.verifiedAt != null
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
     * `PATCH /account` and get a 401. It is also what keeps `AppLanguageSwitcher` out of this store.
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
            ? // PATCH, not PUT (AUDIT_0924 D17d): this sends `{ locale }` alone, and a PUT's
              // every omitted field would be cleared instead (RFC 9110 §9.3.4).
              apiUpdateAccount({ locale })
                  .then(() => undefined)
                  .catch(() => undefined)
            : Promise.resolve();

    /**
     * Drops every trace of the session held here: token, viewer and the `isAuth` cookie, without
     * telling the other tabs — {@link clearSession} is the public action; this is the half a
     * cross-tab broadcast also needs, since re-broadcasting what arrived AS a broadcast would loop.
     *
     * Domain caches are NOT cleared from here — the account module resets its own on logout.
     */
    const clearSessionLocally = () => {
        accessToken.value = undefined;
        viewer.value = undefined;
        // Back to the empty abilities: a stranger's rules arrive with the next viewer, and until
        // they do the least-privileged answer is the right one.
        setAbilities();
        // The httpOnly jwt cookie can only be cleared server-side; isAuth/rememberMe are JS-accessible.
        clearCookie('isAuth');
        clearCookie('rememberMe');
        // A refresh that started before this must not act on its result once it lands — see
        // `refreshToken`'s own epoch check.
        sessionEpoch.value += 1;
    };

    const onBroadcast = (event: MessageEvent<unknown>) => {
        // Defensive, not just typed: this channel is a cross-tab boundary — another tab could be
        // running an older or newer build with a different message shape.
        if ((event.data as { type?: unknown } | undefined)?.type === 'logout')
            clearSessionLocally();
    };
    sessionChannel?.addEventListener('message', onBroadcast);
    // Each `createPinia()` (every test file, every HMR reload) re-runs this setup and would
    // otherwise pile another listener onto the one module-scoped channel.
    onScopeDispose(() => sessionChannel?.removeEventListener('message', onBroadcast));

    /**
     * Drops every trace of the session held here, and tells this browser's other tabs to do the
     * same  — logging out in one tab must not leave the others signed in with a token this
     * one already revoked.
     *
     * @returns Nothing; state is cleared as a side effect.
     */
    const clearSession = () => {
        clearSessionLocally();
        sessionChannel?.postMessage({ type: 'logout' });
    };

    /**
     * Ends the session the way it died on its own — a refresh that came back with a definitive
     * 401/403 (see {@link isDefinitiveAuthFailure}) — as opposed to an explicit
     * {@link logout}/{@link logoutAll}. Bumps {@link expiredSignal}, which is the only difference
     * from calling {@link clearSession} directly: the shell owes a "session expired" toast to a
     * visitor who did nothing wrong, never to one who just clicked "log out".
     */
    const signalExpired = () => {
        clearSession();
        expiredSignal.value += 1;
    };

    /**
     * Ends THIS session only: the refresh cookie's token is revoked server-side and local state is
     * cleared. Other devices keep their own tokens — `logoutAll` is the one that ends everything.
     *
     * Waits out an in-flight refresh first  — the server rotates the refresh cookie on every
     * renewal, and revoking too early can race a renewal already under way into leaving a rotated
     * cookie behind, unrevoked.
     *
     * Local state clears even when the API call fails (a network error, a 5xx): a visitor who
     * asked to sign out sees themselves signed out on THIS device regardless of whether the
     * server could be reached — the caller reports that failure, this store does not swallow it.
     *
     * @returns A promise resolving once the API call succeeds, or rejecting with its error —
     *  either way, after local state has already cleared.
     */
    const logout = () =>
        (refreshInFlight ?? Promise.resolve()).then(() => apiLogout()).finally(clearSession);

    /**
     * Ends every session for this visitor, server-side and locally. Same in-flight-refresh wait
     * and same fails-closed-on-local-state guarantee as {@link logout}.
     *
     * @returns A promise resolving once the API call succeeds, or rejecting with its error —
     *  either way, after local state has already cleared.
     */
    const logoutAll = () =>
        (refreshInFlight ?? Promise.resolve()).then(() => apiLogoutAll()).finally(clearSession);

    return {
        tenantAbility,
        platformAbility,
        declaredSubjects,
        setAbilities,
        can,
        accessToken,
        viewer,
        isAuth,
        expiredSignal,
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
