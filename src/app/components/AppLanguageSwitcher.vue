<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Check, Languages } from 'lucide-vue-next';
import { updateAccount as apiUpdateAccount } from '@api';
import { changeLanguage, supportedLanguages } from '@/infrastructure/i18n.ts';
import { useSessionStore } from '@/infrastructure/session.ts';

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();
const { isAuth } = storeToRefs(useSessionStore());

/**
 * Switches the app language and re-enters the current route under the new locale.
 *
 * Two audiences, two lifetimes. For a GUEST the choice lives in the URL (`/:locale/...`), which
 * the router's own guard reads — the browser-negotiated default fills in when no segment says
 * otherwise. For a SIGNED-IN visitor the choice also lands on their account (`PUT /account
 * { locale }`), because their record is the one place a preference outlives the tab: the next
 * login reads it back and re-applies it. Best-effort and fire-and-forget — a failed write must
 * not un-switch the page the visitor is looking at.
 *
 * Written through the generated client rather than the account store: the shell deliberately
 * addresses the account module by route NAME only (see `hasSignIn` in `AppNavigation`), so a
 * build without that module keeps a working switcher whose PUT simply answers 404 into the
 * `catch` below.
 *
 * @param newLocale - Locale code picked by the user, e.g. `it`.
 * @returns A promise resolving once the router settles: on the same route with
 *  the new locale, or on `/` (locale recalculated) if that navigation fails.
 */
function switchLanguage(newLocale: string) {
    if (isAuth.value) void apiUpdateAccount({ locale: newLocale }).catch(() => undefined);
    return Promise.resolve(
        // change language
        changeLanguage(newLocale)
            // then change route, according to new Locale
            .then(() =>
                router.replace({
                    params: {
                        ...route.params,
                        locale: newLocale
                    },
                    query: route.query
                })
            )
            // if it fails: go home (with locale recalc)
            .catch(() => router.push('/'))
    );
}
</script>

<template>
    <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
            <v-btn
                v-bind="menuProps"
                variant="text"
                class="px-2"
                :aria-label="t('navigation.label-language')"
            >
                <Languages :size="18" class="mr-1" aria-hidden="true" />
                {{ locale.toUpperCase() }}
            </v-btn>
        </template>

        <v-list density="compact" :aria-label="t('navigation.label-language')">
            <v-list-item
                v-for="sLocale in supportedLanguages"
                :key="`locale-${sLocale}`"
                :active="locale === sLocale"
                color="primary"
                @click="switchLanguage(sLocale)"
            >
                <v-list-item-title>{{ t(`generic.${sLocale}`) }}</v-list-item-title>
                <template #append>
                    <Check v-if="locale === sLocale" :size="16" aria-hidden="true" />
                </template>
            </v-list-item>
        </v-list>
    </v-menu>
</template>
