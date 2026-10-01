<script setup lang="ts">
/**
 * @module
 * Role/active-status editor for an admin acting on someone else's account (or their own): a role
 * select and an active toggle, gated by an internal confirm step that names the target user and
 * warns about the consequences of deactivating — a full logout everywhere, doubly so when the
 * target is the signed-in admin.
 *
 * Two entry points, one component: the users-list row action and the detail page's own action
 * open it with `options.skipPicker` unset, letting the admin choose new values here; `UserEdit.vue`
 * already collected them in its own form, so it opens this dialog with `skipPicker: true` to run
 * only the confirm step before submitting. Both go through `useUserAccessDialog()`, which is what
 * turns this plain `v-model` component into an awaitable request.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFullscreenDialog } from '@/ui/composables/use-fullscreen-dialog.ts';
import { useReturnFocus } from '@/ui/composables/use-return-focus.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { userRoleOptions } from '@/modules/users/domain';
import type {
    UserAccessDialogRequestOptions,
    UserAccessDialogResult,
    UserAccessDialogTarget
} from '@/modules/users/composables/use-user-access-dialog.ts';

/**
 * Who the dialog acts on, and how it was opened — both `undefined` while the dialog is closed.
 */
const props = defineProps<{
    target?: UserAccessDialogTarget;
    options?: UserAccessDialogRequestOptions;
}>();

/**
 * Emitted once the admin accepts or backs out of the confirm step; `useUserAccessDialog()` wires
 * both onto the promise it hands its caller.
 */
const emit = defineEmits<{
    confirm: [result: UserAccessDialogResult];
    cancel: [];
}>();

/**
 * Two-way `v-model`, so this component neither declares the prop nor re-emits the event by hand.
 */
const isOpen = defineModel<boolean>({ required: true });

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Whether the dialog fills the screen — it does on a phone, see `useFullscreenDialog`.
 */
const fullscreen = useFullscreenDialog();

/**
 * Hands focus back to the control that opened the access dialog once it closes.
 */
useReturnFocus(() => isOpen.value);

/**
 * The signed-in admin's own id, to warn them specifically when they are deactivating themselves.
 */
const session = useSessionStore();

/**
 * The role/active values on screen — seeded on open, below.
 */
const selectedRole = ref('');
const selectedActive = ref(true);

/**
 * Which panel is showing. `skipPicker` requests start on `confirm` directly: the values were
 * already chosen in `UserEdit.vue`'s own form.
 */
const step = ref<'pick' | 'confirm'>('pick');

/**
 * Re-seeds the form and picks the starting step every time the dialog opens — never on mount,
 * since one instance is reused across every row a list renders.
 */
watch(isOpen, (open) => {
    if (!open || !props.target) return;
    selectedRole.value = props.options?.chosenRole ?? props.target.role ?? '';
    selectedActive.value = props.options?.chosenActive ?? props.target.active ?? true;
    step.value = props.options?.skipPicker ? 'confirm' : 'pick';
});

/**
 * Whether the role on screen differs from the target's loaded value.
 */
const roleChanged = computed(() => selectedRole.value !== (props.target?.role ?? ''));

/**
 * Whether the active toggle on screen differs from the target's loaded value.
 */
const activeChanged = computed(() => selectedActive.value !== (props.target?.active ?? true));

/**
 * Whether either field actually changed — the picker step's "Continue" is disabled without this,
 * since a no-op confirm would only ask the admin to approve nothing.
 */
const hasChanges = computed(() => roleChanged.value || activeChanged.value);

/**
 * Whether this request would deactivate the target — the one direction that logs them out
 * everywhere, which is what the confirm copy and button colour both key off.
 */
const isDeactivating = computed(() => activeChanged.value && !selectedActive.value);

/**
 * Whether the target is the signed-in admin themselves — the one case `isDeactivating` gets an
 * extra, specific warning rather than the shared one.
 */
const isSelf = computed(() => !!props.target?.id && props.target.id === session.viewer?.id);

/**
 * The confirm step's summary lines — one per field that actually changed, in a fixed order so the
 * layout never reflows based on which combination of fields an admin picked.
 */
