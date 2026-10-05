<script setup lang="ts">
/**
 * @module
 * The app bar's bell, contributed to the shell's `app-bar` slot by this module's manifest. A
 * badge counts the unread notifications; opening the panel marks them read on the server and lists
 * them newest first, each with a delete button, plus "Clear all". Renders nothing for a guest.
 *
 * It is also where the inbox lifecycle starts, because it is mounted for as long as the shell is:
 * `useInboxLifecycle` fetches the inbox and opens the live stream while a person who may read
 * notifications is signed in.
 */
import { computed, ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { Bell, Trash2 } from 'lucide-vue-next';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { useInboxLifecycle } from '../composables/use-inbox-lifecycle';
import { useInboxStore } from '../store';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Whether this session may read notifications; the lifecycle composable also starts the inbox.
 */
const mayRead = useInboxLifecycle();

/**
 * The inbox store: the list, the unread count and the writes.
 */
const inbox = useInboxStore();

/**
 * The list the panel renders and the count the badge wears, reactive.
 */
const { items, unreadCount } = storeToRefs(inbox);

/**
 * The panel heading's element id: what the dialog's `aria-labelledby` points at.
 */
const TITLE_ID = 'notifications-panel-title';

/**
 * Whether the panel is open.
 */
const open = ref(false);

/**
 * The ids that were unread the moment the panel opened. Opening marks everything read, so without
 * this the reader would never see which ones were new.
 */
const freshIds = ref<ReadonlySet<string>>(new Set());

/**
 * The panel card, so focus can move into it when it opens.
 */
const panel = ref<ComponentPublicInstance | null>(null);

/**
 * The bell's accessible name: it says how many are unread, since the badge alone is a bare number.
 */
const bellLabel = computed(() =>
    unreadCount.value > 0
        ? t('notifications.bell-label-unread', { count: unreadCount.value }, unreadCount.value)
        : t('notifications.bell-label')
);

/**
 * The panel opened or closed. Opening remembers what was new, then tells the server it was read.
 *
 * @param isOpen - The menu's new state.
 */
const onToggle = (isOpen: boolean) => {
    if (!isOpen) return;
    freshIds.value = new Set(items.value.filter(({ unread }) => unread).map(({ id }) => id));
    void inbox.markAllRead();
};

/**
 * Moves focus into the panel once it is on screen, so a keyboard user lands inside it rather
 * than on the bell they just pressed. Skipped when focus already moved in on its own.
 */
const focusPanel = () => {
    // `$el` is typed `any`; for a Vuetify card it is the card's root element, or absent before it mounts.
    const card = panel.value?.$el as HTMLElement | undefined;
    if (card && !card.contains(document.activeElement)) card.focus();
};
</script>

<template>
    <!--
        `close-on-content-click` is off: the panel has buttons of its own (delete, clear all), and a
        click on any of them must not close it under the reader.
    -->
    <v-menu
        v-if="mayRead"
        v-model="open"
        :close-on-content-click="false"
        :activator-props="{ 'aria-haspopup': 'dialog' }"
        location="bottom end"
        @update:model-value="onToggle"
        @after-enter="focusPanel"
    >
        <template #activator="{ props: menuProps }">
            <v-badge
                :model-value="unreadCount > 0"
                :content="unreadCount"
                :label="t('notifications.bell-label-unread', { count: unreadCount }, unreadCount)"
                color="primary"
                :data-test="unreadCount > 0 ? 'notifications-badge' : undefined"
            >
                <v-btn
                    v-bind="menuProps"
                    icon
                    variant="text"
                    :aria-label="bellLabel"
                    :title="t('notifications.bell-label')"
                    data-test="notifications-bell"
                >
                    <Bell :size="20" aria-hidden="true" />
                </v-btn>
            </v-badge>
        </template>

        <!--
            A dialog, not a menu: it holds buttons and reading text, which `role="menu"` does not
            permit. `tabindex="-1"` makes the card focusable by script for `focusPanel`.
        -->
        <v-card
            ref="panel"
            role="dialog"
            :aria-labelledby="TITLE_ID"
            tabindex="-1"
            class="w-[min(420px,calc(100vw-2rem))]"
            data-test="notifications-panel"
        >
            <div class="flex items-center justify-between gap-2 px-4 pt-3">
                <h2 :id="TITLE_ID" class="text-base font-medium">
                    {{ t('notifications.panel-title') }}
                </h2>
                <v-btn
                    v-if="items.length > 0"
                    variant="text"
                    size="small"
                    data-test="notifications-clear-all"
                    @click="inbox.dismissAll()"
                >
                    {{ t('notifications.button-clear-all') }}
                </v-btn>
            </div>

            <p
                v-if="items.length === 0"
                class="px-4 py-6 text-center text-sm opacity-70"
                data-test="notifications-empty"
            >
                {{ t('notifications.empty') }}
            </p>

            <v-list v-else class="max-h-[60vh] overflow-y-auto" lines="two">
                <v-list-item
                    v-for="item in items"
                    :key="item.id"
                    :data-test="`notification-${item.id}`"
                >
                    <!-- `item.type` is a Vuetify theme colour name, so `bg-<type>` is its swatch. -->
                    <template #prepend>
                        <span
                            class="mr-3 inline-block size-2.5 shrink-0 rounded-full"
                            :class="`bg-${item.type}`"
                            aria-hidden="true"
                        />
                    </template>

                    <v-list-item-title class="text-wrap">{{ item.text }}</v-list-item-title>
                    <v-list-item-subtitle>
                        <time :datetime="item.createdAt">{{ formatDateTime(item.createdAt) }}</time>
                        <v-chip
                            v-if="freshIds.has(item.id)"
                            size="x-small"
                            color="primary"
                            class="ml-2"
                            data-test="notification-new"
                        >
                            {{ t('notifications.unread') }}
                        </v-chip>
                    </v-list-item-subtitle>

                    <template #append>
                        <v-btn
                            icon
                            size="small"
                            variant="text"
                            :aria-label="
                                t('notifications.button-delete-named', { text: item.text })
                            "
                            data-test="notification-delete"
                            @click="inbox.dismiss(item.id)"
                        >
                            <Trash2 :size="18" aria-hidden="true" />
                        </v-btn>
                    </template>
                </v-list-item>
            </v-list>
        </v-card>
    </v-menu>
</template>
