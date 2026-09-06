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
import { useI18n } from 'vue-i18n';
import { useTwoFactorStore } from '@/modules/account/stores/two-factor.ts';
import { useMethodLabel } from '@/modules/account/composables/use-method-label.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import TwoFactorEnroll from '@/modules/account/components/TwoFactorEnroll.vue';
import TwoFactorBackupCodes from '@/modules/account/components/TwoFactorBackupCodes.vue';

const { t } = useI18n();
const { methodLabel } = useMethodLabel();
const { addMessage } = useNotificationsStore();
const twoFactor = useTwoFactorStore();
const { status, confirmed, mutatingWithCode } = storeToRefs(twoFactor);

onMounted(twoFactor.fetchStatus);

/**
 * The method currently open in `TwoFactorEnroll.vue`, or `undefined` when the dialog is closed.
 */
const enrolling = ref<string>();

/**
 * Opens enrollment for one method, confirming first when it REPLACES an already-armed one — the
 * "lost my phone, still have my session" recovery path, and the one `setupMethod` call this panel
 * makes without a code, so it has to say plainly that it disarms the current one. Whether it
 * replaces is read off `status` rather than passed in: the two lists below already agree with it,
 * and a flag at the call site is one more thing that can disagree.
 *
 * @param method - Wire name of the method to enroll or re-enroll.
 */
const openEnroll = (method: string) => {
    const alreadyArmed = status.value?.methods.some((row) => row.method === method) ?? false;
    if (!alreadyArmed) {
        enrolling.value = method;
        return;
    }
    void useDialogStore()
        .confirm({
            message: t('two-factor.confirm-reenroll', { method: methodLabel(method) }),
            color: 'error'
        })
        .then((accepted) => {
            if (accepted) enrolling.value = method;
        });
};

/**
 * One shared code prompt for every mutation that needs to prove an existing factor: removing one
 * method, dropping every method at once, or minting a fresh set of backup codes. `kind` says which
 * action {@link submitCode} performs.
 */
type CodePromptRequest =
    { kind: 'remove'; method: string } | { kind: 'disable' } | { kind: 'regenerate' };

const codePrompt = ref<CodePromptRequest>();

/**
 * The code being typed into that prompt. Cleared each time the prompt opens.
 */
const codeInput = ref('');

/**
 * Confirms the destructive intent, then opens the code prompt for it.
 *
 * @param request - What is being confirmed and, on accept, what {@link codePrompt} becomes.
 */
const openCodePrompt = (request: { message: string; next: CodePromptRequest }) =>
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
                : t('two-factor.confirm-remove', { method: methodLabel(method) }),
        next: { kind: 'remove', method }
    });

/**
 * @returns Nothing; opens {@link codePrompt} after confirmation.
 */
const handleDisableAll = () =>
    openCodePrompt({ message: t('two-factor.confirm-disable-all'), next: { kind: 'disable' } });

/**
 * @returns Nothing; opens {@link codePrompt} after confirmation — regenerating discards the
 *  current set, so this warns before minting a new one.
 */
const handleRegenerate = () =>
    openCodePrompt({
        message: t('two-factor.confirm-regenerate-codes'),
        next: { kind: 'regenerate' }
    });

/**
 * Runs the mutation a code-prompt request names, and says what to toast on success —
 * `undefined` for a regenerate, since the backup-codes screen it opens IS the success feedback.
 *
 * @param request - The pending {@link codePrompt} value.
 * @param code - The code just typed into the prompt.
 * @returns A promise resolving with the toast message, or `undefined`.
 */
const runCodePromptMutation = (
    request: CodePromptRequest,
    code: string
): Promise<string | undefined> => {
    if (request.kind === 'remove')
        return twoFactor
            .removeMethod(request.method, code)
            .then(() => t('two-factor.success-removed', { method: methodLabel(request.method) }));
    if (request.kind === 'disable')
        return twoFactor.disableAll(code).then(() => t('two-factor.success-disabled'));
    return twoFactor.regenerateBackupCodes(code).then(() => undefined);
};

/**
 * Submits the code prompt's pending mutation.
 *
 * @returns Nothing; the outcome is reported as a toast (when there is one) and the prompt closes
 *  on success. A wrong code stays open for another try — the confirmation already happened, no
 *  reason to lose it.
 */
const submitCode = () => {
    if (!codePrompt.value || !codeInput.value) return;
    const request = codePrompt.value;
    return runCodePromptMutation(request, codeInput.value)
        .then((toastMessage) => {
            if (toastMessage) addMessage(toastMessage);
            codePrompt.value = undefined;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
};

/**
 * Rows to offer an "Add" button for — the server's own `enrollable` flag decides, never a check
 * on the method name, so a method this deployment adds later needs no code change here.
 */
const availableToEnroll = computed(() => status.value?.available.filter((row) => row.enrollable));

/**
 * The rest: rows the server refused to offer, rendered as its own `reason` and nothing else.
 */
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
                        {{ methodLabel(row.method) }}
                        <span v-if="row.target" class="opacity-70">— {{ row.target }}</span>
                    </v-list-item-title>
                    <template #append>
                        <v-btn
                            variant="text"
                            size="small"
                            :data-test="`two-factor-replace-${row.method}`"
                            @click="openEnroll(row.method)"
                        >
                            {{ t('two-factor.button-add') }}
                        </v-btn>
                        <v-btn
                            variant="text"
                            color="error"
                            size="small"
                            :aria-label="
                                t('two-factor.button-remove-named', {
                                    method: methodLabel(row.method)
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
                    <v-list-item-title>{{ methodLabel(row.method) }}</v-list-item-title>
                    <template #append>
                        <v-btn
                            variant="tonal"
                            size="small"
                            :data-test="`two-factor-add-${row.method}`"
                            @click="openEnroll(row.method)"
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

        <div v-if="status && status.enabled" class="mb-4 flex items-center justify-between gap-2">
            <p
                class="text-sm"
                :class="status.backupCodesRemaining === 0 ? 'text-error' : 'opacity-70'"
            >
                {{
                    status.backupCodesRemaining === 0
                        ? t('two-factor.backup-codes-remaining-zero')
                        : t('two-factor.backup-codes-remaining', {
                              count: status.backupCodesRemaining
                          })
                }}
            </p>
            <v-btn
                variant="text"
                size="small"
                data-test="two-factor-regenerate-codes"
                @click="handleRegenerate"
            >
                {{ t('two-factor.button-regenerate-codes') }}
            </v-btn>
        </div>

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
                        :loading="mutatingWithCode"
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
