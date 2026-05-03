<template>
    <!-- Security / audit event viewer — data will be wired once a backend audit endpoint exists -->
    <div class="admin-tab-audit">
        <div v-if="props.events.length > 0" class="admin-audit-list">
            <div
                v-for="(event, index) in props.events"
                :key="event.timestamp + event.action + index"
                :class="['admin-audit-entry', 'admin-audit-outcome-' + event.outcome]"
            >
                <span class="admin-audit-timestamp">{{ formatAdminTime(event.timestamp) }}</span>
                <span class="admin-audit-action">{{ event.action }}</span>
                <span
                    :class="['admin-audit-outcome-badge', 'admin-audit-outcome-' + event.outcome]"
                >
                    {{ event.outcome }}
                </span>
                <span v-if="event.actorUserId" class="admin-audit-meta"
                    >actor: {{ event.actorUserId }}</span
                >
                <span v-if="event.actorRole" class="admin-audit-meta"
                    >role: {{ event.actorRole }}</span
                >
                <span v-if="event.targetType && event.targetId" class="admin-audit-meta">
                    {{ event.targetType }}#{{ event.targetId }}
                </span>
            </div>
        </div>

        <!-- Empty state -->
        <div v-else class="admin-empty-state">
            <p class="admin-empty-icon">🔒</p>
            <p class="admin-empty-title">{{ t('admin-page.audit-empty-title') }}</p>
            <p class="admin-empty-description">{{ t('admin-page.audit-empty-description') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IAdminAuditEvent } from '@/types/admin';
import { formatAdminTime } from '@/views/admin/adminHelpers';

const { t } = useI18n();

const props = defineProps<{
    events: IAdminAuditEvent[];
}>();
</script>
