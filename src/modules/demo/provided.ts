import { ref, provide, inject } from 'vue';
import type { InjectionKey, Ref } from 'vue';

/**
 * The provide/inject demo, owned by the module that shows it off.
 *
 * It belongs here rather than in the composition root because the composition root is the file
 * every derived project edits first, and it has no business holding state that exactly one view
 * of one deletable module reads. Here, `rm -rf src/modules/demo` takes the feature with it, which
 * is the promise `src/modules.ts` makes about every module.
 */

/** What travels down the tree. A string, because the demo is about the mechanism. */
export type ProvidedVariable = string;

/** Paired mutation, so a descendant never writes to the injected ref directly. */
export type ProvidedVariableMutation = (value?: ProvidedVariable) => void;

/** The pair, as descendants receive it. */
export interface ProvidedVariableContext {
    providedVariable: Ref<ProvidedVariable>;
    setProvidedVariable: ProvidedVariableMutation;
}

/**
 * A typed key rather than the string `'providedVariable'`. A magic string has to be spelled the
 * same way in two files and nothing checks that it was; an `InjectionKey` carries the value's type
 * with it, so `inject` needs no annotation and a rename is a compile error on both sides.
 */
export const providedVariableKey: InjectionKey<ProvidedVariableContext> =
    Symbol('demo:providedVariable');

/**
 * Provides the pair to every descendant of the calling component.
 *
 * @returns The same pair, for the providing component's own use.
 */
export const provideVariable = (): ProvidedVariableContext => {
    const providedVariable = ref<ProvidedVariable>('From the Playground');

    const setProvidedVariable: ProvidedVariableMutation = (value = '') => {
        providedVariable.value = value;
    };

    const context = { providedVariable, setProvidedVariable };
    provide(providedVariableKey, context);
    return context;
};

/**
 * Injects the pair.
 *
 * Throws rather than falling back to a placeholder: a silent default renders a page that looks
 * like it works while demonstrating nothing, which is the one outcome a demo must not have.
 *
 * @returns The provided pair.
 */
export const useProvidedVariable = (): ProvidedVariableContext => {
    const context = inject(providedVariableKey);
    if (!context)
        throw new Error(
            'useProvidedVariable() needs an ancestor calling provideVariable() — see src/modules/demo/provided.ts.'
        );
    return context;
};
