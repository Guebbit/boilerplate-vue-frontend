<template>
    <LayoutDefault id="user-target" class="item-detail-page item-detail-page-user">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('user-target-page.page-title') }}</span>
            </h1>
        </template>

        <section class="item-detail-page-content">
            <div class="item-detail-page-grid-top">
                <DetailCard class="item-detail-page-hero animate-on-hover">
                    <div class="item-detail-page-hero-icon" aria-hidden="true">👤</div>
                    <div>
                        <p v-if="currentUser?.id" class="item-detail-page-eyebrow">{{ currentUser.id }}</p>
                        <h2 class="item-detail-page-hero-title">{{ heroTitle }}</h2>
                        <p class="item-detail-page-hero-description">{{ heroDescription }}</p>
                    </div>
                </DetailCard>

                <div class="item-detail-page-stats">
                    <MaterialStatCard
                        :title="t('user-target-page.label-email')"
                        :value="formatText(currentUser?.email)"
                    />
                    <MaterialStatCard :title="t('user-target-page.label-admin')" :value="userRole" accent="secondary" />
                    <MaterialStatCard
                        :title="t('user-target-page.label-active')"
                        :value="userStatus"
                        accent="tertiary"
                    />
                </div>
            </div>

            <div class="item-detail-page-grid-main item-detail-page-grid-main-with-aside">
                <DetailCard class="item-detail-page-main">
                    <div class="item-detail-page-section-header">
                        <h3>{{ t('generic.details') }}</h3>
                    </div>

                    <div v-if="currentUser" class="item-detail-page-grid-fields">
                        <ItemDetailField :label="t('user-target-page.label-id')" :value="currentUser.id" icon="#" />
                        <ItemDetailField
                            :label="t('user-target-page.label-username')"
                            :value="currentUser.username"
                            icon="🙂"
                        />
                        <ItemDetailField :label="t('user-target-page.label-email')" :value="currentUser.email" icon="✉" />
                        <ItemDetailField :label="t('user-target-page.label-admin')" icon="🛡">
                            <span class="item-detail-page-status-chip">{{ userRole }}</span>
                        </ItemDetailField>
                        <ItemDetailField :label="t('user-target-page.label-active')" icon="●">
                            <span class="item-detail-page-status-chip">{{ userStatus }}</span>
                        </ItemDetailField>
                        <ItemDetailField
                            :label="t('user-target-page.label-updated-at')"
                            :value="formatDateTime(currentUser.updatedAt)"
                            icon="🕒"
                            full-width
                        />
                    </div>
                    <p v-else class="item-detail-page-empty">{{ t('generic.loading-state') }}</p>
                </DetailCard>

                <DetailCard as="aside" class="item-detail-page-aside">
                    <MaterialGraphicCard :title="heroTitle" :description="heroDescription" variant="secondary" />
                    <ItemDetailField
                        :label="t('user-target-page.label-created-at')"
                        :value="formatDateTime(currentUser?.createdAt)"
                        icon="📅"
                    />
                    <ItemDetailField
                        :label="t('user-target-page.label-updated-at')"
                        :value="formatDateTime(currentUser?.updatedAt)"
                        icon="🕘"
                    />
                </DetailCard>
            </div>

            <div class="item-detail-page-actions">
                <RouterLink
                    v-if="currentUser"
                    :to="routerLinkI18n({ name: 'UserEdit', params: { id: currentUser.id } })"
                    class="theme-button"
                >
                    {{ t('user-target-page.button-go-to-edit') }}
                </RouterLink>
                <RouterLink :to="routerLinkI18n({ name: 'UsersList' })" class="theme-button">
                    {{ t('user-target-page.button-go-to-list') }}
                </RouterLink>
            </div>
        </section>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'UserTargetPage'
};
</script>

<script setup lang="ts">
import '@/styles/pages/itemDetail.scss';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useUsersStore } from '@/stores/users';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import DetailCard from '@/components/molecules/DetailCard.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';

/**
 * Translations helper.
 */
const { t } = useI18n();

/**
 * Route user id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * User store API and state references.
 */
const { fetchUser } = useUsersStore();
const { currentUser, selectedUserId } = storeToRefs(useUsersStore());

/**
 * Shared display/format helpers.
 */
const { formatText, formatDateTime, formatFlag } = useItemDetailDisplay();

/**
 * Hero and status computed values.
 */
const heroTitle = computed(() => currentUser.value?.username ?? id ?? t('user-target-page.page-title'));
const heroDescription = computed(() => formatText(currentUser.value?.email));
const userRole = computed(() =>
    formatFlag(currentUser.value?.admin, t('generic.administrator'), t('generic.standard-user'))
);
const userStatus = computed(() =>
    formatFlag(currentUser.value?.active, t('generic.enabled'), t('generic.disabled'))
);

/**
 * Activates route-based user selection and mount-time fetch.
 */
useItemDetailRecord({
    id,
    selectedId: selectedUserId,
    fetchRecord: fetchUser
});
</script>
