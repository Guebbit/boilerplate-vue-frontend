/**
 * @module
 * The four read-only labels both user pages (`User.vue`, `UserEdit.vue`) show about the routed
 * record: hero heading, hero subheading, role chip and status chip. Pure `computed`s over the
 * loaded user, so each page keeps its own store read and only the wording lives here once.
 */
import { computed } from 'vue';
import type { Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { User } from '@types';
import { formatFlag, formatText } from '@/infrastructure/utils/formatters.ts';

/**
 * Labels for the routed user, ready to bind.
 *
 * @param user - The loaded user; `undefined` while it loads.
 * @param id - Getter for the route id, the heading while the record loads (a getter so a
 *  destructured prop stays reactive).
 * @param fallbackTitleKey - Translation key of the page's own title, the heading's last resort.
 * @returns `heroTitle`, `heroDescription`, `userRole` and `userStatus`.
 */
export const useUserSummary = (
    user: Ref<User | undefined>,
    id: () => string | undefined,
    fallbackTitleKey: string
) => {
    /** Translation function. */
    const { t } = useI18n();

    /** Hero heading: the username, the route id while loading, then the page title. */
    const heroTitle = computed(() => user.value?.username ?? id() ?? t(fallbackTitleKey));

    /** Hero subheading: the email, or the empty-value glyph when unknown. */
    const heroDescription = computed(() => formatText(user.value?.email));

    /**
     * Role chip: the role's own name, untranslated. Roles are data a deployment may add to, and
     * only the rules say what each one may do.
     */
    const userRole = computed(() => formatText(user.value?.role));

    /** Status chip: localized enabled/disabled, or the empty-value glyph while unknown. */
    const userStatus = computed(() =>
        formatFlag(user.value?.active, t('generic.enabled'), t('generic.disabled'))
    );

    return { heroTitle, heroDescription, userRole, userStatus };
};
