/**
 * Waiting for an uploaded image to settle, shared by every spec that uploads one.
 *
 * A broker (RabbitMQ) runs the image digest OFF the request, so a page's first paint can still
 * show the pre-digest value. Neither app pushes the update: the only way to see the final `src`
 * is to reload between reads, which is what {@link pollForImageSource} does.
 */

/** How long a broker may take to run the digest before a spec gives up on it. */
const DIGEST_TIMEOUT_MS = 15_000;

/** Pause between reads while polling. */
const DIGEST_POLL_INTERVAL_MS = 500;

/**
 * The path the API hands back for an uploaded file: `<owner>-<24-hex-content-hash>.<ext>`, with an
 * optional API-host prefix (`resolveImageUrl` adds it; a single-origin deployment has none). The
 * owner segment is hex of a profile-dependent length, so it is matched as variable-length hex.
 * The `seed/` directory is deliberately not matched: a seeded image is not an upload.
 */
export const UPLOAD_PATH =
    /^(?:https?:\/\/[^/]+)?\/images\/[\da-f]+-[\da-f]{24}\.(png|jpg|jpeg|webp)$/;

/**
 * Reloads and re-reads `selector`'s `src` until it matches `pattern` or `deadline` passes.
 *
 * Without a broker the first read already matches and this returns immediately.
 *
 * @param selector - the image element to read `src` off
 * @param pattern - what a post-digest `src` looks like
 * @param deadline - epoch milliseconds after which to stop polling
 * @returns the last `src` read, matching or not
 */
export const pollForImageSource = (
    selector: string,
    pattern: RegExp,
    deadline: number = Date.now() + DIGEST_TIMEOUT_MS
): Cypress.Chainable<string> =>
    cy
        .get(selector)
        // A freshly (re)loaded page paints the bundled placeholder until the record has arrived,
        // so reading `src` at once would see the stand-in on every pass. Wait it out; a record
        // whose digest is pending carries the pending image, which is not the placeholder.
        .should(($image) => {
            const source = $image.attr('src') ?? '';
            expect(source, 'a src that is not the placeholder').to.match(/\S/);
            expect(source).not.to.contain('no-image-placeholder');
        })
        .then(($image) => {
            const source = $image.attr('src') ?? '';
            if (pattern.test(source) || Date.now() >= deadline) return cy.wrap(source);
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- polling a queue worker neither app drives directly; bounded by `deadline`, not trusted to be long enough
            return cy
                .wait(DIGEST_POLL_INTERVAL_MS, { log: false })
                .then(() => cy.reload())
                .then(() => pollForImageSource(selector, pattern, deadline));
        });
