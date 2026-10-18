/**
 * @module
 * The human summary of an evaluation: a Markdown table per run, for the terminal, the report
 * folder and the nightly's step summary. Pure.
 */
import type { CaseMetrics, LighthouseBaseline } from './baseline';
import { TIMING_HEADROOM, type Evaluation } from './evaluate';

/** The timing columns, in the order they print. */
const TIMING = ['lcp', 'fcp', 'tbt', 'si'] as const;

/**
 * One row: the median against its budget (baseline × headroom), or just the median when there is no
 * baseline.
 */
const row = (id: string, now: CaseMetrics, baseline: LighthouseBaseline | undefined): string => {
    const before = baseline?.cases[id];
    const cells = TIMING.map((metric) =>
        before
            ? `${now[metric].toFixed(0)} / ${(before[metric] * TIMING_HEADROOM).toFixed(0)}`
            : now[metric].toFixed(0)
    );
    return `| ${id} | ${cells.join(' | ')} | ${now.cls.toFixed(3)} | ${now.performance.toFixed(0)} |`;
};

/**
 * Renders the summary.
 *
 * @param evaluation - what `evaluate` returned
 * @param baseline - the committed baseline, if any
 */
export const renderSummary = (
    evaluation: Evaluation,
    baseline: LighthouseBaseline | undefined
): string =>
    [
        '## Lighthouse',
        '',
        `${evaluation.failures.length === 0 ? 'Hard set: **green**.' : 'Hard set: **red**.'} Timing is median ms / budget (baseline × ${String(TIMING_HEADROOM)}); it only warns.`,
        '',
        '| case | LCP | FCP | TBT | SI | CLS | score |',
        '| --- | --- | --- | --- | --- | --- | --- |',
        ...Object.entries(evaluation.medians).map(([id, now]) => row(id, now, baseline)),
        '',
        ...(evaluation.failures.length > 0
            ? ['### Failures', '', ...evaluation.failures.map((line) => `- ${line}`), '']
            : []),
        ...(evaluation.warnings.length > 0
            ? ['### Warnings', '', ...evaluation.warnings.map((line) => `- ${line}`), '']
            : [])
    ].join('\n');
