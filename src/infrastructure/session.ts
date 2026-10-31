/**
 * @module
 * Pinia store for the session/viewer pair that gates the app: what proves a session (an in-memory
 * access token in `jwt` mode, a flag over the HttpOnly cookie in `cookie` mode) plus a minimal
 * projection of who holds it, and the two CASL abilities every screen is gated on.
 * `isAuth` derives from session AND viewer together, never either alone, so a
 * restored-but-not-yet-identified session cannot be read as authenticated.
 *
 * Concerns, each its own block below: credential, viewer, abilities, idle timeout, cross-tab
 * sync, logout. The step-up re-proof (`reauth.ts`), the verification-mail resend
 * (`email-verification.ts`) and the language preference (`locale-preference.ts`) share no state
 * with them and live beside this file.
 *
 * Which of the two modes the deployment runs is read once from `GET /config` (`session`);
 * see `docs/tools/security.md`.
 */

import { ref, shallowRef, computed, onScopeDispose } from 'vue';
import { defineStore } from 'pinia';
import { deleteCookie, setCookie } from '@guebbit/js-toolkit';
import { BROWSER_STORAGE_NAME } from '@/infrastructure/browser-storage.ts';
import {
    getAccount as apiGetAccount,
    refreshToken as apiRefreshToken,
    logout as apiLogout,
    logoutAll as apiLogoutAll,
    touchSession as apiTouchSession
} from '@api';
import type { ActionOn, PermissionAction, PermissionSubject } from '@api/permission-vocabulary';
import { loadConfig } from '@/infrastructure/config.ts';
import { clearEtags } from '@/infrastructure/http/etag.ts';
import { asPassive } from '@/infrastructure/http/passive.ts';
import { createMongoAbility, type MongoAbility, type RawRuleOf } from '@casl/ability';
import { unpackRules, type PackRule } from '@casl/ability/extra';
import type {
    Abilities,
    SessionActivity,
    SessionConfig,
    SessionConfigMode,
    PackedRules
} from '@types';
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
    // Two shapes: the raw axios error, and the API's envelope that `onResponseReject` turns every
    // rejection into before a caller sees it — the real one, which carries `status` on top.
    const { response, status: envelopeStatus } = (error ?? {}) as Partial<AxiosError> & {
        status?: number;
    };
    const status = response?.status ?? envelopeStatus;
    return status === 401 || status === 403;
};

/**
 * Turns one scope's packed rules — the `abilities` wire shape — into the CASL
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
const unpackAbilityRules = (packed: PackedRules): RawRuleOf<SessionAbility>[] =>
    unpackRules(packed as PackRule<RawRuleOf<SessionAbility>>[]);

/**
 * The ability the store holds: CASL's own typing (an action and a subject), narrowed to the
 * backend's closed lists. A misspelled pair is a compile error; the pair map narrows further, in
 * {@link RoutePermission} and `can()`.
 * https://casl.js.org/v6/en/advanced/typescript
 */
type SessionAbility = MongoAbility<[PermissionAction, PermissionSubject]>;

/**
 * The concrete actions a screen may ask about — generated from `actions:` in the backend's
 * `shared/authorization-keys.yaml`, which `sync:frontend` hands over. `manage` is deliberately
 * absent: no key declares it and there is no wildcard to expand into one, so asking for it always
 * answers no. A screen asks for the action it actually performs.
 */
