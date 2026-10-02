---
source: src/modules/users/views/User.vue
sha256: 254257656ace3748c0dbad76850b81e4f1e5af0bdae07b5b0daf23cafe6fd3fd
generated_at: 2026-10-02T15:51:52.638831+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/User.vue

## Purpose

Read-only user detail page (`UserTargetPage`). Resolves a single user from the route `id`, renders their identity fields, role chip, and status chip, and exposes two admin actions: a 2FA recovery button (no-proof path) and a `UserAccessDialog` shortcut for changing role/active status without the full edit form.

## Key elements

- **`heroTitle` / `heroDescription` / `userRole` / `userStatus`** — Computed display values with graceful fallbacks (route id, empty-value glyph, i18n strings) while the user is loading or absent.
- **`auditLogTo`** — Computed `RouteLocationRaw | undefined` that links to the audit log for this user. Returns `undefined` (hiding the History button) when the `admin` module / `AuditLog` route is not present in the build.
- **`watchUser(() => id, { onError: onMissingRecord })`** — Fetches (or re-fetches) the user whenever the route param changes; 404/403 is handled by `useMissingRecord`.
- **`handleManageAccess`** — Opens `UserAccessDialog`, awaits confirmation, then calls `updateUser` with only the changed fields. Failures are reported via a local `useBlockingError` instance (`accessError`).
- **`handleDisableTwoFactor`** — Shows a `v-dialog` confirmation (error-colored), then calls `adminDisableTwoFactor(id)`. Failures are reported via a separate `useBlockingError` instance (`disableTwoFactorError`) and rendered inline via `InlineErrorAlert`.
- **`useBlockingError` (two instances)** — One for the access-dialog action, one for the 2FA button. Each keeps its error local to the button rather than toasting, per the project's request-flow convention.
- **Template** — Uses `ItemDetailLayout` with `#hero`, `#stats`, `#aside`, and `#actions` slots; `CardMaterialStat`, `ItemDetailField`, `CardDetail`, `CardInfo`, and `ItemDetailHero` as building blocks; lucide icons for labels.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Graph neighbor (transitive dependency, likely reached through the users store or a utility imported above). No direct `import` of logger in this file; it is not invoked explicitly here.

## Notes

- **Role is never translated.** `userRole` renders the raw `role` string. Roles are deployment-defined data; only server-side rules constrain them, so the UI must not hard-code a "admin / user" pair.
- **2FA disable is a deliberate security exception.** No authenticator code or backup code is requested. The confirmation dialog must explicitly state this, and every call is audited server-side. Do not add a "verify first" step here.
- **Dual gate on the History link.** `auditLogTo` checks route existence (build-time module boundary), while the button's `v-if` also checks `session.can('read', 'AuditLog')` (per-visitor permission). Both must pass for the link to render.
- **Component name ≠ file name.** The exported component is `UserTargetPage`; the file is `User.vue`. Search for `UserTargetPage` when tracing templates or stories.
- **`updateUser` receives only changed fields.** `UserAccessDialog`'s result is filtered before the PATCH so an unchanged `role` never rides along (prevents unintended audit-log noise).
