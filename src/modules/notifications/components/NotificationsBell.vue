<script setup lang="ts">
/**
 * @module
 * The app bar's bell, contributed to the shell's `app-bar` slot by this module's manifest. A
 * badge counts the unread notifications; opening the panel marks them read on the server and lists
 * them newest first, each with a delete button, plus "Clear all". Renders nothing for a guest.
 * A person who holds work notices (staff) gets two tabs, "Mine" and "Work"; the badge stays the
 * total unread and the Work tab wears its own count.
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
import { useOrderLink } from '@/kernel/order-link.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { useInboxLifecycle } from '../composables/use-inbox-lifecycle';
import { useNotificationLink } from '../composables/use-notification-link';
import { useInboxStore } from '../store';
import type { InboxItem } from '../types';

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
const { items, unreadCount, hasWork } = storeToRefs(inbox);

/**
 * The panel's two groups.
 */
type PanelTab = 'mine' | 'work';

/**
 * Which row audience each tab lists.
 */
const TAB_AUDIENCE = { mine: 'own', work: 'staff' } as const;

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
 * The tab shown when the panel is split. Falls back to `mine` the moment the last work notice
 * goes, since the tabs go with it.
 */
const chosenTab = ref<PanelTab>('mine');

/**
 * The tab actually in force: `mine` whenever there are no tabs.
 */
const tab = computed<PanelTab>(() => (hasWork.value ? chosenTab.value : 'mine'));

/**
 * The rows of the tab in force. Without work notices there are no tabs and every row is shown.
 */
const shownItems = computed(() =>
    hasWork.value
        ? items.value.filter(({ audience }) => audience === TAB_AUDIENCE[tab.value])
        : items.value
);

/**
 * How many work notices the Work tab announces: the unread ones plus those that were new when the
 * panel opened (opening marks them read, which would otherwise zero the count the moment it is seen).
 */
const workCount = computed(
    () =>
        items.value.filter(
            ({ audience, unread, id }) => audience === 'staff' && (unread || freshIds.value.has(id))
        ).length
);

/**
 * "Clear all": the tab in view when the panel is split, else the whole inbox. One call either way;
 * the server filters by audience.
 */
const clearAll = () => inbox.dismissAll(hasWork.value ? TAB_AUDIENCE[tab.value] : undefined);

/**
 * The notice's order page, or nothing when it has none or this build ships no order page.
 */
const orderLink = useOrderLink();

/**
 * A work notice's screen in the admin, or nothing when this build or this reader has none.
 */
const targetLink = useNotificationLink();

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
 * The tab the panel opens on: Work when only Work has unread rows, Mine otherwise (a tie, or
 * nothing unread, stays on Mine).
 *
 * @param rows - The panel's rows as they are the moment it opens.
 * @returns The tab to show first.
 */
const firstTab = (rows: readonly InboxItem[]): PanelTab => {
    const unreadOf = (audience: InboxItem['audience']) =>
        rows.some((row) => row.unread && row.audience === audience);
    return unreadOf('staff') && !unreadOf('own') ? 'work' : 'mine';
};

/**
 * The panel opened or closed. Opening remembers what was new, then tells the server it was read.
 *
 * @param isOpen - The menu's new state.
 */
const onToggle = (isOpen: boolean) => {
    if (!isOpen) return;
    freshIds.value = new Set(items.value.filter(({ unread }) => unread).map(({ id }) => id));
    chosenTab.value = firstTab(items.value);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- the inbox store reports its own failure
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
            class="w-toast"
            data-test="notifications-panel"
        >
            <div class="flex items-center justify-between gap-2 px-4 pt-3">
                <h2 :id="TITLE_ID" class="text-base font-medium">
                    {{ t('notifications.panel-title') }}
                </h2>
                <v-btn
                    v-if="shownItems.length > 0"
                    variant="text"
                    size="small"
                    data-test="notifications-clear-all"
                    @click="clearAll()"
                >
                    {{ t('notifications.button-clear-all') }}
                </v-btn>
            </div>

            <!-- Staff only: the chip carries the count in the tab's accessible name too, so it is not read twice. -->
            <v-tabs
                v-if="hasWork"
                v-model="chosenTab"
                :aria-label="t('notifications.tabs-label')"
                density="comfortable"
                data-test="notifications-tabs"
            >
                <v-tab
                    value="mine"
                    id="notifications-tab-mine"
                    aria-controls="notifications-tabpanel"
                    data-test="notifications-tab-mine"
                >
                    {{ t('notifications.tab-mine') }}
                </v-tab>
                <v-tab
                    value="work"
                    id="notifications-tab-work"
                    aria-controls="notifications-tabpanel"
                    :aria-label="
                        workCount > 0
                            ? t('notifications.tab-work-unread', { count: workCount }, workCount)
                            : undefined
                    "
                    data-test="notifications-tab-work"
                >
                    {{ t('notifications.tab-work') }}
                    <v-chip
                        v-if="workCount > 0"
                        size="x-small"
                        color="primary"
                        class="ml-2"
                        aria-hidden="true"
                        data-test="notifications-tab-work-count"
                    >
                        {{ workCount }}
                    </v-chip>
                </v-tab>
            </v-tabs>

            <div
                id="notifications-tabpanel"
                :role="hasWork ? 'tabpanel' : undefined"
                :aria-labelledby="hasWork ? `notifications-tab-${tab}` : undefined"
            >
                <p
                    v-if="shownItems.length === 0"
                    class="px-4 py-6 text-center text-sm opacity-muted"
                    data-test="notifications-empty"
                >
                    {{ t('notifications.empty') }}
                </p>

                <!-- eslint-disable-next-line better-tailwindcss/no-restricted-classes -- the list never outgrows a phone; a share of the viewport is the rule, not a scale step -->
                <v-list v-else class="max-h-[60dvh] overflow-y-auto" lines="two">
                    <v-list-item
                        v-for="item in shownItems"
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

                        <v-list-item-title class="whitespace-normal">{{
                            item.text
                        }}</v-list-item-title>
                        <v-list-item-subtitle>
                            <time :datetime="item.createdAt">{{
                                formatDateTime(item.createdAt)
                            }}</time>
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
                        <router-link
                            v-if="orderLink(item.orderId)"
                            :to="orderLink(item.orderId)!"
                            class="text-sm underline"
                            data-test="notification-order-link"
                        >
                            {{ t('notifications.link-order') }}
                        </router-link>

                        <router-link
                            v-if="targetLink(item.target)"
                            :to="targetLink(item.target)!"
                            class="text-sm underline"
                            data-test="notification-target-link"
                        >
                            {{ t('notifications.link-target') }}
                        </router-link>

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
            </div>
        </v-card>
    </v-menu>
</template>
