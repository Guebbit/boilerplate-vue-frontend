export const firstFormErrorFieldSelector =
    '.form-error input, .form-error textarea, .form-error select, .form-error [tabindex]';

export const focusFirstErrorField = (formElement?: HTMLFormElement) =>
    formElement?.querySelector<HTMLElement>(firstFormErrorFieldSelector)?.focus();
