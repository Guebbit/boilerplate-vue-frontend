<script setup lang="ts">
/**
 * @module
 * Language-switcher menu for the app bar. The switch itself, and the choices' labels, are
 * `use-language-switch.ts`: the phone drawer lists the same choices.
 */
import { ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { useI18n } from 'vue-i18n';
import { Check, Languages } from 'lucide-vue-next';
import { useLanguageSwitch } from '@/app/components/use-language-switch.ts';

/**
 * Translator, for the labels this menu owns.
 */
const { t } = useI18n();

/**
 * The language choices, the active one and the switch itself.
 */
const { languages, locale, choiceLabel, switchLanguage } = useLanguageSwitch();

/**
 * Whether `v-menu` currently considers itself open — see `AppNavMenu.vue`'s own copy of this
 * guard for why {@link focusFirstItemOnOpen} checks it before moving focus.
 */
const menuOpen = ref(false);

/**
 * The rendered `v-list`, queried for its first `menuitem` once the menu has fully opened.
 */
const listElement = ref<ComponentPublicInstance | null>(null);

/**
 * WAI-ARIA APG menu-button pattern: opening a menu (by click, Enter, Space or an arrow key)
 * moves focus onto its first item. See `AppNavMenu.vue`'s own copy of this fallback for the full
 * reasoning — the two menus share no component to hang a single implementation off.
 * https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
 */
const focusFirstItemOnOpen = () => {
    if (!menuOpen.value) return;
    // `$el` is typed loosely on a component instance; this ref only ever points at the `v-list`
    // below, which always renders a real element.
    const content = listElement.value?.$el as HTMLElement | undefined;
    if (!content || content.contains(document.activeElement)) return;
    content.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
};
</script>

<template>
    <v-menu v-model="menuOpen" location="bottom end" @after-enter="focusFirstItemOnOpen">
        <template #activator="{ props: menuProps }">
            <!--
                The accessible name contains the visible text (WCAG 2.5.3): a voice-control user
                says what they see, and "Language" alone would not match a button reading "EN".
            -->
            <v-btn
                v-bind="menuProps"
                variant="text"
                class="hidden px-2 sm:inline-flex"
                data-test="language-switcher"
                :aria-label="`${t('navigation.label-language')}: ${locale.toUpperCase()}`"
            >
                <Languages :size="18" class="mr-1" aria-hidden="true" />
                {{ locale.toUpperCase() }}
            </v-btn>
        </template>

        <!-- A menu of actions, not a listbox: picking one switches the language and closes it. -->
        <v-list
            ref="listElement"
            density="compact"
            role="menu"
            :aria-label="t('navigation.label-language')"
        >
            <v-list-item
                v-for="sLocale in languages"
                :key="`locale-${sLocale}`"
                role="menuitem"
                :lang="sLocale"
                :active="locale === sLocale"
                :aria-current="locale === sLocale ? 'true' : undefined"
                color="primary"
                :data-test="`language-option-${sLocale}`"
                @click="switchLanguage(sLocale)"
            >
                <v-list-item-title>{{ choiceLabel(sLocale) }}</v-list-item-title>
                <template #append>
                    <Check v-if="locale === sLocale" :size="16" aria-hidden="true" />
                </template>
            </v-list-item>
        </v-list>
    </v-menu>
</template>
