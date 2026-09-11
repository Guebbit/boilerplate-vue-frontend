<script lang="ts">
export default {
    name: 'ProfileRole'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Self-service role switch, visible only to an admin viewing their own profile. A `watch` on the
 * profile record re-seeds the select whenever it changes, and `roleIsDirty`/`handleRoleChange`
 * confirm only the one direction that cannot be undone by the visitor alone: demoting themselves.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useDialogStore } from '@/ui/dialog.ts';

/**
 * The role-change widget — an admin viewing their OWN profile can move their own role between
 * standard and administrator. Renders nothing for a non-admin: self-gating keeps that rule with
 * the widget it governs, rather than with whichever page happens to embed it.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Changes the visitor's own role — administrators only, and irreversible from here.
 */
const { updateOwnRole } = useProfileStore();

/**
 * The signed-in visitor's profile record.
 */
const { profile } = storeToRefs(useProfileStore());

/**
 * The two role names this widget moves between.
 *
 * Named here rather than typed inline because the strings are the contract: the server validates
 * them against `shared/authorization-roles.yaml`, and a typo would be a role nothing declares.
 */
const UNRESTRICTED_ROLE = 'owner';
const STANDARD_ROLE = 'customer';

/**
 * Whether the signed-in visitor is an administrator.
 */
const session = useSessionStore();

/**
 * The role name shown in the select.
 *
 * Seeded from the record and re-seeded whenever it changes underneath — the profile form's
 * "hydrate, never clobber" rule, without the dirty guard: a two-option select holds no keystrokes
 * that a refresh could garble.
 */
const selectedRole = ref(STANDARD_ROLE);

watch(
    profile,
    (userProfile) => {
        selectedRole.value = userProfile?.role ?? STANDARD_ROLE;
    },
    { immediate: true }
);

/**
 * The two role choices, translated.
 *
 * Two of the six presets, because this widget only exists to hand administration of a shop over
 * or give it up. Assigning `manager`, `warehouse` or `support` is the staff screen's job, where
 * it is a decision about someone else.
 */
const roleOptions = computed(() => [
    { value: UNRESTRICTED_ROLE, title: t('generic.administrator') },
    { value: STANDARD_ROLE, title: t('generic.standard-user') }
]);

/**
 * Whether the select has been moved away from what the record says.
 */
const roleIsDirty = computed(() => selectedRole.value !== (profile.value?.role ?? STANDARD_ROLE));

/**
 * Applies the chosen role, confirming first when it gives administrator rights away.
 *
 * Only that direction asks. Demoting yourself is the one change on this page nobody can undo for
 * themselves — the admin routes are precisely what you would have to reach to put it back — while
 * promoting yourself needs no warning from a form you already had the rights to submit.
 *
 * The select is put back on refusal and on failure, so it never shows a role the record does not
 * hold.
 *
 * @returns A promise resolving once the change settles, reported as a toast.
 */
const handleRoleChange = () => {
    if (!roleIsDirty.value) return Promise.resolve();
    const wanted = selectedRole.value;
    const restore = () => {
        selectedRole.value = profile.value?.role ?? STANDARD_ROLE;
    };

    return (
        wanted === UNRESTRICTED_ROLE
            ? Promise.resolve(true)
            : useDialogStore().confirm({
                  message: t('profile-page.confirm-self-demote'),
                  color: 'error'
              })
    ).then((accepted) => {
        if (!accepted) {
            restore();
            return;
        }
        return updateOwnRole(wanted)
            .then(() => addMessage(t('profile-page.success-role-change')))
            .catch((error) => {
                restore();
                notifyErrorMessages(addMessage, error);
            });
    });
};
</script>

<template>
    <!--
        Its own block, deliberately outside the main profile form: a role change goes to a
        different endpoint under a different authorisation, and folding it into "Save changes"
        would put two authorisations behind one button.
    -->
    <template v-if="session.can('read', 'User')">
        <v-divider class="my-6" />

        <section data-test="profile-role">
            <h2 class="mb-1 text-lg font-semibold">{{ t('profile-page.role-title') }}</h2>
            <p class="mb-4 opacity-80">{{ t('profile-page.role-intro') }}</p>

            <v-select
                v-model="selectedRole"
                :items="roleOptions"
                :label="t('profile-page.label-role')"
                data-test="role-select"
            />

            <v-btn
                color="primary"
                :disabled="!roleIsDirty"
                data-test="role-submit"
                @click="handleRoleChange"
            >
                {{ t('profile-page.button-submit-role') }}
            </v-btn>
        </section>
    </template>
</template>