export type { ActionOn, PermissionAction, PermissionSubject } from '@api/permission-vocabulary';

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
     * The staff role they hold inside the shop, by name — `manager`, `warehouse`, `support`,
     * `admin`, or one a deployment added. Absent for a plain customer: `customer` and
     * `unverified` are computed by the server from `verified`, never stored.
     *
     * Read by the route guards, so it is the one field here that decides what is RENDERED rather
     * than describing a person. It decides nothing else: the server re-evaluates every request,
     * and a client that believed itself an admin would still be refused.
     */
    role?: string;
    /**
     * The visitor's own picture, for the avatar the account menu wears — the shell renders it on
     * every page, so it is one of the few user fields the shell genuinely needs rather than one
     * the account module could keep to itself.
     */
    imageUrl?: string;
    /**
     * The small variant of {@link imageUrl}, shown as the avatar's first-paint tier. Absent for a
     * remote image or while a digest job is still pending.
     */
    thumbnailUrl?: string;
    /**
     * Whether the address on file has been proven — `verifiedAt` being set on the record. The one
     * field here read by something OTHER than a route guard: `AppVerificationBanner` keys on it
     * directly, deliberately not on a shop permission (an unverified operator on a platform-only
     * site must see it too).
     *
     * Optional rather than required: every real projection (`loadViewer`, `publishViewer`) always
     * sets it, but widening it to required would force `verified: true` onto every other module's
     * `SessionViewer` test double, most of which have nothing to do with verification. `!viewer.verified` reads a missing value as unverified, which is
     * the fail-safe direction for a fixture that never set it on purpose.
     */
    verified?: boolean;
}

/**
 * Applies a login's "remember me" choice to the `rememberMe` marker, this app's one JS-written
 * session cookie: `true` (re)starts it for as long as the "remember me" tier lasts, `false` removes it, `undefined` (a silent
 * refresh, a re-proof) keeps whatever marker login left.
 *
 * `Secure` follows the page's scheme rather than a build flag: a `Secure` cookie is silently
 * dropped on plain HTTP, which would break the local dev server.
 *
 * @param remember - The visitor's choice, when the caller knows it.
 * @param days - How long the tier lasts, from the session config; unknown until that read lands,
 *  and the marker is then a browser-session cookie.
 */
