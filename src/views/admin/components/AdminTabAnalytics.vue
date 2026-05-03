<template>
    <!-- Product analytics section — wired to PostHog / backend analytics once available -->
    <div class="admin-tab-analytics">
        <div v-if="props.series.length > 0" class="admin-analytics-series">
            <div
                v-for="serie in props.series"
                :key="serie.name"
                class="admin-analytics-serie theme-card"
            >
                <h3 class="admin-analytics-serie-title">
                    {{ serie.name }}
                    <span v-if="serie.unit" class="admin-analytics-serie-unit"
                        >({{ serie.unit }})</span
                    >
                </h3>
                <div class="admin-analytics-serie-points">
                    <div
                        v-for="point in serie.points"
                        :key="point.label"
                        class="admin-analytics-point"
                    >
                        <span class="admin-analytics-point-label">{{ point.label }}</span>
                        <span class="admin-analytics-point-value">{{ point.value }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty state -->
        <div v-else class="admin-empty-state">
            <p class="admin-empty-icon">📊</p>
            <p class="admin-empty-title">{{ t('admin-page.analytics-empty-title') }}</p>
            <p class="admin-empty-description">{{ t('admin-page.analytics-empty-description') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IAdminTimeSeries } from '@/types/admin';

const { t } = useI18n();

const props = defineProps<{
    series: IAdminTimeSeries[];
}>();
</script>
