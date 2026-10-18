/**
 * @module
 * One template-comment check: an `<!-- eslint-disable… -->` comment must say why.
 *
 * Why it exists:
 * - `@eslint-community/eslint-comments/require-description` reads script comments only.
 * - A template disable with no reason passes every other rule today.
 *
 * It splits on ` -- ` the same way `vue/comment-directive` does, so the two agree on what a
 * description is. Unused template disables are `vue/comment-directive`'s job, not this rule's.
 */
import { ESLintUtils } from '@typescript-eslint/utils';

/** Matches the directive forms a template comment can carry (`-line` and `-next-line` included). */
const DISABLE_DIRECTIVE = /^\s*eslint-disable(?:-next-line|-line)?(?=\s|$)/;

/** The separator ESLint documents between a directive and its reason: two or more dashes. */
const DESCRIPTION_SEPARATOR = /\s-{2,}\s/;

/** `RuleCreator`'s two type parameters: this rule takes no options and reports one message. */
type Options = [];

/** The rule's one message id. */
type MessageIds = 'missingDescription';

/** A template comment node, as `vue-eslint-parser` exposes it on `templateBody.comments`. */
interface TemplateComment {
    value: string;
    loc: { start: { line: number; column: number }; end: { line: number; column: number } };
}

/**
 * Reads the template comments off a `vue-eslint-parser` `Program` node.
 * A `.ts` file or a template-less SFC has no `templateBody`, so the answer is an empty list.
 */
const templateComments = (program: object): TemplateComment[] => {
    if (!('templateBody' in program)) return [];
    const { templateBody } = program;
    if (typeof templateBody !== 'object' || templateBody === null) return [];
    return 'comments' in templateBody && Array.isArray(templateBody.comments)
        ? (templateBody.comments as TemplateComment[]) // narrows the parser's untyped node
        : [];
};

/**
 * Flags every template `eslint-disable` comment that carries no ` -- reason`.
 * Script comments are left to `require-description`.
 */
export const templateDirectiveDescription = ESLintUtils.RuleCreator(
    (name) => `docs/tools/design-lint.md#${name}`
)<Options, MessageIds>({
    name: 'template-directive-description',
    meta: {
        type: 'problem',
        docs: { description: 'Require a description on every template eslint-disable comment.' },
        schema: [],
        messages: {
            missingDescription:
                'This template eslint-disable has no reason. Add " -- <why>" after the rule name.'
        }
    },
    defaultOptions: [],
    create: (context) => {
        /** Reports each reason-less disable once the whole file, template included, is parsed. */
        const checkTemplateComments = (program: object): void => {
            for (const comment of templateComments(program)) {
                if (!DISABLE_DIRECTIVE.test(comment.value)) continue;
                if (DESCRIPTION_SEPARATOR.test(comment.value)) continue;
                context.report({ loc: comment.loc, messageId: 'missingDescription' });
            }
        };
        return { 'Program:exit': checkTemplateComments };
    }
});
