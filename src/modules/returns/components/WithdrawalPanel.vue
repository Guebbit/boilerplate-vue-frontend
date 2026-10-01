<script lang="ts">
export default {
    name: 'WithdrawalPanel'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The order page's returns corner: the EU "withdraw from contract here" button (Consumer Rights
 * Directive Art. 11a), the returns form for faulty or wrong goods and part-orders, and what has
 * become of any withdrawal or return already opened on the order. The withdrawal button shows
 * only when the server says so (`Order.actions.withdraw`) — this component never counts the
 * withdrawal period — and asks once more before it acts: the directive wants a confirmation step, not
 * a single click, and no reason. The returns form is offered once goods have shipped.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useReturnsStore } from '../store.ts';
import { isReturnableOrderStatus, returnableLines } from '../domain/returnable-lines.ts';
import ReturnRequestForm from './ReturnRequestForm.vue';
import type { Order, Return } from '@types';

/**
 * The order this panel belongs to, and what the server said about the button.
 */
const props = defineProps<{
    orderId: string;
    /** `Order.actions.withdraw` — whether the button is offered at all. */
    canWithdraw?: boolean;
    /** `Order.actions.withdrawUntil` — the last instant a withdrawal is valid, once the clock runs. */
    withdrawUntil?: string;
    /** The order's status: goods must have shipped before anything can come back. */
    orderStatus?: string;
    /** The order's lines, which the returns form offers for selection. */
    items?: Order['items'];
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
 * The store's opening call and the per-order read.
 */
const { openReturn, fetchOrderReturns } = useReturnsStore();

/**
 * True while a call is in flight; disables the button so a double click cannot open two.
 */
const { loading } = storeToRefs(useReturnsStore());

/**
 * The returns already opened on this order.
 */
const opened = ref<Return[]>([]);

/**
 * The lines the returns form offers: none until the goods have shipped, and none once every
 * returnable unit is already in a return.
 */
const returnLines = computed(() =>
    isReturnableOrderStatus(props.orderStatus)
        ? returnableLines(props.items ?? [], opened.value)
        : []
);

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
 * Loads this order's returns; a failed read leaves the list empty rather than blocking the button.
 *
 * @returns A promise settling once the list is loaded.
 */
const loadOpened = () =>
    fetchOrderReturns(props.orderId)
        .then((items) => {
            opened.value = items;
        })
        .catch(() => {
            opened.value = [];
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

onMounted(loadOpened);
</script>

<template>
    <section
        v-if="canWithdraw || opened.length > 0 || returnLines.length > 0"
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
    </section>
</template>
