/**
 * @module
 * The order's downloadable documents — the invoice and its credit notes — as one composable: what
 * exists (read from the order's `actions` and the credit-note list), the requests that fetch the
 * PDFs, and each action's own loading and blocked state. The page only renders what this returns.
 */
import { computed, ref, watch, type Ref } from 'vue';
import { downloadBlob } from '@guebbit/js-toolkit';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useOrdersStore } from '../store.ts';
import type { CreditNoteSummary, Order } from '@types';

/**
 * Invoice and credit-note state and actions for one order.
 *
 * @param currentOrder - The order shown, read for `actions.invoice` and the fields a refund moves.
 * @param targetId - The routed order id, read reactively so a navigation reloads the notes.
 * @returns Whether an invoice exists, the invoice and credit-note actions, and their states.
 */
export const useOrderDocuments = (
    currentOrder: Ref<Order | undefined>,
    targetId: () => string | undefined
) => {
    /**
     * Store requests rendering the PDFs and listing the notes.
     */
    const { fetchInvoice, fetchCreditNotes, fetchCreditNote } = useOrdersStore();

    /**
     * Whether the server has actually issued this order's invoice — read from the server rather
     * than re-derived, so a lifecycle rule that changes there cannot leave the buttons offering a
     * download the API refuses with 404.
     */
    const invoiceAvailable = computed(() => currentOrder.value?.actions.invoice === true);

    /**
     * Whether an invoice request — either action below — is in flight. Its own flag, not the
     * store's shared `loading`, so paging through or cancelling the order doesn't spin it too.
     */
    const invoiceLoading = ref(false);

    /**
     * The invoice actions' own blocked state — download and view are the same {@link withInvoice}
     * call rendering the PDF two different ways, so one blocked state covers both buttons.
     */
    const {
        message: invoiceError,
        report: reportInvoiceError,
        clear: clearInvoiceError
    } = useBlockingError();

    /**
     * Renders the invoice once and hands the bytes to `action` — the one request either button
     * makes.
     *
     * @param action - What to do with the fetched PDF.
     * @returns A promise resolving once `action` ran; a missing id or an empty response is a
     *  no-op, and a render failure blocks both invoice buttons in place.
     */
    const withInvoice = (action: (blob: Blob) => void) => {
        const id = targetId();
        if (!id) return;
        invoiceLoading.value = true;
        clearInvoiceError();
        return fetchInvoice(id)
            .then((blob) => {
                if (blob) action(blob);
            })
            .catch((error: unknown) => reportInvoiceError(error))
            .finally(() => {
                invoiceLoading.value = false;
            });
    };

    /**
     * Downloads the server-rendered invoice as a PDF file.
     *
     * @returns A promise resolving once the download has been triggered.
     */
    const downloadInvoice = () =>
        withInvoice((blob) => downloadBlob(blob, `order-${targetId()}-invoice.pdf`));

    /**
     * Opens the server-rendered invoice in a new tab, for a look before deciding whether to keep
     * it. The object URL is revoked once that tab has loaded it, or right away if the popup was
     * blocked.
     *
     * @returns A promise resolving once the tab has been opened.
     */
    const viewInvoice = () =>
        withInvoice((blob) => {
            const url = URL.createObjectURL(blob);
            const tab = window.open(url, '_blank');
            if (tab) tab.addEventListener('load', () => URL.revokeObjectURL(url));
            else URL.revokeObjectURL(url);
        });

    /**
     * The order's credit notes, oldest first — one per settled refund. The list itself says which
     * exist; a boolean flag could not pick among several partial-refund notes.
     */
    const creditNotes = ref<CreditNoteSummary[]>([]);

    /**
     * Which credit note is being downloaded, so only that row's button spins. `undefined` when
     * none.
     */
    const creditNoteLoadingId = ref<string>();

    /**
     * The credit-note download's own blocked state, separate from the invoice's.
     */
    const {
        message: creditNoteError,
        report: reportCreditNoteError,
        clear: clearCreditNoteError
    } = useBlockingError();

    /**
     * Reloads {@link creditNotes}. Runs for invoiced orders only — a credit note reverses an
     * invoice, so an order without one has none. A failure empties the list: the section is
     * supplementary, and the order itself is still fully usable.
     *
     * @returns A promise resolving once the list is replaced.
     */
    const loadCreditNotes = () => {
        const id = targetId();
        if (!id || !invoiceAvailable.value) {
            creditNotes.value = [];
            return Promise.resolve();
        }
        return fetchCreditNotes(id)
            .then((list) => {
                creditNotes.value = list;
            })
            .catch(() => {
                creditNotes.value = [];
            });
    };

    // Refetches the notes whenever the order's invoiced/refunded state moves. The refund path
    // writes the note after the response, so this reacts to the order changing, not to a click.
    watch(
        () => [
            targetId(),
            invoiceAvailable.value,
            currentOrder.value?.status,
            currentOrder.value?.paymentStatus
        ],
        loadCreditNotes,
        { immediate: true }
    );

    /**
     * Downloads one credit note as a PDF file — one note per click, since each download counts
     * against the invoicing rate limit.
     *
     * @param note - The note the visitor picked.
     * @returns A promise resolving once the download has been triggered.
     */
    const downloadCreditNote = (note: CreditNoteSummary) => {
        const id = targetId();
        if (!id) return;
        creditNoteLoadingId.value = note.id;
        clearCreditNoteError();
        return fetchCreditNote(id, note.id)
            .then((blob) => {
                if (blob) downloadBlob(blob, `order-${id}-credit-note-${note.number}.pdf`);
            })
            .catch((error: unknown) => reportCreditNoteError(error))
            .finally(() => {
                creditNoteLoadingId.value = undefined;
            });
    };

    return {
        invoiceAvailable,
        invoiceLoading,
        invoiceError,
        downloadInvoice,
        viewInvoice,
        creditNotes,
        creditNoteLoadingId,
        creditNoteError,
        downloadCreditNote
    };
};
