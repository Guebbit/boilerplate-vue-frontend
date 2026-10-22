/**
 * @module
 * Remembers a signed-in visitor's language on their account. Best-effort and fire-and-forget: a
 * guest is a no-op and a failed write is invisible. Reads the session only for `isAuth`.
 */
import { updateAccount as apiUpdateAccount } from '@api';
import { useSessionStore } from '@/infrastructure/session.ts';

/**
 * Remembers a signed-in visitor's language choice on their account.
 *
 * A guest's choice lives in the URL (`/:locale/...`) and dies with the tab, which is the right
 * lifetime for someone with no record to write to; a signed-in visitor's account record is the
 * one place a preference outlives the tab.
 *
 * The `isAuth` check is here rather than at the call site because it is a rule about the
 * preference, not about the button — a caller that forgot it would send an anonymous
 * `PATCH /account` and get a 401.
 *
 * Best-effort: callers fire it without awaiting, and a failed write is invisible, leaving the
 * stored preference stale until the next switch. A toast about a preference nobody asked to be
 * told about is the worse trade.
 *
 * @param locale - Language tag the visitor just chose.
 * @returns Resolves once the write settles, or immediately for a guest. Never rejects.
 */
export const persistLocalePreference = (locale: string): Promise<void> =>
    useSessionStore().isAuth
        ? // PATCH, not PUT: this sends `{ locale }` alone, and a PUT's
          // every omitted field would be cleared instead (RFC 9110 §9.3.4).
          apiUpdateAccount({ locale })
              .then(() => undefined)
              .catch(() => undefined)
        : Promise.resolve();
