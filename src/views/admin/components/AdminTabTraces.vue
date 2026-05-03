<template>
    <!-- Distributed trace viewer — data will be wired once a backend traces endpoint exists -->
    <div class="admin-tab-traces">
        <div v-if="props.traces.length > 0" class="admin-traces-list">
            <div
                v-for="trace in props.traces"
                :key="trace.traceId"
                :class="['admin-trace-entry', { 'admin-trace-error': trace.hasError }]"
            >
                <span class="admin-trace-span">{{ trace.rootSpan }}</span>
                <span class="admin-trace-duration">{{ trace.durationMs }}ms</span>
                <span v-if="trace.statusCode" class="admin-trace-status">{{
                    trace.statusCode
                }}</span>
                <span class="admin-trace-time">{{ formatAdminTime(trace.startTime) }}</span>
                <span v-if="trace.hasError" class="admin-trace-error-badge">error</span>
            </div>
        </div>

        <!-- Empty state -->
        <div v-else class="admin-empty-state">
            <p class="admin-empty-icon">🔗</p>
            <p class="admin-empty-title">{{ t('admin-page.traces-empty-title') }}</p>
            <p class="admin-empty-description">{{ t('admin-page.traces-empty-description') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IAdminTrace } from '@/types/admin';
import { formatAdminTime } from '@/views/admin/adminHelpers';

const { t } = useI18n();

const props = defineProps<{
    traces: IAdminTrace[];
}>();
</script>
