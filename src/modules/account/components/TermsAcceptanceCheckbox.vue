<script setup lang="ts">
/**
 * @module
 * The unticked "I accept the Terms and have read the privacy notice" box. Shared by the signup
 * page and the password-reset page, which asks for it when the account holds no Terms record (the
 * setup page of a staff-created account). The holder's own tick is the record; nothing here
 * pre-ticks it. Attributes (`data-test`, the field-error props) fall through to the checkbox.
 */
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { routerLinkI18n } from '@/i18n/router-link.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Whether the box is ticked (`v-model`).
 */
const accepted = defineModel<boolean>({ default: false });
</script>

<template>
    <v-checkbox v-model="accepted">
        <!-- `i18n-t` interpolates the two links into the translated sentence; `@click.stop`
                 keeps a link click from also toggling the checkbox, since Vuetify makes the
                 whole label clickable. -->
        <template #label>
            <i18n-t keypath="signup-page.text-terms" tag="span">
                <template #terms>
                    <RouterLink
                        :to="routerLinkI18n({ name: 'StaticTerms' })"
                        class="underline"
                        @click.stop
                    >
                        {{ t('static-pages.terms.title') }}
                    </RouterLink>
                </template>
                <template #privacy>
                    <RouterLink
                        :to="routerLinkI18n({ name: 'StaticPrivacy' })"
                        class="underline"
                        @click.stop
                    >
                        {{ t('static-pages.privacy.title') }}
                    </RouterLink>
                </template>
            </i18n-t>
        </template>
    </v-checkbox>
</template>
