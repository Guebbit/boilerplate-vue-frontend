# src/modules/account/components/ProfileRole.vue

## Purpose

A self-service role-switch widget that lets an admin promote or demote *themselves* between standard-user and administrator, visible only on the admin's own profile page. It exists as a standalone block (deliberately outside the main profile form) because the role change hits a different endpoint under a different authorisation than the rest of the profile.

## Key elements

- **`roleIsAdmin` (ref)** — Reactive state backing the `<v-select>`. Seeded from `profile.admin` and re-seeded by a `watch` whenever the profile record changes ("hydrate, never clobber").
- **`watch(profile, …)`** — Immediate watcher that re-syncs the select to the record; no dirty guard needed because a two-option select holds no user keystrokes.
- **`roleOptions` (computed)** — The two translated choices (`generic.administrator` / `generic.standard-user`).
- **`roleIsDirty` (computed)** — True when the select differs from what the record currently holds; gates the submit button.
- **`handleRoleChange()`** — Applies the chosen role via `updateOwnRole`. Promoting resolves immediately; demoting first shows a confirmation dialog (the only irreversible direction). On refusal or failure the select is restored to the record's value.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — No direct import in this file. It appears in the dependency graph as a transitive dependency, most likely pulled in through `@/infrastructure/utils/errors.ts` (used for `notifyErrorMessages`) or through the Pinia store modules.

## Notes

- **Self-gating:** The entire template is wrapped in `v-if="isAdmin"`. A non-admin sees nothing; the gate lives with the widget, not the embedding page.
- **Asymmetric confirmation:** Only *demotion* triggers a dialog. The rationale (documented in the JSDoc) is that demoting yourself removes the very routes you'd need to reverse it; promoting is a no-op risk-wise.
- **Separate from the main form:** The `<v-divider>` + `<section>` block is intentionally outside the profile form's submit flow. Folding it into "Save changes" would put two authorisations behind one button.
- **Test hooks:** `data-test="profile-role"`, `data-test="role-select"`, and `data-test="role-submit"` are exposed for E2E tests.
