# AI README (Frontend)

Repo = Vue frontend boilerplate.
This repo = `boilerplate-vue-frontend`.
Single package. SPA. Vue 3 + Pinia + Vue Router + OpenAPI-generated client.

## Code brain

- Keep code SOLID.
- Keep code DRY.
- Keep code KISS.
- Prefer composables/stores over duplicated view logic.
- `openapi.yaml` first. Contract and generated client types start there.
- Use generated API client from `/api`; avoid manual endpoint wrappers unless required.
- Keep comments short and practical.

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