const applyRememberChoice = (remember?: boolean, days?: number) => {
    // js-toolkit `setCookie(name, value, options)`: `days` = lifetime, `path: '/'` = site-wide,
    // `sameSite: 'Lax'` = sent on top-level navigations only.
    if (remember === true)
        setCookie(BROWSER_STORAGE_NAME.rememberMe, 'true', {
            days,
            path: '/',
            secure: location.protocol === 'https:',
            sameSite: 'Lax'
        });
    else if (remember === false) deleteCookie(BROWSER_STORAGE_NAME.rememberMe);
};

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
     * How this deployment keeps people signed in, once {@link loadSessionMode} has answered.
     * `undefined` until then, read as `jwt` (the default) by everything that branches on it.
     */
    const mode = ref<SessionConfigMode>();

    /**
     * What the deployment's session config states about lifetimes, once {@link loadSessionMode}
     * has answered: seconds per "remember me" tier, and the staff cap when there is one.
     */
    const lifetimes = ref<Pick<SessionConfig, 'lifetimeSeconds' | 'staffLifetimeSeconds'>>();

    /**
     * How many days the longest "remember me" tier lasts, rounded up; `undefined` until the
     * session config has been read.
     */
    const rememberDays = (): number | undefined =>
        lifetimes.value && Math.ceil(lifetimes.value.lifetimeSeconds.long / 86_400);

    /**
     * Whether a `cookie`-mode session is believed to be open. The credential is an HttpOnly cookie
     * no script can read, so this flag is the client's own record that one was granted — set at
     * login, cleared with the session. Never set in `jwt` mode, where the token is the record.
     */
    const cookieSession = ref(false);

    /**
     * Whether a session is held, in whichever mode the deployment runs.
     */
    const hasSession = computed(() => Boolean(accessToken.value) || cookieSession.value);

    /**
     * Derives from session AND viewer, not either alone: a session with no viewer is one that has
     * been restored but not yet identified, and treating it as authenticated lets a guard admit
     * someone whose role is still unknown.
     */
    const isAuth = computed(() => hasSession.value && Boolean(viewer.value));

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
     * The staff idle clock, from the server's own numbers: how long the session may sit unused
     * and when it last saw a request (this client's epoch milliseconds). `undefined` for a
     * shopper, whose session never idles out, and until the first answer lands.
     */
    const idle = ref<{ timeoutMs: number; lastActiveAt: number }>();

    /**
     * Bumped when the session ended for inactivity — the server answered `SESSION_IDLE`, or the
     * clock ran out here first. `LayoutDefault.vue` turns it into its own toast and a redirect.
     */
    const idleSignal = ref(0);

    /**
     * The rules the SERVER enforces, unpacked from the server's `abilities` — one ability per
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
    const tenantAbility = shallowRef<SessionAbility>(createMongoAbility<SessionAbility>());

    /** The caller's rules over the INSTALLATION — health, metrics, the operational audit. Empty for almost everyone. */
    const platformAbility = shallowRef<SessionAbility>(createMongoAbility<SessionAbility>());

    /**
     * The tenant roles this caller may assign through the user writes, as last published by
     * the `abilities` answer — computed by the server's own grant rule, so a role picker built
     * from it offers what the write accepts. Emptied with the rest of the abilities. No authority:
     * the write is re-checked.
     */
    const grantableRoles = ref<string[]>([]);

    /**
     * Whether the caller holds a staff role that grants nothing yet, because no authenticator app is
     * armed — as last published in the `abilities`. The rules above are then the account's
     * customer ones; the shell shows an "enrol to use your staff tools" prompt. Emptied with the rest.
     */
    const secondFactorRequired = ref(false);

    /**
     * Replace both rule sets wholesale with what the server just published.
     *
     * @param rules - the `abilities` the server published (on `GET /account`, a sign-in or a
     *  refresh): the two packed-rule lists, the grantable roles and the second-factor flag; omit
     *  `tenant`/`platform` to empty them
     */
    const setAbilities = (
        rules: Pick<
            Partial<Abilities>,
            'tenant' | 'platform' | 'grantableRoles' | 'secondFactorRequired'
        > = {}
    ) => {
        tenantAbility.value = createMongoAbility<SessionAbility>(
            unpackAbilityRules(rules.tenant ?? [])
        );
        platformAbility.value = createMongoAbility<SessionAbility>(
            unpackAbilityRules(rules.platform ?? [])
        );
        grantableRoles.value = rules.grantableRoles ?? [];
        secondFactorRequired.value = rules.secondFactorRequired ?? false;
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
     * A subject nothing declares matches no rule and answers `false` — the fail-closed direction.
     *
     * @param action - a CASL action: `read`, `create`, `update`, `delete`
     * @param subject - the CASL subject type the key names, e.g. `Product`, `WebhookSubscription`
     */
    const can = <TSubject extends PermissionSubject>(
        action: ActionOn<TSubject>,
        subject: TSubject
    ): boolean => {
        return (
            isAuth.value &&
            (tenantAbility.value.can(action, subject) || platformAbility.value.can(action, subject))
        );
    };

    /**
     * Records a freshly issued token.
     *
     * The `isAuth` hint cookie is the backend's: it sets it beside the session cookie with the
     * same lifetime, so the two always expire together. This store only reads it (to decide
     * whether a restore is worth attempting) and clears it on sign-out.
     *
     * @param token - Access token from a login or refresh response.
     * @param remember - Whether to (re)start the `rememberMe` marker. `true`/`false` at
     *  login, when the caller knows the visitor's choice; omitted on a silent refresh, which
     *  keeps whatever marker login left.
     */
    const setAccessToken = (token?: string, remember?: boolean) => {
        accessToken.value = token;
        applyRememberChoice(remember, rememberDays());
    };

    /**
     * Records that a `cookie`-mode session was granted.
     *
     * The counterpart of {@link setAccessToken} for a deployment whose credential never reaches
     * script: nothing to store but the fact. The backend's `isAuth` hint cookie is what lets the
     * restore guard ask `GET /account` after a reload, instead of guessing.
     *
     * @param remember - As for {@link setAccessToken}: the login's "remember me" choice, omitted
     *  where the caller does not know it (a re-proof), which keeps whatever marker login left.
     */
    const startCookieSession = (remember?: boolean) => {
        cookieSession.value = true;
        applyRememberChoice(remember, rememberDays());
    };

    /**
     * Adopts the session a login-shaped response (login, 2FA, re-proof, password change) opened,
     * in whichever mode the deployment runs: the access token in `jwt` mode, the granted cookie in
     * `cookie` mode. The one door every such response goes through, so no caller asks which mode.
     *
     * @param response - The login-shaped answer: carries the access token in `jwt` mode.
     * @param remember - The login's "remember me" choice; omitted on a re-proof.
     */
    const adoptSession = (response: { token?: string } | undefined, remember?: boolean) => {
        if (mode.value === 'cookie') startCookieSession(remember);
        else setAccessToken(response?.token, remember);
        // A sign-in (it names a "remember me" choice) replaces the browser-wide session: every
        // other tab must re-read who it is, not keep acting as the person it was. A re-proof
        // keeps the same person, so it says nothing.
        if (remember !== undefined) sessionChannel?.postMessage({ type: 'login' });
    };

    /**
     * Reads how this deployment keeps people signed in, once per tab, from the public config
     * (`GET /config`, shared with every other reader of it). A failed read is dropped and retried
     * on the next call; until it lands the store behaves as `jwt`, the default, so an unreachable
     * backend never invents a cookie session.
     *
     * @returns A promise that always resolves, once {@link mode} is known or the read failed.
     */
    const loadSessionMode = (): Promise<void> =>
        loadConfig().then((config) => {
            if (!config) return;
            mode.value = config.session.mode;
            lifetimes.value = {
                lifetimeSeconds: config.session.lifetimeSeconds,
                staffLifetimeSeconds: config.session.staffLifetimeSeconds
            };
        });

    /**
     * Bumped each time {@link reloadAbilities} lands new rules. `LayoutDefault.vue` watches it to
     * re-check the page on screen against them; the first load with a viewer does not bump it
     * (the route guard has not even run yet).
     */
    const abilitiesSignal = ref(0);

    /**
     * The one abilities read in flight, or `undefined` between reads — single-flight, so a burst
     * of 403s costs one `GET /account`.
     */
    let abilitiesInFlight: Promise<void> | undefined;

    /**
     * Re-reads the rules the server enforces, from `GET /account`, without touching the viewer.
     * Called when the rules may have moved under a live session: after a 403 (a role was taken
     * away). It changes rendering only; the server stays the authority. Sent passive, so the
     * re-read is not counted as the person acting.
     *
     * Fails quietly and keeps the rules it already has: a read that cannot land must not grey out
     * a menu the visitor is still entitled to. A read issued with no viewer is skipped.
     *
     * @returns A promise resolving once the read has settled. Never rejects.
     */
    const reloadAbilities = (): Promise<void> => {
        if (!viewer.value) return Promise.resolve();
        abilitiesInFlight ??= apiGetAccount(asPassive())
            .then((answer) => {
                setAbilities(answer.abilities);
                abilitiesSignal.value += 1;
            })
            .catch(() => undefined)
            .finally(() => {
                abilitiesInFlight = undefined;
            });
        return abilitiesInFlight;
    };

    /**
     * Records the idle clock the server answered: from `GET /account`, a sign-in or a touch.
     *
     * @param activity - the server's clock; `idleTimeoutSeconds` is absent for a shopper, whose
     *  session never idles out
     */
    const applyActivity = (activity: SessionActivity) => {
        idle.value = activity.idleTimeoutSeconds
            ? {
                  timeoutMs: activity.idleTimeoutSeconds * 1000,
                  lastActiveAt: Date.parse(activity.lastActiveAt)
              }
            : undefined;
        if (idle.value) sessionChannel?.postMessage({ type: 'activity', at: Date.now() });
    };

    /**
     * Records who the token belongs to, with what they may do and their idle clock — the three the
     * server answers together (`GET /account`, a sign-in).
     *
     * The three travel together on purpose: a viewer without rules is a shell that hides every
     * control the visitor is entitled to, and the rules are the server's rather than derived from
     * `role` because only the server's own rules say what a name allows.
     *
     * @param nextViewer - The claims projection, or `undefined` to forget it (which also empties
     *  the abilities).
     * @param answer - The `abilities` and `activity` that came with it. Omitted where the answer
     *  carries none (a profile write): the rules already held stay.
     */
    const setViewer = (
        nextViewer?: SessionViewer,
        answer?: { abilities: Abilities; activity: SessionActivity }
    ) => {
        viewer.value = nextViewer;
        if (!nextViewer) {
            setAbilities();
            return;
        }
        if (!answer) return;
        setAbilities(answer.abilities);
        applyActivity(answer.activity);
    };

    /**
     * The one refresh attempt in flight, or `undefined` between attempts — single-flight (several
     * requests failing with 401 in the same tick must share one `POST /account/refresh`, not fire
     * one each) and, unlike a generic `singleFlight` wrapper, inspectable: {@link logout} reads it
     * directly to wait out an attempt already running rather than starting a fresh one.
     */
    let refreshInFlight: Promise<string | undefined> | undefined;

    /**
     * Renews the in-memory access token using the httpOnly refresh cookie (`jwt` mode only; in
     * `cookie` mode it answers `undefined` without a request). Single-flight: a
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
        // `POST /account/refresh` is a 404 in `cookie` mode: there is no token to renew.
        if (mode.value === 'cookie') return Promise.resolve(undefined);
        if (!refreshInFlight) {
            // Captured before the request goes out, not read again after: this attempt answers
            // for the session as it was when it started, not as it is when the response lands.
            const epochAtStart = sessionEpoch.value;
            refreshInFlight = apiRefreshToken(
                asPassive({ _refreshed: true } as AxiosRequestConfigWithRetry)
            )
                .then((data) => {
                    const { token, abilities } = data;
                    if (epochAtStart === sessionEpoch.value) {
                        setAccessToken(token);
                        // The rules may have moved while the old token lived, and the answer
                        // carries them. The first restore has no viewer yet and reads them with
                        // `loadViewer` instead.
                        if (viewer.value) {
                            setAbilities(abilities);
                            abilitiesSignal.value += 1;
                        }
                    }
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
     * Turns the session cookies the server already set (signup, an OAuth redirect, a reload) into
     * a session this tab holds: a refresh in `jwt` mode, nothing to ask in `cookie` mode, where the
     * cookie is the credential and the next request proves it. A dead cookie shows up as a 401
     * on that request, which ends the session there.
     *
     * @returns A promise resolving once the tab holds a session, or the attempt failed quietly —
     *  including when the deployment's mode could not be read, which leaves the hint cookie for
     *  the next attempt.
     */
    const restoreFromCookies = (): Promise<void> =>
        // A mode that is still unknown is asked again, never assumed `jwt`: that refresh is a 404
        // in a cookie deployment, and the answer to it ends a login that was perfectly good.
        (mode.value === undefined ? loadSessionMode() : Promise.resolve()).then(() => {
            if (mode.value === undefined) return;
            if (mode.value !== 'cookie') return refreshToken().then(() => undefined);
            startCookieSession();
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
            setViewer(
                {
                    id: data.id,
                    email: data.email,
                    // Absent for a plain customer: only a staff role is ever stored.
                    role: data.role,
                    imageUrl: data.imageUrl,
                    thumbnailUrl: data.thumbnailUrl,
                    // Absent means unverified: the backend sends the field only once it's set.
                    verified: data.verifiedAt !== undefined
                },
                data
            );
            return data;
        });

    /**
     * Drops every trace of the session held here: token, viewer and the `isAuth` cookie, without
     * telling the other tabs — {@link clearSession} is the public action; this is the half a
     * cross-tab broadcast also needs, since re-broadcasting what arrived AS a broadcast would loop.
     *
     * Domain caches are NOT cleared from here — the account module resets its own on logout.
     */
    const clearSessionLocally = () => {
        accessToken.value = undefined;
        cookieSession.value = false;
        viewer.value = undefined;
        // Back to the empty abilities: a stranger's rules arrive with the next viewer, and until
        // they do the least-privileged answer is the right one.
        setAbilities();
        // The record versions the last person read are theirs; the next one must not send them.
        clearEtags();
        idle.value = undefined;
        // The httpOnly jwt cookie can only be cleared server-side; isAuth/rememberMe are JS-accessible.
        // js-toolkit `deleteCookie(name)`: rewrites it already expired on `path=/`, where both live.
        deleteCookie(BROWSER_STORAGE_NAME.isAuth);
        deleteCookie(BROWSER_STORAGE_NAME.rememberMe);
        // A refresh that started before this must not act on its result once it lands — see
        // `refreshToken`'s own epoch check.
        sessionEpoch.value += 1;
    };

    /**
     * Records that the session saw a request at `at`, without telling the other tabs.
     *
     * @param at - epoch milliseconds
     */
    const markActive = (at: number) => {
        if (idle.value) idle.value = { ...idle.value, lastActiveAt: at };
    };

    /**
     * Records that THIS tab just made a request the server counts as the person acting, and tells
     * the other tabs: they share one session, so one idle clock. Called by the request interceptor
     * for every request that is not marked passive.
     */
    const noteActivity = () => {
        if (!idle.value) return;
        const at = Date.now();
        markActive(at);
        sessionChannel?.postMessage({ type: 'activity', at });
    };

    /**
     * Counts the session as active and reads its idle clock — the "still there?" answer. A failure
     * is quiet: the clock then stays as it was, and the server's own `SESSION_IDLE` is the
     * authority either way.
     *
     * @returns A promise resolving once the clock reflects the server's answer.
     */
    const touchSession = (): Promise<void> =>
        apiTouchSession()
            .then(applyActivity)
            // Quiet: the clock stays as it was.
            .catch(() => undefined);

    /**
     * Takes up the session another tab just opened: renews the token or the cookie marker from
     * what the browser now holds, then replaces the viewer. A failure is quiet — the next request
     * answers 401 and the usual expiry path ends the session.
     *
     * @returns A promise resolving once the viewer reflects the shared session.
     */
    const rereadSession = (): Promise<void> =>
        restoreFromCookies()
            .then(() => (hasSession.value ? loadViewer() : undefined))
            .then(() => undefined)
            .catch(() => undefined);

    /**
     * Reacts to another tab's broadcast: a `login` re-reads the shared session, a `logout`
     * clears this tab's session locally without echoing the message back, so two tabs cannot
     * ping-pong it.
     */
    const onBroadcast = (event: MessageEvent<unknown>) => {
        // Defensive, not just typed: this channel is a cross-tab boundary — another tab could be
        // running an older or newer build with a different message shape.
        const message = event.data as { type?: unknown; at?: unknown } | undefined;
        if (message?.type === 'logout') clearSessionLocally();
        // Another tab signed in: the shared session is now that person's, so this tab re-reads it.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- rereadSession never rejects (a failed re-read is dropped)
        if (message?.type === 'login') void rereadSession();
        // Another tab acted: the server's one idle clock is shared by every tab of this session.
        if (message?.type === 'activity' && typeof message.at === 'number') markActive(message.at);
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
     * Ends the session the way the idle timeout does: like {@link signalExpired}, but the shell
     * owes the visitor a different sentence — they were not logged out by a fault.
     */
    const signalIdle = () => {
        clearSession();
        idleSignal.value += 1;
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
        grantableRoles,
        secondFactorRequired,
        setAbilities,
        can,
        accessToken,
        mode,
        lifetimes,
        hasSession,
        viewer,
        isAuth,
        expiredSignal,
        idle,
        idleSignal,
        noteActivity,
        touchSession,
        setAccessToken,
        startCookieSession,
        adoptSession,
        loadSessionMode,
        setViewer,
        abilitiesSignal,
        reloadAbilities,
        refreshToken,
        restoreFromCookies,
        loadViewer,
        clearSession,
        signalExpired,
        signalIdle,
        logout,
        logoutAll
    };
});
