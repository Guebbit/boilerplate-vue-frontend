<script setup lang="ts">
/**
 * @module
 * The button row closing every admin list's filter form: a Search submit and a Reset, plus a
 * default slot for whatever the page adds after them (a spacer and a Create link, an Export).
 * It submits the enclosing `<form>` rather than emitting a search, so the form's own
 * `@submit.prevent` stays the one place a search starts.
 */
import { useI18n } from 'vue-i18n';
import { Search } from 'lucide-vue-next';

/**
 * Props of the row: whether a search is in flight.
 */
const { loading } = defineProps<{
    /**
     * A search is running: Search shows its spinner and Reset is disabled. Absent on lists that
     * keep both live while they load.
     */
    loading?: boolean;
}>();

/**
 * Emitted when the visitor asks to clear every filter.
 */
const emit = defineEmits<
    /**
     * The Reset button was pressed.
     */
    (event: 'reset') => void
>();

/**
 * Translation function, for the two generic button labels.
 */
const { t } = useI18n();
</script>

<template>
    <div class="mt-4 flex flex-wrap items-center gap-2">
        <v-btn type="submit" color="primary" :loading="loading" data-test="search-submit">
            <Search :size="16" class="mr-1" aria-hidden="true" />
            {{ t('generic.search') }}
        </v-btn>
        <v-btn variant="tonal" :disabled="loading" data-test="search-reset" @click="emit('reset')">
            {{ t('generic.reset') }}
        </v-btn>
        <slot />
    </div>
</template>
