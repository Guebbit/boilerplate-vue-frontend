<template>
    <ItemDetailPage
        page-id="user-target"
        page-class="user-detail"
        :page-title="t('user-target-page.page-title')"
        :hero-eyebrow="currentUser?.id"
        :hero-title="heroTitle"
        :hero-description="heroDescription"
        hero-icon="👤"
        :section-title="t('generic.details')"
    >
        <template #stats>
            <MaterialStatCard :title="t('user-target-page.label-email')" :value="formatText(currentUser?.email)" />
            <MaterialStatCard :title="t('user-target-page.label-admin')" :value="userRole" accent="secondary" />
            <MaterialStatCard
                :title="t('user-target-page.label-active')"
                :value="userStatus"
                accent="tertiary"
            />
        </template>

        <template v-if="currentUser">
            <ItemDetailField :label="t('user-target-page.label-id')" :value="currentUser.id" icon="#" />
            <ItemDetailField
                :label="t('user-target-page.label-username')"
                :value="currentUser.username"
                icon="🙂"
            />
            <ItemDetailField :label="t('user-target-page.label-email')" :value="currentUser.email" icon="✉" />
            <ItemDetailField :label="t('user-target-page.label-admin')" icon="🛡">
                <span class="item-detail__status-chip">{{ userRole }}</span>
            </ItemDetailField>
            <ItemDetailField :label="t('user-target-page.label-active')" icon="●">
                <span class="item-detail__status-chip">{{ userStatus }}</span>
            </ItemDetailField>
            <ItemDetailField
                :label="t('user-target-page.label-updated-at')"
                :value="formatDateTime(currentUser.updatedAt)"
                icon="🕒"
                full-width
            />
        </template>
        <p v-else class="item-detail__empty">{{ t('generic.loading-state') }}</p>

        <template #aside>
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
        </template>

        <template #actions>
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
        </template>
    </ItemDetailPage>
</template>

<script lang="ts">
export default {
    name: 'UserTargetPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useUsersStore } from '@/stores/users';
import ItemDetailPage from '@/components/organisms/ItemDetailPage.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';

const { t } = useI18n();
const { id } = defineProps<{
    id?: string;
}>();

const { fetchUser } = useUsersStore();
const { currentUser, selectedUserId } = storeToRefs(useUsersStore());
const { formatText, formatDateTime, formatFlag } = useItemDetailDisplay();

const heroTitle = computed(() => currentUser.value?.username ?? id ?? t('user-target-page.page-title'));
const heroDescription = computed(() => formatText(currentUser.value?.email));
const userRole = computed(() =>
    formatFlag(currentUser.value?.admin, t('generic.administrator'), t('generic.standard-user'))
);
const userStatus = computed(() =>
    formatFlag(currentUser.value?.active, t('generic.enabled'), t('generic.disabled'))
);

useItemDetailRecord({
    id,
    selectedId: selectedUserId,
    fetchRecord: fetchUser
});
</script>
