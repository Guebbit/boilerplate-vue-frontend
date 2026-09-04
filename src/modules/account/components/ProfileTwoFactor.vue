<script lang="ts">
export default {
    name: 'ProfileTwoFactor'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The account's 2FA panel: armed methods (each removable, an armed one also replaceable), what
 * could still be added, and the backup-codes count. Every mutation needs a code from an existing
 * factor — collected through one shared dialog, `openCodePrompt` below — on top of the fresh-auth
 * the route already demands, which `ReauthDialog.vue` handles before any of these calls are ever
 * reached.
 */
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useTwoFactorStore } from '@/modules/account/stores/two-factor.ts';
import { useSafeI18n } from '@/modules/account/composables/use-safe-i18n.ts';
import { methodLabel } from '@/modules/account/domain/two-factor.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import TwoFactorEnroll from '@/modules/account/components/TwoFactorEnroll.vue';
import TwoFactorBackupCodes from '@/modules/account/components/TwoFactorBackupCodes.vue';

const { t, te } = useSafeI18n();
const { addMessage } = useNotificationsStore();
const twoFactor = useTwoFactorStore();
const { status, confirmed } = storeToRefs(twoFactor);

onMounted(twoFactor.fetchStatus);

/**
 * The method currently open in `TwoFactorEnroll.vue`, or `undefined` when the dialog is closed.
 */
const enrolling = ref<string>();

/**
 * Opens enrollment for one method, confirming first when it REPLACES an already-armed one — the
 * "lost my phone, still have my session" recovery path, and the one `setupMethod` call this panel
 * makes without a code, so it has to say plainly that it disarms the current one.
 *
 * @param method - Wire name of the method to enroll or re-enroll.
 * @param alreadyArmed - Whether `method` is already in `status.methods`.
 */
const openEnroll = (method: string, alreadyArmed: boolean) => {
    if (!alreadyArmed) {
        enrolling.value = method;
        return;
    }
    void useDialogStore()
        .confirm({
            message: t('two-factor.confirm-reenroll', { method: methodLabel(t, te, method) }),
            color: 'error'
        })
        .then((accepted) => {
            if (accepted) enrolling.value = method;
        });
};

/**
 * One shared code prompt for both mutations that need to prove an existing factor: removing one
 * method, and dropping every method at once. `kind` says which action `submitCode` performs.
 */
const codePrompt = ref<{ kind: 'remove'; method: string } | { kind: 'disable' }>();
const codeInput = ref('');
const codeSubmitting = ref(false);

/**
 * Confirms the destructive intent, then opens the code prompt for it.
 *
 * @param request - What is being confirmed and, on accept, what {@link codePrompt} becomes.
 */
const openCodePrompt = (request: {
    message: string;
    next: { kind: 'remove'; method: string } | { kind: 'disable' };
}) =>
    useDialogStore()
        .confirm({ message: request.message, color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            codePrompt.value = request.next;
            codeInput.value = '';
        });

/**
 * @param method - The armed method a row's "Remove" button names.
 * @returns Nothing; opens {@link codePrompt} after confirmation. The confirmation copy differs
 *  for the account's LAST factor, where removing it also discards the backup codes.
 */
const handleRemove = (method: string) =>
    openCodePrompt({
        message:
            (status.value?.methods.length ?? 0) <= 1
                ? t('two-factor.confirm-remove-last')
                : t('two-factor.confirm-remove', { method: methodLabel(t, te, method) }),
        next: { kind: 'remove', method }
    });

/**
 * @returns Nothing; opens {@link codePrompt} after confirmation.
 */
const handleDisableAll = () =>
    openCodePrompt({ message: t('two-factor.confirm-disable-all'), next: { kind: 'disable' } });

/**
 * Submits the code prompt's pending mutation.
 *
 * @returns Nothing; the outcome is reported as a toast and the prompt closes on success. A wrong
 *  code stays open for another try — the confirmation already happened, no reason to lose it.
 */
const submitCode = () => {
    if (!codePrompt.value || !codeInput.value) return;
    const request = codePrompt.value;
    codeSubmitting.value = true;
    return (
        request.kind === 'remove'
            ? twoFactor.removeMethod(request.method, codeInput.value)
            : twoFactor.disableAll(codeInput.value)
    )
        .then(() => {
            addMessage(
                request.kind === 'remove'
                    ? t('two-factor.success-removed', {
                          method: methodLabel(t, te, request.method)
                      })
                    : t('two-factor.success-disabled')
            );
            codePrompt.value = undefined;
        })
        .catch((error) => notifyErrorMessages(addMessage, error))
        .finally(() => {
            codeSubmitting.value = false;
        });
};

/**
 * Rows this build can offer enrollment for right now — filtered to methods `TwoFactorEnroll.vue`
 * actually knows how to render (`delivers` boolean covers every method that exists or will:
 * device or delivered, nothing else), so a future method type this build has no UI for yet is
 * simply absent rather than rendering a broken "Add" button.
 */
const availableToEnroll = computed(() => status.value?.available.filter((row) => row.enrollable));
const unavailable = computed(() => status.value?.available.filter((row) => !row.enrollable));
</script>

