<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'PurchaseHoldNotice'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Tells the signed-in buyer that checkout is paused for their account: why, until when, the note
 * staff left for them, and how to contest it (GDPR Art. 22(3)). Renders nothing while no hold is
 * in force. It reads the buyer's own record, so a page mounting it needs no hold logic of its own;
 * the cart raises `refreshSignal` after a refused checkout so the reason appears at once.
 */
import { computed, onMounted, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { useProfileStore } from '../stores/profile.ts';

/**
 * `refreshSignal`: a counter the page raises to ask for a reload of the record (after a checkout
 * the hold refused). Any change reloads; its value means nothing.
 */
const props = defineProps<{ refreshSignal?: number }>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The router, to ask whether this build ships a contact page (the `feedback` module's).
 */
const router = useRouter();

/**
 * The profile store; its `profile` carries the hold while one is in force.
 */
const profileStore = useProfileStore();
const { profile } = storeToRefs(profileStore);

/**
 * The hold in force, or `undefined`. The API leaves an ended hold out of the record; the date is
 * checked again because the record may be older than the page.
 */
const hold = computed(() => {
    const current = profile.value?.purchaseHold;
    return current && new Date(current.until).getTime() > Date.now() ? current : undefined;
});

/**
 * Whether the "contact us" link has somewhere to go.
 */
const hasContact = computed(() => router.hasRoute('Contact'));

/**
 * Reloads the record from the API, bypassing the cache, whenever the page raises the signal.
 */
watch(
    () => props.refreshSignal,
    () => {
        void profileStore.fetchProfile(true).catch(() => undefined);
    }
);

/**
 * Loads the record once, from the cache when it is already there.
 */
onMounted(() => {
    void profileStore.fetchProfile().catch(() => undefined);
});
</script>

<template>
    <v-alert
        v-if="hold"
        type="warning"
        variant="tonal"
        data-test="purchase-hold-notice"
        class="lg:col-span-2"
    >
        <p class="font-semibold">{{ t('purchase-hold-notice.title') }}</p>
        <p class="mt-1">
            {{
                t(`purchase-hold-notice.reason-${hold.reason}`, {
                    date: formatDateTime(hold.until)
                })
            }}
        </p>
        <p v-if="hold.note" class="mt-1" data-test="purchase-hold-note">{{ hold.note }}</p>
        <p class="mt-1">{{ t('purchase-hold-notice.still-allowed') }}</p>
        <p class="mt-1">
            {{ t('purchase-hold-notice.contest') }}
            <RouterLink
                v-if="hasContact"
                :to="routerLinkI18n({ name: 'Contact' })"
                data-test="purchase-hold-contact"
            >
                {{ t('purchase-hold-notice.contact-us') }}
            </RouterLink>
        </p>
    </v-alert>
</template>
