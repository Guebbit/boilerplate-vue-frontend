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
const { addMessage } = useNotificationsStore();
const { updateOwnRole } = useProfileStore();
const { profile } = storeToRefs(useProfileStore());
const { isAdmin } = storeToRefs(useSessionStore());

/**
 * The role shown in the admin-only select.
 *
 * Seeded from the record and re-seeded whenever it changes underneath — the profile form's
 * "hydrate, never clobber" rule, without the dirty guard: a two-option select holds no keystrokes
 * that a refresh could garble.
 */
const roleIsAdmin = ref(false);

watch(
    profile,
    (userProfile) => {
        roleIsAdmin.value = Boolean(userProfile?.admin);
    },
    { immediate: true }
);

/**
 * The two role choices, translated.
 */
const roleOptions = computed(() => [
    { value: true, title: t('generic.administrator') },
    { value: false, title: t('generic.standard-user') }
]);

/**
 * Whether the select has been moved away from what the record says.
 */
const roleIsDirty = computed(() => roleIsAdmin.value !== Boolean(profile.value?.admin));

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
    const wanted = roleIsAdmin.value;
    const restore = () => {
        roleIsAdmin.value = Boolean(profile.value?.admin);
    };

    return (
        wanted
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
    <template v-if="isAdmin">
        <v-divider class="my-6" />

        <section data-test="profile-role">
            <h2 class="mb-1 text-lg font-semibold">{{ t('profile-page.role-title') }}</h2>
            <p class="mb-4 opacity-80">{{ t('profile-page.role-intro') }}</p>

            <v-select
                v-model="roleIsAdmin"
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
