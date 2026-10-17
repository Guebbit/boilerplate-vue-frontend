/// <reference types="cypress" />

/**
 * The keyboard contract of a modal dialog, as one assertion.
 *
 * Standard: WAI-ARIA Authoring Practices, Dialog (Modal) pattern — focus moves in on open, Tab
 * stays inside, Escape closes, and focus returns to the opener (or to a logical element when the
 * opener is gone). Real key presses (`cypress-real-events`), not synthetic events: a focus trap
 * is the browser's behaviour, and a synthetic `Tab` does not move focus.
 */

/** Anything the Tab key can land on inside a dialog. */
const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The element Vuetify gives every open dialog: Tab must never leave it. */
const ACTIVE_OVERLAY = '.v-overlay--active';

/** Options for {@link expectDialogKeyboardPattern}. */
export interface DialogKeyboardOptions {
    /** A selector that must hold focus after Escape when the opener no longer exists (a removed row). */
    fallbackFocus?: string;
}

/**
 * Opens the dialog from the keyboard, walks Tab past every control, closes it with Escape, and
 * asserts focus and the API the whole way.
 *
 * @param opener - selector of the control that opens the dialog
 * @param dialog - selector of the dialog once open
 * @param options - see {@link DialogKeyboardOptions}
 */
export const expectDialogKeyboardPattern = (
    opener: string,
    dialog: string,
    options: DialogKeyboardOptions = {}
): void => {
    // Writes the dialog must not make just by being opened and dismissed.
    const writes: string[] = [];
    cy.env(['apiUrl']).then(({ apiUrl }) => {
        cy.intercept(
            { method: /^(POST|PUT|PATCH|DELETE)$/, url: `${String(apiUrl)}/**` },
            (request) => {
                writes.push(`${request.method} ${request.url}`);
                request.continue();
            }
        );
    });

    cy.get(opener).focus();
    cy.realPress('Enter');
    cy.get(dialog).should('be.visible');

    // Focus lands inside, on the first field or the title.
    cy.focused().closest(ACTIVE_OVERLAY).should('exist');

    // One more press than there are controls: a trap that leaks shows on the extra one.
    cy.get(dialog).then(($dialog) => {
        const presses = ($dialog.get(0)?.querySelectorAll(FOCUSABLE_SELECTOR).length ?? 0) + 1;
        for (let press = 0; press < presses; press += 1) {
            cy.realPress('Tab');
            cy.focused().closest(ACTIVE_OVERLAY).should('exist');
        }
    });

    cy.realPress('Escape');
    cy.get(dialog).should('not.exist');

    // Back where it started, or on the stand-in when the opener went with the action.
    cy.document().then((document_) => {
        const openerStillThere = document_.querySelector(opener) !== null;
        if (openerStillThere) cy.focused().should('match', opener);
        else if (options.fallbackFocus) cy.focused().should('match', options.fallbackFocus);
    });

    cy.then(() => {
        expect(writes, 'writes made by opening and dismissing the dialog').to.deep.equal([]);
    });
};
