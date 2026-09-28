<script lang="ts">
export default {
    name: 'AuditLogPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The shop's own audit trail — reachable by any tenant role `audit.any.read` holds
 * (`manager`/`support`/`moderator`/`admin`), unlike `Admin.vue`'s installation-wide tab, which is
 * platform-`operator`-only. Doubles as a single record's history: `?target=<id>` (set by the
 * "History" link on `User.vue`/`Order.vue`) narrows it to one row's actions without this page
 * needing a second view — {@link AdminAuditTab} does the actual fetching and rendering either way.
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import AdminAuditTab from '@/modules/observability/components/AdminAuditTab.vue';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The route's own query, read once for `target` — this page never rewrites the URL as the filter
 * form inside `AdminAuditTab` is used, unlike `WebhookDeliveries.vue`'s bookmarkable filters, since
 * a fixed `target` scope is meant to stay fixed for the page's lifetime.
 */
const route = useRoute();

/**
 * The record this page is scoped to, or `undefined` for the shop's whole trail.
 *
 * @returns The `target` query param, or `undefined` when absent or repeated (a malformed link).
 */
const target = computed(() =>
    typeof route.query.target === 'string' ? route.query.target : undefined
);

/**
 * Hero heading — names the record when this is a scoped history, otherwise the generic title.
 */
const heroTitle = computed(() =>
    target.value
        ? t('audit-log-page.page-title-target', { target: target.value })
        : t('audit-log-page.page-title')
);
</script>

<template>
    <LayoutDefault id="audit-log-page" :title="heroTitle">
        <AdminAuditTab endpoint="shop" :target="target" />
    </LayoutDefault>
</template>
