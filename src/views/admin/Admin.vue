<script lang="ts">
export default { name: 'AdminPage' };
</script>

<script setup lang="ts">
import '@/styles/pages/admin.scss';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import AdminOverviewTab from '@/components/admin/AdminOverviewTab.vue';
import AdminAuditTab from '@/components/admin/AdminAuditTab.vue';

const { t } = useI18n();

type IAdminTab = 'overview' | 'audit';

const activeTab = ref<IAdminTab>('overview');
const tabs: { key: IAdminTab; label: string }[] = [
    { key: 'overview', label: 'admin-page.tab-overview' },
    { key: 'audit', label: 'admin-page.tab-audit' }
];
</script>

<template>
    <LayoutDefault id="admin-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('admin-page.page-title') }}</span>
            </h1>
        </template>

        <!-- Tab bar -->
        <nav class="admin-tabs">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                class="admin-tab-button"
                :class="{ 'admin-tab-button-active': activeTab === tab.key }"
                @click="activeTab = tab.key"
            >
                {{ t(tab.label) }}
            </button>
        </nav>

        <!-- Tab content -->
        <div class="admin-tab-content">
            <AdminOverviewTab v-if="activeTab === 'overview'" />
            <AdminAuditTab v-else-if="activeTab === 'audit'" />
        </div>
    </LayoutDefault>
</template>
