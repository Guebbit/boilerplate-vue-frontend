/**
 * @module
 * `local/theme-token`: a colour in the source is a theme colour, named, or it is a finding.
 *
 * Three findings, one message each:
 * - `colorLiteral`: a hex, `rgb(`/`hsl(`/`lab(`… with no `var(`, or a CSS colour name, in a
 *   string, a template-literal quasi or a static attribute. The only home for one is
 *   `src/ui/vuetify/theme.ts`.
 * - `unknownThemeVariable`: a `--v-theme-<name>` whose name the theme does not define.
 * - `unknownThemeColor`: a colour prop on a Vuetify component (`color`, `bg-color`…) whose static
 *   value, or whose conditional branches, is not a theme colour.
 *
 * Why a rule and not a spec: it reads the AST, so it reports at the line, in the editor, and
 * never mistakes a comment for a string. The names come from `scripts/design-policy.ts`, which
 * derives them from the same theme the app runs on.
 */
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { DESIGN_POLICY, isColorLiteral, themeColorNames } from '../design-policy';

/** `RuleCreator`'s two type parameters: this rule takes no options. */
type Options = [];

/** The rule's three message ids. */
type MessageIds = 'colorLiteral' | 'unknownThemeVariable' | 'unknownThemeColor';

/** `--v-theme-<name>`: Vuetify's published channel variable for a theme colour. */
const THEME_VARIABLE = /--v-theme-([\da-z-]*)/g;

/** The slice of a `vue-eslint-parser` node the template visitor reads. */
interface TemplateNode {
    type: string;
    loc: TSESTree.SourceLocation;
    [key: string]: unknown;
}

/** A `vue-eslint-parser` attribute: static (`color="primary"`) or a directive (`:color="x"`). */
interface TemplateAttribute extends TemplateNode {
    directive: boolean;
    key: {
        name: string | { name: string };
        argument?: { type: string; name?: string } | null;
        loc: TSESTree.SourceLocation;
    };
    value: { type: string; value?: string; expression?: TSESTree.Node | null } | null;
    parent: { parent: { name: string } };
}

/**
 * The string literals a colour-prop expression can evaluate to directly: itself, both branches of
 * a conditional, both sides of `??` / `||` / `&&`. A call's arguments are not walked, since
 * `t('x')` returns text, not the colour.
 */
const choiceLiterals = (node: TSESTree.Node | null | undefined): string[] => {
    if (!node) return [];
    if (node.type === AST_NODE_TYPES.Literal)
        return typeof node.value === 'string' ? [node.value] : [];
    if (node.type === AST_NODE_TYPES.ConditionalExpression)
        return [...choiceLiterals(node.consequent), ...choiceLiterals(node.alternate)];
    if (node.type === AST_NODE_TYPES.LogicalExpression)
        return [...choiceLiterals(node.left), ...choiceLiterals(node.right)];
    return [];
};

/** The attribute's name as written: `color` for `color=` and for `:color=`. */
const attributeName = (attribute: TemplateAttribute): string | undefined => {
    if (!attribute.directive)
        return typeof attribute.key.name === 'string' ? attribute.key.name : undefined;
    const isBind = typeof attribute.key.name === 'object' && attribute.key.name.name === 'bind';
    return isBind ? attribute.key.argument?.name : undefined;
};

/** Reports colour literals, unknown theme variables and unknown colour props. */
export const themeToken = ESLintUtils.RuleCreator((name) => `docs/tools/design-lint.md#${name}`)<
    Options,
    MessageIds
>({
    name: 'theme-token',
    meta: {
        type: 'problem',
        docs: { description: 'Require colours to be named theme colours, never literals.' },
        schema: [],
        messages: {
            colorLiteral:
                'A colour literal belongs in src/ui/vuetify/theme.ts. Name a theme colour instead (primary, on-surface, error…).',
            unknownThemeVariable:
                '"--v-theme-{{name}}" is not a colour the theme defines. See src/ui/vuetify/theme.ts.',
            unknownThemeColor:
                '"{{name}}" is not a theme colour. Use a name from src/ui/vuetify/theme.ts, or a generated variant such as primary-darken-1.'
        }
    },
    defaultOptions: [],
    create: (context) => {
        const colors = themeColorNames();

        /** Checks one piece of text; `openEnded` marks a quasi that an expression continues. */
        const checkText = (
            loc: TSESTree.SourceLocation,
            text: string,
            openEnded: boolean
        ): void => {
            if (isColorLiteral(text)) context.report({ loc, messageId: 'colorLiteral' });
            for (const match of text.matchAll(THEME_VARIABLE)) {
                const name = match[1];
                const continues = openEnded && match.index + match[0].length === text.length;
                if (name === '' || continues || colors.has(name)) continue;
                context.report({ loc, messageId: 'unknownThemeVariable', data: { name } });
            }
        };

        /** The script-side visitor: every string and template-literal quasi. */
        const scriptVisitor = {
            Literal: (node: TSESTree.Literal): void => {
                if (typeof node.value === 'string') checkText(node.loc, node.value, false);
            },
            TemplateElement: (node: TSESTree.TemplateElement): void => {
                const parent = node.parent as TSESTree.TemplateLiteral;
                const last = parent.quasis.at(-1) === node;
                checkText(node.loc, node.value.cooked ?? node.value.raw, !last);
            }
        };

        /** A colour prop on a `v-*` component: its choices must all be theme colours. */
        const checkColorProp = (attribute: TemplateAttribute): void => {
            const name = attributeName(attribute);
            const props: readonly string[] = DESIGN_POLICY.colorProps;
            if (name === undefined || !props.includes(name)) return;
            if (!attribute.parent.parent.name.startsWith('v-')) return;
            const choices = attribute.directive
                ? choiceLiterals(attribute.value?.expression)
                : [attribute.value?.value ?? ''];
            for (const choice of choices) {
                if (choice === '' || colors.has(choice) || isColorLiteral(choice)) continue;
                context.report({
                    loc: attribute.loc,
                    messageId: 'unknownThemeColor',
                    data: { name: choice }
                });
            }
        };

        /** The template-side visitor: static attribute values, colour props, then the same expression nodes. */
        const templateVisitor = {
            ...scriptVisitor,
            VAttribute: (node: TemplateAttribute): void => {
                if (!node.directive && node.value?.value !== undefined)
                    checkText(node.loc, node.value.value, false);
                checkColorProp(node);
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
            ? services.defineTemplateBodyVisitor(templateVisitor, scriptVisitor)
            : scriptVisitor;
    }
});
