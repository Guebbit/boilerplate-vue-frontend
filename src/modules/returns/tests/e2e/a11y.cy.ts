/**
 * @module
 * Cypress a11y sweep route list for the returns module, run through the shared `sweepA11y` helper.
 * The list is a signed-in page for a customer and staff alike; a single return is reached from it,
 * so the sweep visits the list and one seeded return's own route.
 *
 * Co-located so deleting the module deletes its a11y coverage with it.
 * `tests/cross-cutting/a11y-coverage.spec.ts` asserts every routed module has one of these.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/**
 * Resolves the detail-page URL of a seeded, unanswered return — a real record, so the audit sees the
 * page with its fields and the staff's decision controls, not the not-found page a made-up id gives.
 */
const returnDetail = () => cy.subjectId('return.requested').then((id) => `/en/returns/${id}`);

sweepA11y(
    'returns — admin',
    [
        ['returns list', '/en/returns'],
        ['return detail', returnDetail]
    ],
    'admin'
);
