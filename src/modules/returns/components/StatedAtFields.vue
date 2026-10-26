<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'StatedAtFields'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The two things staff tell the shop about what the buyer said: the day they said it (`max` is now,
 * the API refuses the future) and, for a withdrawal, the channel they used. Used by the three staff
 * forms that act for a buyer, so the fields read and validate the same everywhere.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { STATEMENT_CHANNELS, toLocalInput } from '../domain/statement.ts';

/**
 * What the fields show, and whether the channel is asked at all.
 */
defineProps<{
    /** Show the channel select: only a withdrawal has one. */
    withChannel?: boolean;
    /** Whether the date must be filled in (a withdrawal) or may stay empty (now). */
    dateRequired?: boolean;
    /** Messages for the date field. */
    dateErrors?: readonly string[];
    /** Messages for the channel field. */
    channelErrors?: readonly string[];
}>();

/**
 * The typed local date-time; empty means "now" when it is optional.
 */
const requestedAt = defineModel<string>('requestedAt', { required: true });

/**
 * The chosen channel; empty until staff pick one.
 */
const statedVia = defineModel<string>('statedVia', { default: '' });

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The latest moment the field accepts: now, to the minute.
 */
const maxNow = computed(() => toLocalInput(new Date()));

/**
 * The channel select's choices, translated.
 */
const channelOptions = computed(() =>
    STATEMENT_CHANNELS.map((channel) => ({
        value: channel,
        title: t(`stated-at-fields.channel-${channel}`)
    }))
);
</script>

<template>
    <div class="flex flex-wrap items-start gap-3" data-test="stated-at-fields">
        <v-text-field
            v-model="requestedAt"
            type="datetime-local"
            :max="maxNow"
            :label="
                dateRequired
                    ? t('stated-at-fields.label-date-required')
                    : t('stated-at-fields.label-date')
            "
            :hint="dateRequired ? undefined : t('stated-at-fields.hint-date')"
            :persistent-hint="!dateRequired"
            v-bind="fieldErrorProps(dateErrors ?? [])"
            hide-details="auto"
            class="min-w-64"
            data-test="stated-at-date"
        />
        <v-select
            v-if="withChannel"
            v-model="statedVia"
            :items="channelOptions"
            item-title="title"
            item-value="value"
            :label="t('stated-at-fields.label-channel')"
            v-bind="fieldErrorProps(channelErrors ?? [])"
            hide-details="auto"
            class="min-w-48"
            data-test="stated-at-channel"
        />
    </div>
</template>
