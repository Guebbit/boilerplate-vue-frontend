// requires-module: none
/**
 * The layout checks prove themselves here, on fixtures planted into the shell.
 *
 * A check that has never failed has never been shown to work. Each case plants one thing wrong
 * and expects the check to name it; each negative plants one thing that only looks wrong (a
 * screen-reader-only span, a table that scrolls on purpose) and expects silence.
 * What the checks are and why: `docs/tools/layout-sweep.md`.
 */
import type { LayoutCheckId, LayoutFinding } from '../../../scripts/e2e/layout-findings';
import { applyViewport } from '../../support/e2e/apply-viewport';
import { collectLayoutFindings } from '../../support/e2e/layout-checks';

/** Appends markup to the page, inside a container the cases can find. */
const plant = (html: string) =>
    cy.document({ log: false }).then((document_) => {
        const holder = document_.createElement('div');
        holder.id = 'plant';
        holder.innerHTML = html;
        document_.body.append(holder);
    });

/** Runs the collector on the page as it stands. */
const findingsOf = (
    checks: readonly LayoutCheckId[],
    extra: { narrow?: boolean; mode?: 'normal' | 'text-spacing' } = {}
) => cy.window({ log: false }).then((win) => collectLayoutFindings(win, { checks, ...extra }));

/** The findings that name `fragment` in their selector. */
const about = (findings: readonly LayoutFinding[], fragment: string): LayoutFinding[] =>
    findings.filter(({ selector }) => selector.includes(fragment));