const summaryLines = computed(() => {
    const name = props.target?.name ?? '';
    const lines: string[] = [];
    if (roleChanged.value) {
        lines.push(t('user-access-dialog.summary-role', { name, role: selectedRole.value }));
    }
    if (activeChanged.value) {
        lines.push(
            selectedActive.value
                ? t('user-access-dialog.summary-reactivate', { name })
                : t('user-access-dialog.summary-deactivate', { name })
        );
    }
    return lines;
});

/**
 * Moves from the picker to the confirm step. A no-op when nothing changed — the button calling
 * this is disabled in that state, so only a keyboard submit could otherwise reach here.
 */
const goToConfirm = () => {
    if (!hasChanges.value) return;
    step.value = 'confirm';
};

/**
 * Emits the confirmed change — only the fields that actually differ from the loaded values, ready
 * to spread straight into a `PATCH /users/{id}` body without re-sending an unchanged role (the
 * trap this dialog exists to avoid: an unchanged `role` still re-runs the backend's grant check).
 */
const handleConfirm = () => {
    emit('confirm', {
        role: roleChanged.value ? selectedRole.value : undefined,
        active: activeChanged.value ? selectedActive.value : undefined
    });
};

/**
 * Backs out without applying anything.
 */
const handleCancel = () => {
    isOpen.value = false;
    emit('cancel');
};
</script>

<template>
    <v-dialog
        v-model="isOpen"
        max-width="480"
        :fullscreen="fullscreen"
        data-test="user-access-dialog"
    >
        <v-card v-if="target" class="p-5">
            <template v-if="step === 'pick'">
                <h2 class="mb-4 text-lg font-semibold">
                    {{ t('user-access-dialog.title-pick', { name: target.name }) }}
                </h2>

                <div class="flex flex-col gap-3">
                    <v-select
                        v-model="selectedRole"
                        :items="userRoleOptions"
                        :label="t('user-access-dialog.label-role')"
                        data-test="user-access-role"
                        hide-details
                    />
                    <v-switch
                        v-model="selectedActive"
                        :label="t('user-access-dialog.label-active')"
                        :hint="t('user-access-dialog.hint-active')"
                        color="primary"
                        persistent-hint
                        data-test="user-access-active"
                    />
                </div>

                <div class="mt-4 flex justify-end gap-2">
                    <v-btn variant="tonal" data-test="user-access-cancel" @click="handleCancel">
                        {{ t('generic.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        :disabled="!hasChanges"
                        data-test="user-access-continue"
                        @click="goToConfirm"
                    >
                        {{ t('user-access-dialog.button-continue') }}
                    </v-btn>
                </div>
            </template>

            <template v-else>
                <h2 class="mb-4 text-lg font-semibold">
                    {{ t('user-access-dialog.title-confirm', { name: target.name }) }}
                </h2>

                <ul class="mb-3 flex list-disc flex-col gap-1 pl-5">
                    <li v-for="line in summaryLines" :key="line">{{ line }}</li>
                </ul>

                <v-alert
                    v-if="isSelf && isDeactivating"
                    type="warning"
                    variant="tonal"
                    class="mb-3"
                    data-test="user-access-self-warning"
                >
                    {{ t('user-access-dialog.warning-self-deactivate') }}
                </v-alert>

                <div class="mt-4 flex justify-end gap-2">
                    <v-btn
                        v-if="!options?.skipPicker"
                        variant="text"
                        data-test="user-access-back"
                        @click="step = 'pick'"
                    >
                        {{ t('user-access-dialog.button-back') }}
                    </v-btn>
                    <v-btn variant="tonal" data-test="user-access-cancel" @click="handleCancel">
                        {{ t('generic.cancel') }}
                    </v-btn>
                    <v-btn
                        :color="isDeactivating ? 'error' : 'primary'"
                        data-test="user-access-confirm"
                        @click="handleConfirm"
                    >
                        {{ t('generic.confirm') }}
                    </v-btn>
                </div>
            </template>
        </v-card>
    </v-dialog>
</template>
