<template>
    <!-- Quick-status items with links to dedicated sections -->
    <div class="admin-tab-overview">
        <section class="admin-overview-section">
            <h2 class="admin-section-title">{{ t('admin-page.overview-status-title') }}</h2>
            <div class="admin-overview-status-grid">
                <div class="admin-status-item theme-card">
                    <span class="admin-status-icon">🛒</span>
                    <span class="admin-status-label">{{ t('admin-page.overview-products') }}</span>
                    <span class="admin-status-value">{{ props.productsCount ?? '—' }}</span>
                </div>
                <div class="admin-status-item theme-card">
                    <span class="admin-status-icon">👥</span>
                    <span class="admin-status-label">{{ t('admin-page.overview-users') }}</span>
                    <span class="admin-status-value">{{ props.usersCount ?? '—' }}</span>
                </div>
                <div class="admin-status-item theme-card">
                    <span class="admin-status-icon">📦</span>
                    <span class="admin-status-label">{{ t('admin-page.overview-orders') }}</span>
                    <span class="admin-status-value">{{ props.ordersCount ?? '—' }}</span>
                </div>
            </div>
        </section>

        <section class="admin-overview-section">
            <h2 class="admin-section-title">{{ t('admin-page.overview-observability-title') }}</h2>
            <div class="admin-overview-links-grid">
                <div class="admin-link-card theme-card animate-on-hover">
                    <p class="admin-link-card-icon">📋</p>
                    <p class="admin-link-card-title">{{ t('admin-page.tab-logs') }}</p>
                    <p class="admin-link-card-description">
                        {{ t('admin-page.overview-logs-hint') }}
                    </p>
                </div>
                <div class="admin-link-card theme-card animate-on-hover">
                    <p class="admin-link-card-icon">🔒</p>
                    <p class="admin-link-card-title">{{ t('admin-page.tab-audit') }}</p>
                    <p class="admin-link-card-description">
                        {{ t('admin-page.overview-audit-hint') }}
                    </p>
                </div>
                <div class="admin-link-card theme-card animate-on-hover">
                    <p class="admin-link-card-icon">🔗</p>
                    <p class="admin-link-card-title">{{ t('admin-page.tab-traces') }}</p>
                    <p class="admin-link-card-description">
                        {{ t('admin-page.overview-traces-hint') }}
                    </p>
                </div>
                <div class="admin-link-card theme-card animate-on-hover">
                    <p class="admin-link-card-icon">📊</p>
                    <p class="admin-link-card-title">{{ t('admin-page.tab-analytics') }}</p>
                    <p class="admin-link-card-description">
                        {{ t('admin-page.overview-analytics-hint') }}
                    </p>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
    /** Total number of products loaded in the store. */
    productsCount?: number;
    /** Total number of users loaded in the store. */
    usersCount?: number;
    /** Total number of orders loaded in the store. */
    ordersCount?: number;
}>();
</script>
