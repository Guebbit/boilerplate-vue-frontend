/**
 * Reads a rendered email back into the shape the e2e specs already use for the demo outbox.
 *
 * The demo backend records a send as its template variables (`code: …`, `linkUrl: …`); a live
 * backend renders HTML and hands it to an SMTP server — Mailpit, in CI. The specs should not care
 * which: this turns Mailpit's message into the same `lines` and `token` the outbox gives, so one
 * spec runs against both profiles.
 *
 * Pure, and outside `tests/support/e2e/` on purpose, so the unit suite can pin the parsing without
 * a browser. The Cypress commands that fetch from Mailpit live in `tests/support/e2e/commands.ts`.
 */

/** One received email, in the demo outbox's shape. `template` is unknown to an SMTP inbox. */
export interface MailedEmail {
    /** The recipient. */
    to: string;
    /** The subject line, as sent. */
    subject: string;
    /** The outbox template name — only the demo profile knows it. */
    template?: string;
    /** The `?token=` of the first link that carries one. */
    token?: string;
    /** `code: <digits>` and `linkUrl: <url>`, when the message carries them. */
    lines?: string[];
}

/** The fields of a Mailpit message this module reads — see Mailpit's `GET /api/v1/message/{ID}`. */
export interface MailpitMessage {
    /** The rendered HTML body. */
    HTML: string;
    /** The plain-text body; empty when the sender sent HTML only. */
    Text: string;
    /** The subject line. */
    Subject: string;
}

/** A delivered 2FA code: six digits, standing alone. */
const CODE_PATTERN = /(?:^|\s)(\d{6})(?:\s|$)/m;

/** Every `href` in the HTML — the first one carrying `token=` is the mailed action link. */
const HREF_PATTERN = /href="([^"]+)"/g;

/**
 * The text a reader sees: tags dropped, the few entities EJS escapes decoded, whitespace folded.
 *
 * @param html - a rendered email body
 * @returns its visible text
 */
const visibleText = (html: string): string =>
    html
        .replaceAll(/<style[\S\s]*?<\/style>/g, ' ')
        .replaceAll(/<[^>]+>/g, ' ')
        .replaceAll('&amp;', '&')
        .replaceAll(/\s+/g, ' ')
        .trim();

/**
 * The first link in the body that carries a token, with `&amp;` decoded.
 *
 * @param html - a rendered email body
 */
const actionLink = (html: string): string | undefined =>
    [...html.matchAll(HREF_PATTERN)]
        .map(([, href]) => href.replaceAll('&amp;', '&'))
        .find((href) => /[&?]token=/.test(href));

/**
 * Turns one Mailpit message into the outbox shape.
 *
 * @param to - the address it was fetched for
 * @param message - Mailpit's message
 * @returns the email, with its code and link as `lines` and the link's token lifted out
 */
export const parseMailpitMessage = (to: string, message: MailpitMessage): MailedEmail => {
    const text = message.Text || visibleText(message.HTML);
    const code = CODE_PATTERN.exec(text)?.[1];
    const linkUrl = actionLink(message.HTML);
    const token = linkUrl ? /[&?]token=([^&]+)/.exec(linkUrl)?.[1] : undefined;

    return {
        to,
        subject: message.Subject,
        ...(token && { token: decodeURIComponent(token) }),
        lines: [...(code ? [`code: ${code}`] : []), ...(linkUrl ? [`linkUrl: ${linkUrl}`] : [])]
    };
};
