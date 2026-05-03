<template>
    <!-- Structured-log viewer — data will be wired once a backend log endpoint exists -->
    <div class="admin-tab-logs">
        <div v-if="props.entries.length > 0" class="admin-log-list">
            <div
                v-for="(entry, index) in props.entries"
                :key="entry.timestamp + entry.message + index"
                :class="['admin-log-entry', 'admin-log-level-' + entry.level]"
            >
                <span class="admin-log-timestamp">{{ formatAdminTime(entry.timestamp) }}</span>
                <span class="admin-log-level-badge">{{ entry.level }}</span>
                <span class="admin-log-message">{{ entry.message }}</span>
                <span v-if="entry.source" class="admin-log-source">{{ entry.source }}</span>
                <span v-if="entry.requestId" class="admin-log-meta"
                    >req: {{ entry.requestId }}</span
                >
                <span v-if="entry.traceId" class="admin-log-meta">trace: {{ entry.traceId }}</span>
            </div>
        </div>

        <!-- Empty state -->
        <div v-else class="admin-empty-state">
            <p class="admin-empty-icon">📋</p>
            <p class="admin-empty-title">{{ t('admin-page.logs-empty-title') }}</p>
            <p class="admin-empty-description">{{ t('admin-page.logs-empty-description') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IAdminLogEntry } from '@/types/admin';
import { formatAdminTime } from '@/views/admin/adminHelpers';

const { t } = useI18n();

const props = defineProps<{
    entries: IAdminLogEntry[];
}>();
</script>
