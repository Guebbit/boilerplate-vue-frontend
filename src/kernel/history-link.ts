/**
 * @module
 * The "History" link of a staff record page: the audit log filtered on that record
 * (`GET /audit?target=<id>`). The route is a sibling's, reached by name and only when the build
 * ships it (`linkIfRouted`); the caller must also be allowed to read it (`read:AuditLog`) — the
 * first says "is there an audit log", the second "may THIS visitor see it".
 */
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useSessionStore } from '@/infrastructure/session.ts';

/**
 * Builds the link a page's History button points at. Call it from `setup`.
 *
 * @param target - The record the history is about: its id, or its tag for a record keyed by one.
 *  Anything empty hides the button.
 * @returns A computed, locale-prefixed route location for the button's `:to`, or `undefined`
 *  while the button must stay hidden.
 */
export const useHistoryLink = (target: MaybeRefOrGetter<string | undefined>) => {
    /**
     * The router, for the `hasRoute` guard.
     */
    const router = useRouter();

    /**
     * The session, for `read:AuditLog`.
     */
    const session = useSessionStore();

    return computed(() => {
        const id = toValue(target);
        if (!id || !session.can('read', 'AuditLog')) return undefined;

        const link = linkIfRouted(router, 'AuditLog', undefined, { target: id });
        return link ? routerLinkI18n(link) : undefined;
    });
};
