<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'InventoryLedgerPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Inventory admin page. `StockBoard` and `MovementLedger` both read `useInventoryStore()`
 * directly, so a write's reactivity carries from one child to the other with no wiring of this
 * page's own — the only wiring it does own is the board's `history` emit into the ledger's exposed
 * `focusProduct`.
 */
import { ref } from 'vue';
import StockMovementForm from '../components/StockMovementForm.vue';
import StockBoard from '../components/StockBoard.vue';
import MovementLedger from '../components/MovementLedger.vue';
import { useSessionStore } from '@/infrastructure/session.ts';
import TourButton from '@/ui/molecules/TourButton.vue';

/**
 * The stock board and the ledger behind it, admin-side — one page, deliberately.
 *
 * The board is what is on the shelf right now, three numbers per product; the ledger is every
 * movement newest first with its why. They stay on one screen rather than behind tabs because the
 * page's whole story is a write landing in both at once: receive a delivery and the board rises
 * WHILE the row explaining it appears below. Both are the API's — nothing here adds up a column,
 * because `available` is derived server-side and a second subtraction is a second thing that can
 * disagree. `StockBoard` and `MovementLedger` both read `useInventoryStore()` directly, so that
 * reactivity carries the write from one to the other with no wiring of this page's own.
 */
/**
 * The ledger child instance, so its exposed `focusProduct` can be called from the board's emit.
 */
const movementLedger = ref<InstanceType<typeof MovementLedger>>();

/**
 * The session, asked whether the two forms are this account's to use: recording a receipt or an
 * adjustment is `create:StockMovement`, which the manager (a reader of stock) does not hold.
 */
const session = useSessionStore();
</script>

<template>
    <div id="inventory-page">
        <div class="mb-2 flex justify-end">
            <TourButton tour="stock-board" />
        </div>

        <div
            v-if="session.can('create', 'StockMovement')"
            class="mb-6 grid gap-4 lg:grid-cols-2"
            data-tour="stock-forms"
        >
            <StockMovementForm mode="receipt" />
            <StockMovementForm mode="adjust" />
        </div>

        <div data-tour="stock-board">
            <StockBoard @history="(productId) => movementLedger?.focusProduct(productId)" />
        </div>

        <div data-tour="stock-ledger">
            <MovementLedger ref="movementLedger" />
        </div>
    </div>
</template>
