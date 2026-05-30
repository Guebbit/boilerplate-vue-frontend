# Copilot instructions

Repo = Vue frontend boilerplate.
This repo = `boilerplate-vue-frontend`.
Single package. SPA. Vue 3 + Pinia + Vue Router + OpenAPI-generated client.

Human-facing docs: [README.md](../README.md) · [PAIRING.md](../PAIRING.md).

## Mandatory pre-work checklist

- Treat this file as required repository policy and follow it during the whole task.
- For every change, check whether documentation must be updated.

## Code brain

- Keep code SOLID.
- Keep code DRY.
- Keep code KISS.
- Prefer composables/stores over duplicated view logic.
- `openapi.yaml` first. Contract and generated client types start there.
- Use generated API client from `/api`; avoid manual endpoint wrappers unless required.
- Keep comments short and practical.
- Avoid `async` / `await` + `try/catch` unless necessary.
- Comments short. ADHD friendly. Explain function/constant/block fast.
- **All functions and important code blocks must have a JSDoc comment** in multi-line `/* \n * ... \n */` block format (not `/** */`). Include `@param` and `@returns` where useful. One line per tag.
- Do not dump long essays in code comments. Put detail in docs.

## Docs brain

- Keep docs concise and visual.
- Keep frontend-specific sections frontend-specific (Vite, Pinia, Router, Cypress, MSW).
- Keep shared contract sections aligned with backend docs (`openapi.yaml`, `genapi`, contract sync).
- Link related sections instead of duplicating long explanations.

## Change brain

- Boilerplate is example-focused: keep changes small but complete.
- Do not break API contract without updating `openapi.yaml`.
- After contract edits, regenerate `/api` with `npm run genapi`.
- Keep auth, i18n, and error-handling flows consistent across stores/composables.
- **Never** create backward-compatibility shims, legacy aliases, or transitional code unless explicitly requested. Fix forward; remove old code immediately.
