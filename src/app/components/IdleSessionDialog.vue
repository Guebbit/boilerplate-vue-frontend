<script setup lang="ts">
/**
 * @module
 * The "still there?" prompt of the staff idle timeout: mounted once by `LayoutDefault.vue`. It
 * counts down from the server's own numbers (`idle`, read from `POST /account/session/touch`) and
 * opens two minutes before the session would end, so a person who is reading, not acting, is asked
 * rather than dropped (WCAG 2.2.1 Timing Adjustable). "Stay signed in" is a touch; ignoring it
 * ends the session here a moment before the server would. The server enforces the limit either
 * way — this is the courtesy. See docs/theory/sessions.md#the-staff-idle-timeout.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/infrastructure/session.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The session store: the idle clock to count down, and the two ways this prompt can end a session.
 */
const session = useSessionStore();

/**
 * The idle clock; `undefined` for a shopper, for whom this component renders nothing.
 */
const { idle } = storeToRefs(session);

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
 * Milliseconds until the session ends for inactivity; `undefined` when no timeout applies.
 */
const remainingMs = computed(() =>
    idle.value ? idle.value.lastActiveAt + idle.value.timeoutMs - now.value : undefined
);

/**
 * Whether the prompt is showing: inside the warning window, not yet at zero.
 */
const isOpen = computed(
    () =>
        remainingMs.value !== undefined &&
        remainingMs.value > 0 &&
        remainingMs.value <= WARN_BEFORE_MS
);

/**
 * The countdown as `m:ss`, for the visitor.
 */
const countdown = computed(() => {
    const seconds = Math.max(0, Math.ceil((remainingMs.value ?? 0) / 1000));
    return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`;
});

/**
 * One tick: moves the clock on, and ends the session here once the limit has passed.
 */
const tick = () => {
    now.value = Date.now();
    if (remainingMs.value !== undefined && remainingMs.value <= 0) session.signalIdle();
};

/**
 * The visitor answered: count the session as active again.
 */
const stay = () => session.touchSession();

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
        :model-value="isOpen"
        persistent
        max-width="420"
        role="alertdialog"
        aria-labelledby="idle-session-title"
        aria-describedby="idle-session-message"
    >
        <v-card data-test="idle-session-dialog">
            <v-card-title id="idle-session-title">{{ t('idle-session.title') }}</v-card-title>
            <v-card-text id="idle-session-message">
                {{ t('idle-session.message', { time: countdown }) }}
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" data-test="idle-session-leave" @click="leave">
                    {{ t('idle-session.button-leave') }}
                </v-btn>
                <v-btn color="primary" variant="flat" data-test="idle-session-stay" @click="stay">
                    {{ t('idle-session.button-stay') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
