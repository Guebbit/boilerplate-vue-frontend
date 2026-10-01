<script lang="ts">
export default {
    name: 'UserTargetPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * User detail (read-only) page. Loads one user by route id and renders its
 * fields, role and status, plus the audited, no-proof-required 2FA recovery
 * button for an admin who lost both their authenticator and their backup
 * codes, and the `UserAccessDialog` shortcut for changing role/active status
 * without opening the full edit form.
 */
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/modules/users/store';
import { useUserAccessDialog } from '@/modules/users/composables/use-user-access-dialog.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { Calendar, Circle, Clock, Hash, Mail, Shield, User } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import UserAccessDialog from '@/modules/users/components/UserAccessDialog.vue';
import { formatText, formatDateTime, formatFlag } from '@/infrastructure/utils/formatters.ts';

/**
 * Translations helper.
 */
const { t } = useI18n();

/**
 * Route user id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * User store API and state references.
 */
const { watchUser } = useUsersStore();

/**
 * The session, for the `meta.can` rule that gates the "History" link — a reader who cannot read
 * the audit trail should not see a link that 403s.
 */
const session = useSessionStore();

/**
 * Router instance, for the `hasRoute` check below — `admin` is not a coupling this module's
 * `MODULE_EDGES` entry declares, so the history button's link is guarded rather than assumed
 * (FA86).
 */
const router = useRouter();

/**
 * The user being displayed.
 */
const { currentUser } = storeToRefs(useUsersStore());

/**
 * The audit-log link the history button offers, for the user currently shown — `undefined`,
 * hiding the button entirely, on a build with no `admin` module. The button's own
 * `session.can('read', 'AuditLog')` check stays alongside it — one answers "does this build even
 * have an audit log", the other "may THIS visitor see it".
 */
const auditLogTo = computed(() =>
    currentUser.value
        ? linkIfRouted(router, 'AuditLog', undefined, { target: currentUser.value.id })
        : undefined
);

/**
 * Hero heading.
 *
 * @returns The loaded username, the route id while loading, or the generic page
 *  title as a last resort.
 */
const heroTitle = computed(
    () => currentUser.value?.username ?? id ?? t('user-target-page.page-title')
);

/**
 * Hero subheading.
 *
 * @returns The user email, or the empty-value glyph when unknown.
 */
const heroDescription = computed(() => formatText(currentUser.value?.email));

/**
 * Label of the role chip.
 *
 * @returns The role's own name, or the empty-value glyph while the user is
 *  unknown. Not a translated administrator/standard pair: roles are data a
 *  deployment may add to, and only the rules say what each one may do.
 */
const userRole = computed(() => formatText(currentUser.value?.role));

/**
 * Label of the status chip.
 *
 * @returns The localized enabled/disabled wording, or the empty-value glyph
 *  while the user is unknown.
 */
const userStatus = computed(() =>
    formatFlag(currentUser.value?.active, t('generic.enabled'), t('generic.disabled'))
);

/**
 * What a 404 or 403 on the routed record does: the Error page, not a page left on its placeholders.
 */
const onMissingRecord = useMissingRecord();

/**
 * Selects and (re)fetches the user whenever the route id changes.
 */
watchUser(() => id, { onError: onMissingRecord });

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Turns a user's second factor off, as an administrator — the recovery path when they have
 * lost every method — plus the role/active-status writes `UserAccessDialog` confirms below.
 */
const { adminDisableTwoFactor, updateUser } = useUsersStore();

/**
 * `UserAccessDialog`'s open state, target and picker options, plus the promise-returning
 * `request()` this page's "Manage access" button awaits — see `use-user-access-dialog.ts`.
 */
const {
    isOpen: accessDialogOpen,
    target: accessDialogTarget,
    options: accessDialogOptions,
    request: requestAccessChange,
    confirm: confirmAccessChange,
    cancel: cancelAccessChange
} = useUserAccessDialog();

/**
 * This action's own blocked state — same reasoning as {@link disableTwoFactorError} below.
 */
const {
    message: accessError,
    report: reportAccessError,
    clear: clearAccessError
} = useBlockingError();

/**
 * Opens `UserAccessDialog` for the currently loaded user and, once confirmed, sends only the
 * fields that actually changed — see `UserAccessDialog.vue`'s own note on why an unchanged `role`
 * must never ride along in the same `PATCH`.
 *
 * @returns A promise settling once the dialog closes and, if accepted, the update has finished; a
 *  failure blocks this action in place ({@link accessError}).
 */
const handleManageAccess = () => {
    const target = currentUser.value;
    if (!target) return;
    return requestAccessChange({
        id: target.id,
        name: target.username,
        role: target.role,
        active: target.active
    }).then((result) => {
        if (!result) return;
        clearAccessError();
        return updateUser(target.id, result)
            .then(() => addMessage(t('user-target-page.success-access-update')))
            .catch((error: unknown) => reportAccessError(error));
    });
};

/**
 * This button's own blocked state — the only write action on this page, so a failure renders
 * through {@link InlineErrorAlert} next to it rather than a toast — see
 * docs/theory/request-flow.md.
 */
const {
    message: disableTwoFactorError,
    report: reportDisableTwoFactorError,
    clear: clearDisableTwoFactorError
} = useBlockingError();

/**
 * Strips this user's second factor after an explicit confirmation — the one deliberate exception
 * to "prove the factor to remove it", for an owner who has lost both their authenticator and
 * their backup codes. No code is asked for, which is exactly why the confirmation has to say so:
 * every call is audited server-side, but nothing here re-proves it is really them.
 *
 * @returns Nothing; a failure blocks the button in place ({@link disableTwoFactorError}).
 */
const handleDisableTwoFactor = () => {
    if (!id) return;
    return useDialogStore()
        .confirm({
            message: t('user-target-page.confirm-disable-two-factor', {
                name: currentUser.value?.username ?? id
            }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearDisableTwoFactorError();
            return adminDisableTwoFactor(id)
                .then(() => addMessage(t('user-target-page.success-disable-two-factor')))
                .catch((error) => reportDisableTwoFactorError(error));
        });
};
</script>

<template>
    <div id="user-target">
        <ItemDetailLayout accent="secondary">
            <template #hero>
                <ItemDetailHero
                    :title="heroTitle"
                    :description="heroDescription"
                    :eyebrow="currentUser?.id"
                    :has-image="true"
                    :image-url="currentUser?.imageUrl"
                    :thumbnail-url="currentUser?.thumbnailUrl"
                    :image-alt="t('user-target-page.image-alt', { name: heroTitle })"
                />
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('user-target-page.label-email')"
                    :value="formatText(currentUser?.email)"
                />
                <CardMaterialStat
                    :title="t('user-target-page.label-role')"
                    :value="userRole"
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('user-target-page.label-active')"
                    :value="userStatus"
                    accent="tertiary"
                />
            </template>

            <CardDetail>
                <h3 class="mb-5 text-lg font-semibold">{{ t('generic.details') }}</h3>

                <div v-if="currentUser" class="grid gap-4 sm:grid-cols-2">
                    <ItemDetailField
                        :label="t('user-target-page.label-id')"
                        :value="currentUser.id"
                        :icon="Hash"
                    />
                    <ItemDetailField
                        :label="t('user-target-page.label-username')"
                        :value="currentUser.username"
                        :icon="User"
                    />
                    <ItemDetailField
                        :label="t('user-target-page.label-email')"
                        :value="currentUser.email"
                        :icon="Mail"
                    />
                    <ItemDetailField :label="t('user-target-page.label-role')" :icon="Shield">
                        <v-chip variant="tonal" color="secondary" class="font-semibold">
                            {{ userRole }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField :label="t('user-target-page.label-active')" :icon="Circle">
                        <v-chip variant="tonal" color="secondary" class="font-semibold">
                            {{ userStatus }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        :label="t('user-target-page.label-updated-at')"
                        :value="formatDateTime(currentUser.updatedAt)"
                        :icon="Clock"
                        full-width
                    />
                </div>
                <p v-else class="m-0 opacity-75">{{ t('generic.loading-state') }}</p>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" accent="secondary">
                        <template #icon><User :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('user-target-page.label-created-at')"
                        :value="formatDateTime(currentUser?.createdAt)"
                        :icon="Calendar"
                    />
                    <ItemDetailField
                        :label="t('user-target-page.label-updated-at')"
                        :value="formatDateTime(currentUser?.updatedAt)"
                        :icon="Clock"
                    />
                </CardDetail>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentUser"
                    color="secondary"
                    :to="routerLinkI18n({ name: 'UserEdit', params: { id: currentUser.id } })"
                >
                    {{ t('user-target-page.button-go-to-edit') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'UsersList' })">
                    {{ t('user-target-page.button-go-to-list') }}
                </v-btn>
                <v-btn
                    v-if="auditLogTo && session.can('read', 'AuditLog')"
                    variant="tonal"
                    data-test="user-history"
                    :to="routerLinkI18n(auditLogTo)"
                >
                    {{ t('user-target-page.button-history') }}
                </v-btn>
                <div v-if="currentUser" class="flex flex-col gap-2">
                    <v-btn
                        variant="tonal"
                        color="secondary"
                        data-test="user-manage-access"
                        @click="handleManageAccess"
                    >
                        {{ t('user-target-page.button-manage-access') }}
                    </v-btn>
                    <InlineErrorAlert :message="accessError" data-test="user-manage-access-error" />

                    <!--
                        B9: a user with no second factor has nothing to strip — showing this
                        unconditionally let an admin write a misleading "disabled 2FA" entry to an
                        audit trail for someone who never had it enabled.
                    -->
                    <v-btn
                        v-if="currentUser.twoFactorEnabledAt"
                        variant="text"
                        color="error"
                        data-test="user-disable-two-factor"
                        @click="handleDisableTwoFactor"
                    >
                        {{ t('user-target-page.button-disable-two-factor') }}
                    </v-btn>
                    <InlineErrorAlert
                        :message="disableTwoFactorError"
                        data-test="user-disable-two-factor-error"
                    />
                </div>
            </template>
        </ItemDetailLayout>

        <UserAccessDialog
            v-model="accessDialogOpen"
            :target="accessDialogTarget"
            :options="accessDialogOptions"
            @confirm="confirmAccessChange"
            @cancel="cancelAccessChange"
        />
    </div>
</template>
