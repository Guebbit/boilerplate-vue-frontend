<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'AppStaffEnrollmentBanner'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The "set up an authenticator app" banner, mounted in the shell so it rides EVERY page: a staff
 * role grants nothing until one is armed, so the staff menu is simply absent and the person needs
 * to be told why and where to go. Keys on the server's own answer (`secondFactorRequired` on
 * `GET /account/abilities`), never on a role name.
 */
import { storeToRefs } from 'pinia';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/infrastructure/session.ts';
import { routerLinkI18n } from '@/i18n/router-link.ts';

/**
 * Translator for the banner's own copy.
 */
const { t } = useI18n();

/**
 * Whether the signed-in visitor holds a staff role that is waiting for an authenticator app.
 */
const { viewer, secondFactorRequired } = storeToRefs(useSessionStore());
</script>

<template>
    <v-alert
        v-if="viewer && secondFactorRequired"
        type="warning"
        variant="tonal"
        density="compact"
        class="rounded-none"
        data-test="staff-enrollment-banner"
    >
        {{ t('staff-enrollment-banner.message') }}
        <template #append>
            <v-btn
                variant="text"
                size="small"
                data-test="staff-enrollment-go"
                :to="routerLinkI18n({ name: 'Profile' })"
                :component="RouterLink"
            >
                {{ t('staff-enrollment-banner.button') }}
            </v-btn>
        </template>
    </v-alert>
</template>
