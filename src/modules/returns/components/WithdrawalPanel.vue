<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'WithdrawalPanel'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The order page's returns corner: the EU "withdraw from contract here" button (Consumer Rights
 * Directive Art. 11a), the two things the server says can still be done about goods, and what has
 * become of any withdrawal or return already opened. Both doors are fed by `GET /returns/options`
 * — cancel what has not shipped (one fulfillment order at a time, with the server's refund) and
 * return what arrived (the server's returnable quantities) — so this component counts nothing and
 * never reads the withdrawal period. The withdrawal button shows only when the server says so
 * (`Order.actions.withdraw`) and asks once more before it acts: the directive wants a confirmation
 * step, not a single click, and no reason.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { formatCurrency, formatDateTime } from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useReturnsStore } from '../store.ts';
import CancelRemainderDialog from './CancelRemainderDialog.vue';
import ReturnRequestForm from './ReturnRequestForm.vue';
import type { CancellableFulfillmentOrder, Return, ReturnOptions } from '@types';

/**
 * The order this panel belongs to, and what the server said about the button.
 */
const props = defineProps<{
    orderId: string;
    /** `Order.actions.withdraw` — whether the button is offered at all; true only for the buyer. */
    canWithdraw?: boolean;
    /** `Order.actions.withdrawUntil` — the last instant a withdrawal is valid, once the clock runs. */
    withdrawUntil?: string;
}>();

/**
 * Emitted once a withdrawal or return was opened, so the owning page re-reads the order: a
 * withdrawal before dispatch cancels it, and the panel's own state does not show that.
 */
const emit = defineEmits<
    /**
     * A withdrawal, or a return, went through.
     */
    (event: 'opened') => void
>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report the outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * The store's opening call and the per-order reads.
 */
const { openReturn, fetchOrderReturns, fetchReturnOptions } = useReturnsStore();

/**
 * True while a call is in flight; disables the button so a double click cannot open two.
 */
const { loading } = storeToRefs(useReturnsStore());

/**
 * The returns already opened on this order.
 */
const opened = ref<Return[]>([]);

/**
 * What the server says can still be returned and cancelled; `undefined` until read, or when the
 * caller may not read it.
 */
const options = ref<ReturnOptions>();

/**
 * Signed-in caller, to tell staff holding the refund key from a caller with no door at all.
 */
const session = useSessionStore();

/**
 * Who may cancel what has not shipped: the buyer (their withdrawal), or staff holding the refund
 * key (`payments.any.update`). The server makes the final call, rank included.
 */
const cancelMode = computed<'buyer' | 'staff' | undefined>(() => {
    if (props.canWithdraw) return 'buyer';
    return session.can('update', 'Payment') ? 'staff' : undefined;
});

/**
 * The remainders on offer: none for a caller with no door.
 */
const cancellable = computed(() => (cancelMode.value ? (options.value?.cancellable ?? []) : []));

/**
 * The lines the returns form offers, as the server counted them.
 */
const returnLines = computed(() => options.value?.returnable ?? []);

/**
 * The remainder whose cancel dialog is open, if any.
 */
const cancelling = ref<CancellableFulfillmentOrder>();

/**
 * Two-way flag for the cancel dialog, derived from {@link cancelling}.
 */
const cancelOpen = computed({
    get: () => cancelling.value !== undefined,
    set: (open: boolean) => {
        if (!open) cancelling.value = undefined;
    }
});

/**
 * The withdrawal button's own blocked state — a closed window or an order that moved on arrives as
 * the server's own message and blocks the one button in place.
 */
const {
    message: withdrawError,
    report: reportWithdrawError,
    clear: clearWithdrawError
} = useBlockingError();

/**
 * Loads this order's returns and what is still on offer; a failed read leaves them empty rather
 * than blocking the button (the options read is refused to callers without the right).
 *
 * @returns A promise settling once both are loaded.
 */
const loadOpened = () =>
    Promise.all([
        fetchOrderReturns(props.orderId).catch(() => []),
        fetchReturnOptions(props.orderId).catch(() => undefined)
    ]).then(([items, loadedOptions]) => {
        opened.value = items;
        options.value = loadedOptions;
    });

/**
 * Asks for confirmation, then withdraws from the whole order.
 *
 * @returns A promise settling once the withdrawal was sent; a refusal blocks the button in place.
 */
const handleWithdraw = () =>
    useDialogStore()
        .confirm({
            message: t('withdrawal-panel.confirm', { id: props.orderId }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearWithdrawError();
            return openReturn({ orderId: props.orderId, reason: 'withdrawal' })
                .then(() => {
                    addMessage(t('withdrawal-panel.success'));
                    emit('opened');
                    return loadOpened();
                })
                .catch((error: unknown) => reportWithdrawError(error));
        });

/**
 * A return from the form went through: re-read this order's list (it shrinks what is left to
 * offer) and tell the page.
 *
 * @returns A promise settling once the list is reloaded.
 */
const handleReturnOpened = () => {
    emit('opened');
    return loadOpened();
};

/**
 * A remainder was cancelled: re-read the lists (its refund shrank what is on offer) and tell the
 * page, whose order status may have moved.
 *
 * @returns A promise settling once the lists are reloaded.
 */
const handleCancelled = () => {
    emit('opened');
    return loadOpened();
};

onMounted(loadOpened);
</script>

<template>
    <section
        v-if="canWithdraw || opened.length > 0 || returnLines.length > 0 || cancellable.length > 0"
        class="flex flex-col gap-3"
        data-test="withdrawal-panel"
    >
        <h3 class="m-0 text-base font-semibold">{{ t('withdrawal-panel.title') }}</h3>

        <template v-if="canWithdraw">
            <p class="m-0 text-sm opacity-75" data-test="withdrawal-until">
                {{
                    withdrawUntil
                        ? t('withdrawal-panel.until', { date: formatDateTime(withdrawUntil) })
                        : t('withdrawal-panel.until-delivery')
                }}
            </p>
            <v-btn
                color="error"
                variant="tonal"
                data-test="withdraw-button"
                :disabled="loading"
                @click="handleWithdraw"
            >
                {{ t('withdrawal-panel.button') }}
            </v-btn>
            <InlineErrorAlert :message="withdrawError" data-test="withdraw-error" />
        </template>

        <ul
            v-if="cancellable.length > 0"
            class="m-0 flex list-none flex-col gap-2 p-0"
            data-test="cancellable-list"
        >
            <li
                v-for="option in cancellable"
                :key="'cancellable-' + option.fulfillmentOrderId"
                class="flex flex-wrap items-center justify-between gap-3"
                data-test="cancellable-item"
            >
                <span class="text-sm">
                    {{ t('withdrawal-panel.cancel-line', { number: option.number }) }}
                    ·
                    {{ formatCurrency(option.refundAmount, options?.currency ?? '') }}
                </span>
                <v-btn
                    variant="tonal"
                    size="small"
                    color="error"
                    :disabled="loading"
                    data-test="cancel-remainder-open"
                    @click="cancelling = option"
                >
                    {{ t('withdrawal-panel.button-cancel-rest') }}
                </v-btn>
            </li>
        </ul>
        <p
            v-if="cancellable.length > 0 && cancelMode === 'buyer'"
            class="m-0 text-sm opacity-75"
            data-test="cancel-hint"
        >
            {{ t('withdrawal-panel.cancel-hint') }}
        </p>

        <ReturnRequestForm
            v-if="returnLines.length > 0"
            :order-id="orderId"
            :lines="returnLines"
            @opened="handleReturnOpened"
        />

        <ul v-if="opened.length > 0" class="m-0 flex list-none flex-col gap-2 p-0">
            <li
                v-for="item in opened"
                :key="'order-return-' + item.id"
                class="flex items-center justify-between gap-3"
                data-test="order-return"
            >
                <router-link
                    :to="routerLinkI18n({ name: 'ReturnTarget', params: { id: item.id } })"
                >
                    {{ t(`returns-form.reason-${item.reason}`) }}
                </router-link>
                <v-chip size="small" variant="tonal" color="tertiary">
                    {{ t(`returns-form.status-${item.status}`) }}
                </v-chip>
            </li>
        </ul>

        <CancelRemainderDialog
            v-if="cancelling && cancelMode"
            v-model="cancelOpen"
            :order-id="orderId"
            :currency="options?.currency ?? ''"
            :option="cancelling"
            :mode="cancelMode"
            @cancelled="handleCancelled"
        />
    </section>
</template>
