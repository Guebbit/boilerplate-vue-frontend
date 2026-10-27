/**
 * @module
 * The remedies a faulty or wrong item can be given (Directive 2019/771 Art. 13) and which returns
 * have a choice at all. The server refuses the rest; this only keeps the forms from offering what
 * it will refuse.
 */
import type { ReturnRemedy } from '@types';

/**
 * The remedies, in the order the form lists them: repair and replacement come first by law, the
 * money back last.
 */
export const REMEDIES = ['repair', 'replace', 'refund'] as const satisfies readonly ReturnRemedy[];

/**
 * Whether a return's reason is under the legal guarantee (a defect or a wrong item), the only
 * reasons with a choice of remedy and the only ones that cannot carry a handling deduction.
 *
 * @param reason - Why the goods come back (a form's string or the contract's union).
 * @returns `true` when the buyer chooses the remedy.
 */
export const hasRemedyChoice = (reason: string): boolean =>
    reason === 'defective' || reason === 'wrong_item';
