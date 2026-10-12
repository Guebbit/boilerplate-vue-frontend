<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'StatsPeriodForm'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The period picker every stats page opens with: two date fields, a bucket size and a few presets.
 * It edits a draft and only reports a period the API will accept (`periodProblem`), so an
 * impossible range is explained here rather than answered by a 422.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { StatsInterval } from '@/types/enums.ts';
import type { StatsInterval as TStatsInterval } from '@types';
import {
    PERIOD_PRESETS,
    autoInterval,
    periodProblem,
    presetPeriod,
    type PeriodPreset,
    type StatsPeriodChoice
} from '../domain';

/**
 * The period currently applied.
 */
const props = defineProps<{
    /** What the page shows right now. */
    modelValue: StatsPeriodChoice;
}>();

/**
 * Emitted when the visitor applies a valid period.
 */
const emit = defineEmits<
    /**
     * A period the API will accept.
     */
    (event: 'apply', period: StatsPeriodChoice) => void
>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * What the fields hold, before it is applied.
 */
const draft = ref<StatsPeriodChoice>({ ...props.modelValue });

/**
 * Whether the visitor picked a bucket size by hand; until then it follows the range.
 */
const intervalChosen = ref(false);

/**
 * Why the draft cannot be applied, if it cannot.
 */
const problem = computed(() => periodProblem(draft.value));

/**
 * The bucket sizes to offer, translated.
 */
const intervalOptions = computed(() =>
    Object.values(StatsInterval).map((value) => ({
        value,
        title: t(`stats-page.interval-${value}`)
    }))
);

/**
 * Keeps the bucket size sensible while the range is edited, unless the visitor chose one.
 */
watch(
    () => [draft.value.from, draft.value.to],
    () => {
        if (!intervalChosen.value && problem.value !== 'invalid' && problem.value !== 'reversed')
            draft.value.interval = autoInterval(draft.value.from, draft.value.to);
    }
);

/**
 * A change made from outside (a link, a reset) replaces the draft.
 */
watch(
    () => props.modelValue,
    (period) => {
        draft.value = { ...period };
    }
);

/**
 * Records a hand-picked bucket size.
 *
 * @param interval - The size chosen.
 */
const chooseInterval = (interval: TStatsInterval) => {
    intervalChosen.value = true;
    draft.value.interval = interval;
};

/**
 * Applies a preset straight away: a preset is a complete question.
 *
 * @param preset - Which quick choice.
 */
const applyPreset = (preset: PeriodPreset) => {
    intervalChosen.value = false;
    draft.value = presetPeriod(preset, new Date());
    emit('apply', { ...draft.value });
};

/**
 * Applies the draft when it is valid.
 */
const apply = () => {
    if (problem.value === undefined) emit('apply', { ...draft.value });
};
</script>

<template>
    <v-card class="mb-6 p-5">
        <form novalidate data-test="stats-period-form" @submit.prevent="apply">
            <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                <v-text-field
                    v-model="draft.from"
                    type="date"
                    :label="t('stats-page.label-from')"
                    data-test="stats-from"
                    hide-details
                />
                <v-text-field
                    v-model="draft.to"
                    type="date"
                    :label="t('stats-page.label-to')"
                    data-test="stats-to"
                    hide-details
                />
                <v-select
                    :model-value="draft.interval"
                    :items="intervalOptions"
                    item-title="title"
                    item-value="value"
                    :label="t('stats-page.label-interval')"
                    data-test="stats-interval"
                    hide-details
                    @update:model-value="chooseInterval"
                />
            </div>
            <p
                v-if="problem"
                class="mt-2 text-sm text-error"
                role="alert"
                data-test="stats-period-problem"
            >
                {{ t(`stats-page.problem-${problem}`) }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
                <v-btn
                    type="submit"
                    color="primary"
                    :disabled="problem !== undefined"
                    data-test="stats-apply"
                >
                    {{ t('stats-page.button-apply') }}
                </v-btn>
                <v-btn
                    v-for="preset in PERIOD_PRESETS"
                    :key="preset"
                    variant="tonal"
                    :data-test="`stats-preset-${preset}`"
                    @click="applyPreset(preset)"
                >
                    {{ t(`stats-page.preset-${preset}`) }}
                </v-btn>
            </div>
        </form>
    </v-card>
</template>
