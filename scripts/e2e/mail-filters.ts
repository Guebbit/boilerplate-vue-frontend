/**
 * Matchers for `cy.emailTo(address, matches)`: which of an address's emails a spec means.
 *
 * The demo outbox records the template and the language a send was made in; a live SMTP inbox
 * records neither, only the rendered message. Each matcher therefore says what it does when the
 * email cannot answer, so one spec runs on both profiles.
 *
 * Pure, and outside `tests/support/e2e/` so the unit suite can pin the rules without a browser.
 */
import type { MailedEmail } from './mail-message';

/**
 * Matches the email the backend rendered from one outbox template.
 *
 * An inbox email has no template name, so it matches: the template check falls to the subject
 * everywhere else (`expectMailTemplate`), and a filter that refused every live email would hide
 * the one the spec is waiting for.
 *
 * @param name - the outbox template name, e.g. `orders.placed`
 */
export const byTemplate =
    (name: string) =>
    (email: MailedEmail): boolean =>
        email.template === undefined || email.template === name;

/**
 * Matches the email sent in one language.
 *
 * The demo outbox carries the send's `data.locale`. A live inbox does not, so there the subject
 * stands in: pass `liveSubject` (a fragment of the translated subject) and the email must contain
 * it; without one a live email matches, which is only as strict as the other filters in the spec.
 *
 * @param tag - the language tag, e.g. `it`
 * @param liveSubject - text the subject carries in that language, used when the email has no locale
 */
export const inLocale =
    (tag: string, liveSubject?: string) =>
    (email: MailedEmail): boolean => {
        if (email.locale !== undefined) return email.locale === tag;
        return liveSubject === undefined || email.subject.includes(liveSubject);
    };
