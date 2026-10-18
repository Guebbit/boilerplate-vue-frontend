/**
 * @module
 * `local/no-hover-only`: nothing that matters is reachable by hover or gesture alone.
 *
 * A phone has no hover, and a keyboard has no gesture. Four findings:
 * - `hoverHandler`: `@mouseenter` / `@mouseover` / `@pointerenter` / `@pointerover` on an element
 *   with no `@click`, so there is no tap that does what the hover did. (The a11y rule only asks
 *   for `@focus`.)
 * - `openOnHover`: `open-on-hover` on a menu or list group without `open-on-click`.
 * - `gestureOnly`: `@contextmenu`, `draggable`, a drag or drop handler, or `v-touch`. Give the
 *   action a visible control.
 * - `hoverTitle`: a native `title` on an element that truncates its text. A tooltip never shows
 *   on touch, so the clipped text is gone. Show it in full.
 *
 * Hover cues in Tailwind classes (`hover:underline`) are `no-restricted-classes`' job.
 */
import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

/** `RuleCreator`'s two type parameters: this rule takes no options. */
type Options = [];

/** The rule's four message ids. */
type MessageIds = 'hoverHandler' | 'openOnHover' | 'gestureOnly' | 'hoverTitle';

/** A `vue-eslint-parser` attribute: static (`title="x"`) or a directive (`@click`, `:title`). */
interface TemplateAttribute {
    directive: boolean;
    loc: TSESTree.SourceLocation;
    key: {
        name: string | { name: string };
        argument?: { name?: string } | null;
    };
    value: { value?: string; expression?: { type: string; value?: unknown } | null } | null;
}

/** A `vue-eslint-parser` element, with the part of its start tag the rule reads. */
interface TemplateElement {
    name: string;
    loc: TSESTree.SourceLocation;
    startTag: { attributes: TemplateAttribute[] };
}

/** Pointer events that are a hover with no tap. */
const HOVER_EVENTS = new Set(['mouseenter', 'mouseover', 'pointerenter', 'pointerover']);

/** Events that are a gesture with no visible control. */
const GESTURE_EVENTS = new Set(['contextmenu', 'dragstart', 'drag', 'dragover', 'drop']);

/** Tags whose `open-on-hover` opens a menu by hover. */
const HOVER_MENU_TAGS = new Set(['v-menu', 'v-list-group']);

/** A Tailwind class that clips text behind an ellipsis. */
const TRUNCATING_CLASS = /(?:^|\s)(?:truncate|line-clamp-\d+|text-ellipsis)(?=\s|$)/;

/** The directive name (`on`, `bind`, `touch`…) or `undefined` for a static attribute. */
const directiveName = (attribute: TemplateAttribute): string | undefined =>
    attribute.directive && typeof attribute.key.name === 'object'
        ? attribute.key.name.name
        : undefined;

/** The attribute's argument: `click` for `@click`, `title` for `:title`; the name when static. */
const argumentOf = (attribute: TemplateAttribute): string | undefined =>
    attribute.directive
        ? attribute.key.argument?.name
        : typeof attribute.key.name === 'string'
          ? attribute.key.name
          : undefined;

/** Whether the element listens for `event` (`@click`, `v-on:click`). */
const listensFor = (element: TemplateElement, event: string): boolean =>
    element.startTag.attributes.some(
        (attribute) => directiveName(attribute) === 'on' && argumentOf(attribute) === event
    );

/** Whether the element sets `name`, statically or bound, and not to a literal `false`. */
const setsAttribute = (element: TemplateElement, name: string): TemplateAttribute | undefined =>
    element.startTag.attributes.find((attribute) => {
        const isBound = directiveName(attribute) === 'bind';
        if (!isBound && attribute.directive) return false;
        if (argumentOf(attribute) !== name) return false;
        if (!isBound) return attribute.value?.value !== 'false';
        const expression = attribute.value?.expression;
        return !(expression?.type === 'Literal' && expression.value === false);
    });

/** The element's static class string, empty when it has none. */
const staticClasses = (element: TemplateElement): string =>
    element.startTag.attributes.find(
        (attribute) => !attribute.directive && attribute.key.name === 'class'
    )?.value?.value ?? '';

/** Reports a hover or gesture the user on a phone or a keyboard cannot reach. */
export const noHoverOnly = ESLintUtils.RuleCreator((name) => `docs/tools/design-lint.md#${name}`)<
    Options,
    MessageIds
>({
    name: 'no-hover-only',
    meta: {
        type: 'problem',
        docs: { description: 'Refuse hover-only and gesture-only interactions.' },
        schema: [],
        messages: {
            hoverHandler:
                'A hover handler with no `@click`: a tap has no hover. Give the same action a click.',
            openOnHover:
                '`open-on-hover` without `open-on-click`: the menu never opens on a phone. Add `open-on-click`.',
            gestureOnly:
                '`{{ what }}` is a gesture with no visible control. Give the same action a button.',
            hoverTitle:
                'A native `title` on truncated text never shows on touch, so the clipped text is lost. Show the full text.'
        }
    },
    defaultOptions: [],
    create: (context) => {
        /** One element's checks, in the order the messages list them. */
        const checkElement = (element: TemplateElement): void => {
            const { attributes } = element.startTag;

            for (const attribute of attributes) {
                const event = argumentOf(attribute);
                if (directiveName(attribute) === 'on' && event !== undefined) {
                    if (HOVER_EVENTS.has(event) && !listensFor(element, 'click'))
                        context.report({ loc: attribute.loc, messageId: 'hoverHandler' });
                    if (GESTURE_EVENTS.has(event))
                        context.report({
                            loc: attribute.loc,
                            messageId: 'gestureOnly',
                            data: { what: `@${event}` }
                        });
                }
                if (directiveName(attribute) === 'touch')
                    context.report({
                        loc: attribute.loc,
                        messageId: 'gestureOnly',
                        data: { what: 'v-touch' }
                    });
            }

            const draggable = setsAttribute(element, 'draggable');
            if (draggable)
                context.report({
                    loc: draggable.loc,
                    messageId: 'gestureOnly',
                    data: { what: 'draggable' }
                });

            const hover = setsAttribute(element, 'open-on-hover');
            if (
                hover &&
                HOVER_MENU_TAGS.has(element.name) &&
                !setsAttribute(element, 'open-on-click')
            )
                context.report({ loc: hover.loc, messageId: 'openOnHover' });

            const title = setsAttribute(element, 'title');
            if (title && TRUNCATING_CLASS.test(staticClasses(element)))
                context.report({ loc: title.loc, messageId: 'hoverTitle' });
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
