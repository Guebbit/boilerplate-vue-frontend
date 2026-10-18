/**
 * @module
 * `local/mobile-strategy`: the pieces that need a phone strategy carry it.
 *
 * Three findings:
 * - `dialogNotFullscreen`: a `<v-dialog>` that does not bind `fullscreen` (the house answer is
 *   `useFullscreenDialog()`, true below the small breakpoint).
 * - `tableOutsideDataTable`: a Vuetify data table anywhere but the `DataTable` wrapper, which owns
 *   `mobile-breakpoint`.
 * - `scrollWithoutName`: a `<v-table>` without a named `v-focusable-scroll`, so its scroll region
 *   has no accessible name for a keyboard user.
 *
 * The tag names and the one allowed file come from `scripts/design-policy.ts`. A rule, not a
 * spec: it reads the template, reports at the line, and a new dialog fails where it is written.
 */
import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { DESIGN_POLICY } from '../design-policy';

/** `RuleCreator`'s two type parameters: this rule takes no options. */
type Options = [];

/** The rule's three message ids. */
type MessageIds = 'dialogNotFullscreen' | 'tableOutsideDataTable' | 'scrollWithoutName';

/** A `vue-eslint-parser` attribute: static (`fullscreen`) or a directive (`:fullscreen`, `v-x`). */
interface TemplateAttribute {
    directive: boolean;
    key: {
        name: string | { name: string };
        argument?: { name?: string } | null;
    };
    value: { type: string } | null;
}

/** A `vue-eslint-parser` element, with the part of its start tag the rule reads. */
interface TemplateElement {
    name: string;
    loc: TSESTree.SourceLocation;
    startTag: { attributes: TemplateAttribute[] };
}

/** Whether the element binds (or sets) the attribute, as `x` or `:x`. */
const hasAttribute = (element: TemplateElement, name: string): boolean =>
    element.startTag.attributes.some((attribute) => {
        if (!attribute.directive) return attribute.key.name === name;
        const isBind = typeof attribute.key.name === 'object' && attribute.key.name.name === 'bind';
        return isBind && attribute.key.argument?.name === name;
    });

/** The directive `v-<name>` on the element, if any. */
const directiveNamed = (element: TemplateElement, name: string): TemplateAttribute | undefined =>
    element.startTag.attributes.find(
        (attribute) =>
            attribute.directive &&
            typeof attribute.key.name === 'object' &&
            attribute.key.name.name === name
    );

/** Reports a dialog, a data table or a plain table that lacks its phone strategy. */
export const mobileStrategy = ESLintUtils.RuleCreator(
    (name) => `docs/tools/design-lint.md#${name}`
)<Options, MessageIds>({
    name: 'mobile-strategy',
    meta: {
        type: 'problem',
        docs: { description: 'Require dialogs and tables to carry the phone strategy.' },
        schema: [],
        messages: {
            dialogNotFullscreen:
                'A dialog binds `:fullscreen="fullscreen"` from `useFullscreenDialog()`, so it fills a phone instead of floating in it.',
            tableOutsideDataTable:
                'Render a data table through `{{ owner }}`: it owns `mobile-breakpoint`, so rows stack on a phone the same way everywhere.',
            scrollWithoutName:
                'A `<v-table>` scrolls sideways, so it needs `v-focusable-scroll="name"` (a named region) to be reachable by keyboard.'
        }
    },
    defaultOptions: [],
    create: (context) => {
        const policy = DESIGN_POLICY.mobileStrategy;
        const isOwner = context.filename.replaceAll('\\', '/').endsWith(policy.tableOwner);

        /** One element's check, by tag. */
        const checkElement = (element: TemplateElement): void => {
            if (element.name === policy.dialogTag && !hasAttribute(element, policy.dialogBinding))
                context.report({ loc: element.loc, messageId: 'dialogNotFullscreen' });
            else if ((policy.tableTags as readonly string[]).includes(element.name) && !isOwner)
                context.report({
                    loc: element.loc,
                    messageId: 'tableOutsideDataTable',
                    data: { owner: policy.tableOwner }
                });
            else if (element.name === policy.plainTableTag) {
                const directive = directiveNamed(element, policy.scrollDirective);
                if (directive?.value == null)
                    context.report({ loc: element.loc, messageId: 'scrollWithoutName' });
            }
        };

        const services = context.sourceCode.parserServices as
            | {
                  defineTemplateBodyVisitor?: (
                      template: object,
                      script: object
                  ) => TSESLint.RuleListener;
              }
            | undefined;
        return services?.defineTemplateBodyVisitor
            ? services.defineTemplateBodyVisitor({ VElement: checkElement }, {})
            : {};
    }
});