<template>
    <div>
        <v-divider class="my-6" />

        <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ t('two-factor.panel-title') }}</h2>
            <v-chip :color="status?.enabled ? 'success' : undefined" size="small">
                {{
                    status?.enabled
                        ? t('two-factor.panel-status-on')
                        : t('two-factor.panel-status-off')
                }}
            </v-chip>
        </div>
        <p class="mb-4 opacity-80">{{ t('two-factor.panel-intro') }}</p>

        <div v-if="status?.methods.length" class="mb-4" data-test="two-factor-armed">
            <h3 class="mb-2 text-sm font-semibold uppercase opacity-70">
                {{ t('two-factor.armed-title') }}
            </h3>
            <v-list density="compact">
                <v-list-item v-for="row in status.methods" :key="row.method">
                    <v-list-item-title>
                        {{ methodLabel(t, te, row.method) }}
                        <span v-if="row.target" class="opacity-70">— {{ row.target }}</span>
                    </v-list-item-title>
                    <template #append>
                        <v-btn
                            variant="text"
                            size="small"
                            :data-test="`two-factor-replace-${row.method}`"
                            @click="openEnroll(row.method, true)"
                        >
                            {{ t('two-factor.button-add') }}
                        </v-btn>
                        <v-btn
                            variant="text"
                            color="error"
                            size="small"
                            :aria-label="
                                t('two-factor.button-remove-named', {
                                    method: methodLabel(t, te, row.method)
                                })
                            "
                            :data-test="`two-factor-remove-${row.method}`"
                            @click="handleRemove(row.method)"
                        >
                            {{ t('two-factor.button-remove') }}
                        </v-btn>
                    </template>
                </v-list-item>
            </v-list>
        </div>

        <div v-if="availableToEnroll?.length" class="mb-4" data-test="two-factor-available">
            <h3 class="mb-2 text-sm font-semibold uppercase opacity-70">
                {{ t('two-factor.available-title') }}
            </h3>
            <v-list density="compact">
                <v-list-item v-for="row in availableToEnroll" :key="row.method">
                    <v-list-item-title>{{ methodLabel(t, te, row.method) }}</v-list-item-title>
                    <template #append>
                        <v-btn
                            variant="tonal"
                            size="small"
                            :data-test="`two-factor-add-${row.method}`"
                            @click="openEnroll(row.method, false)"
                        >
                            {{ t('two-factor.button-add') }}
                        </v-btn>
                    </template>
                </v-list-item>
            </v-list>
        </div>

        <!-- Not enrollable — the server's own reason, verbatim; never restated or second-guessed. -->
        <p
            v-for="row in unavailable"
            :key="row.method"
            class="mb-2 text-sm opacity-70"
            data-test="two-factor-unavailable"
        >
            {{ row.reason }}
        </p>

        <p
            v-if="status && status.enabled"
            class="mb-4 text-sm"
            :class="status.backupCodesRemaining === 0 ? 'text-error' : 'opacity-70'"
        >
            {{
                status.backupCodesRemaining === 0
                    ? t('two-factor.backup-codes-remaining-zero')
                    : t('two-factor.backup-codes-remaining', { count: status.backupCodesRemaining })
            }}
        </p>

        <v-btn
            v-if="status?.enabled"
            variant="text"
            color="error"
            size="small"
            data-test="two-factor-disable-all"
            @click="handleDisableAll"
        >
            {{ t('two-factor.button-turn-off') }}
        </v-btn>

        <!-- Enrollment dialog -->
        <v-dialog :model-value="!!enrolling" max-width="480" persistent>
            <TwoFactorEnroll v-if="enrolling" :method="enrolling" @close="enrolling = undefined" />
        </v-dialog>

        <!-- Backup codes — blocking, shown once, right after the first factor is confirmed -->
        <v-dialog :model-value="!!confirmed?.backupCodes" max-width="480" persistent>
            <TwoFactorBackupCodes
                v-if="confirmed?.backupCodes"
                :codes="confirmed.backupCodes"
                @done="twoFactor.clearSetup()"
            />
        </v-dialog>

        <!-- The shared code prompt, for remove-one and disable-all -->
        <v-dialog :model-value="!!codePrompt" max-width="420" persistent>
            <v-card v-if="codePrompt">
                <v-card-title>{{ t('two-factor.label-code') }}</v-card-title>
                <v-card-text>
                    <p class="mb-2 text-sm opacity-70">{{ t('two-factor.label-code-hint') }}</p>
                    <form novalidate @submit.prevent="submitCode">
                        <v-text-field
                            v-model="codeInput"
                            autocomplete="one-time-code"
                            :label="t('two-factor.label-code')"
                            data-test="two-factor-code-prompt-input"
                        />
                    </form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="codePrompt = undefined">
                        {{ t('two-factor.button-cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        variant="flat"
                        :disabled="!codeInput"
                        :loading="codeSubmitting"
                        data-test="two-factor-code-prompt-submit"
                        @click="submitCode"
                    >
                        {{ t('two-factor.button-confirm') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>
