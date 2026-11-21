<script setup lang="ts">
/**
 * @module
 * The "still there?" prompt of the staff idle timeout: mounted once by `LayoutDefault.vue`. It
 * counts down from the server's own numbers (`idle` and `lifetimeEndsAt`: the seconds left that
 * each answer carries, added to the moment it landed) and opens two minutes before the session
 * would end, so a person who is reading, not acting, is asked rather than dropped
 * (WCAG 2.2.1 Timing Adjustable). It warns before WHICHEVER ends first:
 *
 * - idle: "Stay signed in" is a touch; ignoring it ends the session here a moment before the server would.
 * - lifetime cap: activity cannot extend it, so there is no "stay". It says to save the work and
 *   sign in again, and can be closed so the work can actually be saved.
 *
 * The server enforces both limits either way — this is the courtesy.
 *
 * @see boilerplate-node-backend/docs/understand/sessions.md#the-staff-idle-timeout
 */
import { DIALOG_MAX_WIDTH } from '@/ui/organisms/dialog-width.ts';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useFullscreenDialog } from '@/ui/composables/use-fullscreen-dialog.ts';
import { useSessionStore } from '@/infrastructure/session.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Whether the dialog fills the screen: it does on a phone, see `useFullscreenDialog`.
 */
const fullscreen = useFullscreenDialog();

/**
 * The session store: the idle clock to count down, and the two ways this prompt can end a session.
 */
const session = useSessionStore();

/**
 * The idle clock and the lifetime cap's deadline; `undefined` for a shopper (and, for the cap,
 * when it is off), for whom this component renders nothing.
 */
const { idle, lifetimeEndsAt } = storeToRefs(session);

/**
 * How long before the end the prompt opens, in milliseconds.
 */
const WARN_BEFORE_MS = 120_000;

/**
 * "Now", ticked once a second so the countdown is a plain computed.
 */
const now = ref(Date.now());

/**
 * The interval driving {@link now}, kept to be cleared on unmount.
 */
let ticker: ReturnType<typeof setInterval> | undefined;

/**
 * The cap deadline the visitor dismissed the warning for, or `undefined` while none was.
 *
 * Keyed on the deadline, not on a flag: every later answer re-reads it and moves it by seconds (the
 * time the answer took), while a NEW session — a sign-in in another tab, say — moves it by hours.
 */
const dismissedCapEndsAt = ref<number>();

/**
 * Whether the cap warning counts as dismissed: only while the deadline is within one warning
 * window of the one dismissed, so a re-read stays closed and a new session is warned again.
 */
const capDismissed = computed(
    () =>
        dismissedCapEndsAt.value !== undefined &&
        lifetimeEndsAt.value !== undefined &&
        lifetimeEndsAt.value <= dismissedCapEndsAt.value + WARN_BEFORE_MS
);

/**
 * Milliseconds until the session ends for inactivity; `undefined` when no timeout applies.
 */
const idleRemainingMs = computed(() => (idle.value ? idle.value.endsAt - now.value : undefined));

/**
 * Milliseconds until the lifetime cap ends the session; `undefined` when there is no cap.
 */
const capRemainingMs = computed(() =>
    lifetimeEndsAt.value === undefined ? undefined : lifetimeEndsAt.value - now.value
);

/**
 * Whether the cap is what ends the session first, so the prompt is about it: activity could not
 * change that outcome, and "stay signed in" would be a lie.
 */
const capFirst = computed(
    () =>
        capRemainingMs.value !== undefined &&
        (idleRemainingMs.value === undefined || capRemainingMs.value <= idleRemainingMs.value)
);

/**
 * Milliseconds until whichever limit ends the session first; `undefined` when none applies.
 */
const remainingMs = computed(() => (capFirst.value ? capRemainingMs.value : idleRemainingMs.value));

/**
 * Whether the prompt is showing: inside the warning window, not yet at zero, and not closed by
 * the visitor (only the cap warning can be, so the work can be saved).
 */
const isOpen = computed(
    () =>
        remainingMs.value !== undefined &&
        remainingMs.value > 0 &&
        remainingMs.value <= WARN_BEFORE_MS &&
        !(capFirst.value && capDismissed.value)
);

/**
 * The countdown as `m:ss`, for the visitor.
 */
const countdown = computed(() => {
    const seconds = Math.max(0, Math.ceil((remainingMs.value ?? 0) / 1000));
    return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`;
});

/**
 * One tick: moves the clock on, and ends the session here once the limit has passed — as an
 * ordinary expiry when the cap ran out, since the person was not inactive.
 */
const tick = () => {
    now.value = Date.now();
    if (remainingMs.value === undefined || remainingMs.value > 0) return;
    if (capFirst.value) session.signalExpired();
    else session.signalIdle();
};

/**
 * The visitor answered: count the session as active again.
 */
const stay = () => session.touchSession();

/**
 * The visitor read the cap warning and will save their work; the session still ends at the cap.
 */
const dismiss = () => {
    dismissedCapEndsAt.value = lifetimeEndsAt.value;
};

/**
 * The visitor chose to leave instead.
 */
const leave = () => session.logout();

onMounted(() => {
    ticker = setInterval(tick, 1000);
});

onUnmounted(() => {
    clearInterval(ticker);
});
</script>

<template>
    <v-dialog
        :fullscreen="fullscreen"
        :model-value="isOpen"
        persistent
        :max-width="DIALOG_MAX_WIDTH.narrow"
        role="alertdialog"
        aria-labelledby="idle-session-title"
        aria-describedby="idle-session-message"
    >
        <v-card data-test="idle-session-dialog">
            <v-card-title id="idle-session-title">
                {{ t(capFirst ? 'idle-session.lifetime-title' : 'idle-session.title') }}
            </v-card-title>
            <v-card-text id="idle-session-message">
                {{
                    t(capFirst ? 'idle-session.lifetime-message' : 'idle-session.message', {
                        time: countdown
                    })
                }}
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" data-test="idle-session-leave" @click="leave">
                    {{ t('idle-session.button-leave') }}
                </v-btn>
                <v-btn
                    v-if="capFirst"
                    color="primary"
                    variant="flat"
                    data-test="idle-session-dismiss"
                    @click="dismiss"
                >
                    {{ t('idle-session.button-dismiss') }}
                </v-btn>
                <v-btn
                    v-else
                    color="primary"
                    variant="flat"
                    data-test="idle-session-stay"
                    @click="stay"
                >
                    {{ t('idle-session.button-stay') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