describe('the layout checks, on planted fixtures', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.get('h1').should('exist');
        applyViewport('phone-small');
    });

    describe('catch what is wrong', () => {
        it('names an element wider than the screen, though the page never scrolls', () => {
            plant('<div data-test="plant-wide" style="width:600px;height:20px">wide</div>');

            findingsOf(['overflow']).then((findings) => {
                const [hit] = about(findings, 'plant-wide');
                expect(hit?.check).to.equal('overflow');
                expect(hit?.severity).to.equal('blocking');
                expect(hit?.detail).to.contain('> viewport');
            });
        });

        it('names text that a fixed width cuts off', () => {
            plant(
                '<div data-test="plant-clip" style="width:120px;overflow:hidden;white-space:nowrap">a long line that does not fit its box</div>'
            );

            findingsOf(['clipped']).then((findings) => {
                expect(about(findings, 'plant-clip')[0]?.severity).to.equal('blocking');
            });
        });

        it('names a button a fixed bar sits on, and what covers it', () => {
            plant(
                '<button data-test="plant-button" style="position:fixed;top:300px;left:10px;width:80px;height:40px">Pay</button>' +
                    '<div data-test="plant-bar" style="position:fixed;top:290px;left:0;width:320px;height:200px;z-index:99999"></div>'
            );

            findingsOf(['covered']).then((findings) => {
                const [hit] = about(findings, 'plant-button');
                expect(hit?.detail).to.contain('plant-bar');
            });
        });

        it('calls a control unreachable when only a box the user cannot scroll would show it, and puts the box back', () => {
            plant(
                '<div data-test="plant-row" style="width:120px;overflow:hidden;white-space:nowrap">' +
                    '<span style="display:inline-block;width:200px"></span>' +
                    '<button data-test="plant-hidden">Go</button></div>'
            );

            findingsOf(['covered']).then((findings) => {
                expect(about(findings, 'plant-hidden')[0]?.detail).to.contain('unreachable');
            });
            cy.get('[data-test=plant-row]').then(($row) => {
                expect($row[0]?.scrollLeft).to.equal(0);
            });
        });

        it('names a field under 16 px at a phone width, and ignores it at a desktop one', () => {
            plant('<input data-test="plant-input" style="font-size:14px">');

            findingsOf(['input-font'], { narrow: true }).then((findings) => {
                expect(about(findings, 'plant-input')[0]?.detail).to.contain('zooms');
            });
            findingsOf(['input-font'], { narrow: false }).then((findings) => {
                expect(about(findings, 'plant-input')).to.have.length(0);
            });
        });

        it('names an open drawer wider than the screen', () => {
            plant(
                '<div id="plant-drawer" class="v-navigation-drawer v-navigation-drawer--active" style="position:fixed;left:-120px;top:0;width:440px;height:200px"></div>'
            );

            findingsOf(['overlay-fit']).then((findings) => {
                expect(about(findings, 'plant-drawer')[0]?.detail).to.contain('off the');
            });
        });

        it('cuts a line only under text spacing', () => {
            plant(
                '<div data-test="plant-fixed" style="height:24px;width:120px;overflow:hidden;font-size:16px;line-height:1.2">one line of text</div>'
            );

            findingsOf(['clipped']).then((findings) => {
                expect(about(findings, 'plant-fixed')).to.have.length(0);
            });
            cy.document({ log: false }).then((document_) => {
                const style = document_.createElement('style');
                style.textContent =
                    '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; }';
                document_.head.append(style);
            });
            findingsOf(['clipped'], { mode: 'text-spacing' }).then((findings) => {
                expect(about(findings, 'plant-fixed')).to.have.length(1);
            });
        });
    });

    describe('say nothing about what only looks wrong', () => {
        it('lets a screen-reader-only span, a hidden box and a skip link be', () => {
            plant(
                '<span data-test="plant-sr" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">for readers</span>' +
                    '<div data-test="plant-hidden-box" aria-hidden="true" style="position:absolute;left:-9999px;width:500px">hidden</div>' +
                    '<a data-test="plant-skip" href="#main" style="position:fixed;left:-9999px;top:0">Skip</a>' +
                    '<div id="plant-closed" class="v-navigation-drawer" style="position:fixed;left:0;top:0;width:440px;height:100px;transform:translateX(-100%)"></div>'
            );

            findingsOf(['overflow', 'clipped', 'covered', 'overlay-fit']).then((findings) => {
                for (const fragment of [
                    'plant-sr',
                    'plant-hidden-box',
                    'plant-skip',
                    'plant-closed'
                ])
                    expect(about(findings, fragment), fragment).to.have.length(0);
            });
        });

        it('lets ellipsis text be, and only advises about a table that scrolls on purpose', () => {
            plant(
                '<div data-test="plant-ellipsis" style="width:100px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">a title that is cut with an ellipsis</div>' +
                    '<div data-test="plant-scroller" style="width:200px;overflow-x:auto"><div style="width:800px;height:10px"></div></div>'
            );

            findingsOf(['overflow', 'clipped', 'scroll-x'], { narrow: true }).then((findings) => {
                expect(about(findings, 'plant-ellipsis')).to.have.length(0);
                const scroller = about(findings, 'plant-scroller');
                expect(scroller.map(({ check }) => check)).to.deep.equal(['scroll-x']);
                expect(scroller[0]?.severity).to.equal('advisory');
            });
        });
    });

    describe('the comfort tier', () => {
        it('fails a pair of 30 px buttons set close together', (done) => {
            plant(
                '<div style="padding:8px">' +
                    '<button style="width:30px;height:30px;margin-right:2px">a</button>' +
                    '<button style="width:30px;height:30px">b</button></div>'
            );
            // The throw happens inside axe's callback, which Cypress reports as an uncaught
            // rejection rather than a failed command: both doors lead to the same check.
            const expectComfortFailure = (error: Error) => {
                expect(error.message).to.contain('[comfort');
                expect(error.message).to.contain('2.5.8');
                done();
                return false;
            };
            cy.on('fail', expectComfortFailure);
            cy.on('uncaught:exception', expectComfortFailure);

            cy.checkTargetComfort('planted pair');
            cy.then(() => {
                done(new Error('the comfort pass accepted two 30 px buttons 2 px apart'));
            });
        });
    });
});
