<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';

/**
 * Renders the confirmation at the front of the dialog store's queue, one at a time.
 *
 * Mounted once by the layout, like the toast stack: a component that needs a confirmation calls
 * `useDialogStore().confirm(...)` and never renders a dialog of its own. The host is the only
 * place that knows confirmations are Vuetify dialogs, so restyling every "Are you sure?" in the
 * app is an edit to this file.
 *
 * Closing by any route other than the confirming button — the cancel button, Escape, a click on
 * the scrim — answers `false`. There is no third state: a dismissed question is a declined one.
 */
const { t } = useI18n();
const dialogStore = useDialogStore();
const { queue } = storeToRefs(dialogStore);

/** The question being shown; the rest wait their turn. */
const current = computed(() => queue.value.at(0));

const isOpen = computed({
    get: () => queue.value.length > 0,
    set: (open) => {
        if (!open) dialogStore.answer(false);
    }
});
</script>

<template>
    <v-dialog v-model="isOpen" max-width="480" data-test="app-dialog">
        <v-card v-if="current" :title="current.title" role="alertdialog" aria-modal="true">
            <v-card-text data-test="app-dialog-message">{{ current.message }}</v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    variant="text"
                    data-test="app-dialog-cancel"
                    @click="dialogStore.answer(false)"
                >
                    {{ current.cancelLabel ?? t('generic.cancel') }}
                </v-btn>
                <v-btn
                    :color="current.color ?? 'primary'"
                    variant="flat"
                    data-test="app-dialog-confirm"
                    @click="dialogStore.answer(true)"
                >
                    {{ current.confirmLabel ?? t('generic.confirm') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
