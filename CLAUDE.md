## Changing a contract

The backend owns the contract. This repo never edits it.

- NEVER hand-edit `openapi.yaml`, `asyncapi.yaml` or `contracts/{authorization-keys,cookies,frontend-links}.yaml`.
  They arrive by the backend's `npm run sync:frontend`, and `npm run check` refuses a copy that
  differs from the backend's.
- NEVER hand-edit what is generated from them (`contracts/rest/*`, `contracts/asyncapi.generated.ts`,
  `contracts/permission-vocabulary.ts`): `npm run regenerate` rebuilds them.
- A contract change starts in the backend: edit its fragment, `npm run regenerate` there, then
  `sync:frontend`, which also runs this repo's `regenerate`.
- From a lane worktree, sync into the paired frontend worktree, never into this repo's main.

See: `docs/api/openapi-workflow.md`, `docs/api/asyncapi-workflow.md`

## Changing a shared rule

A rule that is only data lives in `shared/rules/*.yaml`, checked by a Zod schema under
`scripts/contracts/shared-rules/`.

1. Edit the YAML.
2. `npm run regenerate` (rewrites the `*.generated.ts` beside its reader, and `shared/rules/schemas/`).
3. A backend-owned rule arrives under `contracts/`. Never edit it here.

See: `docs/tools/shared-rules.md`

## TypeScript

Every rule in this section is machine-checked: `strictTypeChecked` plus the project-local rules in
`scripts/eslint/`. The reasoning is written out because it matters when you hit one.

- MUST use `strict: true` in all TypeScript code.
- MUST NOT use `any`. Use `unknown` plus type narrowing.
- MUST NOT use `as unknown as X`, nor `as any as X`, tests included. A double cast launders `any`.
  - Fix the type at its source: a typed factory, a type guard, or a parse through the generated
    Zod schemas in `contracts/rest/`.
  - One exception, for hand-built test stubs only: `asStub<T>()` from `tests/support/stub.ts`.
- `as X` only **narrows**: it names which type a value already can be, proven by a check the
  compiler cannot follow (`unknown` after a Zod parse, a union after a discriminant, an `Element`
  after a selector check). Say which check, in a comment.
- `as X` never **widens or claims**: no list item cast to a full record, no partial to a whole,
  no `{}` to `T`. Model it with a union, a separate type or a parse. (An object literal cast to a
  type is lint-enforced: `consistent-type-assertions`.)
- `!` likewise: never to quiet a type error.
- MUST NOT use `@ts-ignore`. `@ts-expect-error` only where the type error is the thing under test,
  always with a description.
- Every `eslint-disable`, in a script or a template, carries ` -- <why>`. An unused one fails.
- MUST use ESM imports only. The one exception is a tool's `.cjs` config file.

## Styling

- MUST use a Tailwind scale class or a token. A repeated custom value becomes a token in
  `src/styles/main.css` `@theme`.
- MUST NOT write a colour literal outside `src/ui/vuetify/theme.ts`. Use theme names (`primary`,
  `on-surface`…); `local/theme-token` refuses the rest.
- A one-off arbitrary value takes `eslint-disable-next-line better-tailwindcss/no-restricted-classes -- <why>`;
  a value used twice is a token.
- Every `v-dialog` binds `:fullscreen` from `useFullscreenDialog()`. No hover-only cue: `hover:` refines
  a visible resting state, never replaces it.
- Override Vuetify through a prop, `defaults` or the theme, never its classes;
  `tests/cross-cutting/css-invasiveness.spec.ts` refuses new invasive CSS (`npm run audit:css` lists it).
  The calls no check can make: `scripts/audit/css-invasive/SKILL.md`. Run it to find them.
- See `docs/theory/design-system.md`. What no lint can see — rhythm, hierarchy, a screen that
  reads wrong — is judged from screenshots: `scripts/audit/design-manual/SKILL.md`. Run it to
  find them.

## Function design

- MUST apply SOLID principles.
- MUST keep functions focused — one responsibility each.
- MUST keep nesting ≤ 3 levels; extract a helper for anything deeper. `max-depth` enforces the
  block half at 3; `max-nested-callbacks` caps callbacks at 4 in production code — chain, or name
  the step.
- MUST prefer pure functions and shared abstractions over duplicated inline logic.
- MUST NOT extract a function, file or wrapper unless it hides real complexity, names a domain
  rule, is a boundary (port, adapter, third-party call), or has ≥ 2 callers today. A three-line
  helper with one caller stays inline.
- MUST NOT add a parameter, option, generic or interface for a caller that does not exist yet.
- The shapes, their names and the legitimate reasons to keep one:
  `scripts/audit/code-shape/SKILL.md`. Run it to find them.

## Dependencies — look before you build

Open source first:

1. **Already in the repo.** Read `package.json` first, `@guebbit/*` toolkits included.
2. **A maintained library.** Released in the last ~12 months, issues answered, typed, a usable
   licence, a sane dependency tree.
3. **Only then write it ourselves**, and say why in one line.

- MUST NOT reimplement crypto, auth, parsing, date maths or validation by hand.
- Prefer the platform (`Intl`, `URL`, `AbortSignal`, `crypto.subtle`) over a library.
- A runtime dependency costs bundle. Load it with dynamic `import()` unless the boot path needs it:
  `tests/cross-cutting/entry-chunk-budget.spec.ts` guards the entry chunk.
- When a choice is close, present the options and the trade-off.
- **Write it down in the same change:** its group and purpose in
  `docs/tools/package-dependencies.md`. A library only one module imports goes in that module's
  page under `docs/modules/`, in a `## Libraries` section. `example` has no page by design.

## Module barrels

Every module publishes a barrel (`src/modules/<name>/index.ts`) that exports everything the module
can offer a sibling. See `docs/theory/strategic-ddd.md` §5.

- MUST export the module's stores, composables, components and `domain/` rules, whether or not a
  sibling imports them today. Unused exports are allowed on purpose: they are harmless, and a missing
  one makes the next author, or an AI, copy the logic, redeclare the type or reach around the barrel.
- MUST NOT remove an export because nothing imports it yet.
- The one exception is size, not policy: `response-schemas.ts` and `schemas.ts` stay out, because
  they pull the generated Zod contract into the entry chunk (`entry-chunk-budget.spec.ts`). A
  `schemas.ts` is published only where a sibling imports it.
- Never published: `views/`, `routes.ts`, `module.ts`, locales and `provided.ts`.
- Siblings import only through `index.ts`; a module never imports its own barrel.

## Scope

- **Backward compatibility is the default.** A change keeps working for what the previous release
  left behind:
  - The backend it talks to may be one release older or newer for a while: read new fields as
    optional, and tolerate an unknown enum value.
  - Stored client state (`localStorage`, cookies, cached query data, a service worker): expand →
    contract. Read the old shape for one release, then remove it in the next.
  - A route someone bookmarked, or the backend mails (`contracts/frontend-links.yaml`): rename
    with a redirect for one release.
- MUST NOT keep compatibility code past that one release: no permanent field aliases, no
  `@deprecated` tags left "for later".
- **Pre-release opt-out:** when the backend's `.work/HANDOFF.md` (plans for both repos live there) or the
  user's prompt says "pre-release: no backward compatibility", replace instead. No shims, no
  bridges, no deprecation period.
- MUST NOT build guardrails for staff against their own choices: no extra confirmations, no
  two-step dialogs, no refusals for a lock-out or an odd set-up. Staff get the instrument and a
  guide entry. Guard only what would break consistency.

## Async and error handling

- **Prefer promise chaining** (`.then`/`.catch`/`.finally`) when there are only 1–2 awaits.
- Use `async`/`await` only when several sequential awaits make chaining unreadable.
- **Avoid `try`/`catch`** unless genuinely necessary — synchronous throws, or multi-step
  transactions with partial rollback.
- MUST handle errors explicitly — no swallowed promises.

## Comments

- Exported functions, interfaces, types and enums: JSDoc REQUIRED — `jsdoc/require-jsdoc`. An
  interface states its purpose and what each field means; a function adds `@param`/`@returns`/
  `@throws` **as needed**. "As needed" is yours to judge, but a tag you do write is checked:
  `jsdoc/check-param-names` refuses a name that is not in the signature, `check-tag-names` refuses
  a tag that is not a tag, and the `*-description` rules refuse an empty one.
- Every `.ts` file **under `src/`**: a JSDoc `@module` header at the top explaining the **logic or
  pattern** the file follows — what it is and how it works, not what it is for in the product.
  Keep it short: a few lines, enough to orient someone opening the file cold. If it grows into
  prose, it belongs in `docs/`. One `@module` header per file, always — a `.vue` SFC's
  `<script setup>` block gets it the same way a `.ts` file does; a second `<script lang="ts">`
  block in the same SFC (e.g. the devtools `name` block) is still part of that one file and does
  not get its own `@module` tag.

  `scripts/**` and `tests/**` are outside the rule, and `eslint.config.ts` scopes `jsdoc/*` to
  `src/**` to match. Both are free to open with a file-level docblock — most already do, and the
  cross-cutting specs carry the repo's architectural invariants in theirs — but the tag is not
  required there and nothing checks for it.
- Non-trivial internal helpers: a concise inline or JSDoc explanation.
- Every comment answers up to two questions, in this order, and nothing else:
  1. **What does this do**, only if the name doesn't already say it.
  2. **Why is it shaped this way**: the one non-obvious reason, or its place in the larger flow.
- **The budget is prose; structure is nearly free.** A list item, a `Label:` row, a table, a fenced
  block and a JSDoc tag barely count:

  | | prose lines |
  | --- | --- |
  | `@module` header | 6 |
  | any other declaration | 8 |
  | total lines, whatever the form | 24 |

  Over budget: change form, never delete the content. Past 24 lines it belongs in `docs/`, with a
  link left behind. Never hand-maintain a row that restates something generated elsewhere.
- One idea per comment. Never restate what the code or a good name already says.
- Docs describing flow, architecture or process MUST include Mermaid diagrams.
- Never narrate history — no "this used to...", "previously...", "was renamed from...". A comment
  describes the code as it is now; git log is where the past lives.
  The same holds for `docs/`: a page states why the design is what it is, in the present tense
  ("there is no X, because…"), never how it got there.
- Never reference an untracked `.md` file, by link or by name. Stable targets: `docs/*` and the
  tracked root `CLAUDE.md`, `README.md`, `SECURITY.md`, `INSTALL.md`. Nothing enforces this
  beyond `.gitignore`.

Comments are **not** a replacement for the documentation. They are code-centric: they explain the
code in front of you, and give a quick overview of what the docs already say in full. The
reasoning, the alternatives and the diagrams live in `docs/` — a comment points at that, it does
not reproduce it.

## Code layout

Orderly, scannable files. Two rules, always:

- **Every top-level declaration gets JSDoc.** Top-level means the outermost body of the file —
  and also the outermost body of whatever construct owns most of the file (a composable, a store
  definition, a factory, a class body, a `setup()`). Constants, types, helpers, refs, computeds,
  actions, exported and internal alike: each one carries its own JSDoc block.
- **One blank line between them.** Every top-level declaration is separated from its neighbours by
  a single empty line — Prettier's formatting has no way to preserve more than one, so this is the
  enforced ceiling, not just the floor — so the JSDoc block visually belongs to the thing below it.
  Inside a declaration, blank lines are fine as needed.

```ts
/**
 * Rows currently visible after the active filter.
 */
const visibleRows = computed(() => rows.value.filter(isVisible))

/**
 * Reloads the table, discarding any optimistic edits.
 *
 * @throws {FetchError} When the endpoint is unreachable.
 */
const reload = () => fetchRows().then(applyRows)
```

## Commenting external calls

Calls into an external dependency are the code we forget fastest — the parameters are someone
else's vocabulary, not ours.

- Any class instantiation or method call from an external dependency with **non-obvious
  parameters** MUST be annotated: either a brief comment above the call, or a JSDoc block
  documenting each unclear parameter.
- Annotate the parameters that are not immediately clear — magic numbers, bare booleans,
  option objects, positional arguments whose meaning comes only from the library's docs. Skip the
  self-evident ones.
- Link the relevant doc page, when one exists. Don't paraphrase the library's docs.
- Prefer more comments over fewer. When in doubt, write it.

All of it ADHD friendly: short lines, one idea per line, plain language, the "why" before the
"how". No paragraphs, no restating the code.

```ts
// Sharp: resize to a fixed box, letterboxed rather than cropped.
sharp(buffer).resize(
  1200,           // width, px
  630,            // height, px
  {
    fit: 'contain',              // pad instead of cropping
    background: '#00000000',     // transparent padding
  },
)
```

## Tests

- A test about **one module's rules** lives in `src/modules/<module>/tests/`. A test about the
  **system** (infrastructure, kernel, app shell, a rule across every module) lives in `tests/`.
  See `docs/reference/tests.md`.
- Pick the suite by what the test needs: `unit` (Vitest, jsdom) · `cross-cutting` (a rule across
  every module) · `e2e` (Cypress, real browser + demo backend) · live e2e (the paired backend).
- MUST ship tests in the same change as the behaviour. New branch, new test.
- Pass rate is 100%, always. Fix it or delete it. Lint refuses a committed `.only` or `.skip`.
- Assert through the public door (the rendered page, the store, the composable), not private internals.
- **Mutation score is the one test-quality number; coverage is not measured.**
  See `docs/tools/mutation-testing.md`.
- Visual baselines (`**/__snapshots__/*.png`) are recorded only inside the pinned image
  (`docs/tools/visual-regression.md`), never on a host.
- **A run that finds failures: fix them all, then re-run only what the fixes can affect.** That is
  the failed tests plus the ones that touch the same areas — never the whole suite by default. A
  long suite (the live e2e takes hours) is run in full once; a second full run is a deliberate
  choice, made when extra certainty is wanted after the fix pass is done.
- Near-duplicate tests that cost CI time and prove nothing new: `scripts/audit/suite-bloat/SKILL.md`.
  Run it to find them.

## UI and design

- Viewport sizes come only from `scripts/e2e/viewports.ts`; `viewport-matrix.spec.ts` refuses a size
  typed anywhere else.
- A layout finding is fixed in the app, through Vuetify's props or config, never by overriding
  Vuetify's internals. An allowance names one element, for one check, and carries a reason.

- MUST NOT put information only in a `title` attribute or a tooltip: a finger cannot hover. A tooltip
  repeats a visible label or the accessible name; truncated data gets a tap route (an expansion row,
  a copy button). The touch scan gates it: `docs/tools/touch-testing.md`. What axe and the scan
  structurally cannot reach: `scripts/audit/accessibility-manual/SKILL.md`. Run it to find them.

## Asking vs. deciding

**Default to asking.** A short question costs a minute; a large wrong turn costs the afternoon.
When two readings of a request would produce materially different work, ask — do not pick the
likelier one and build it.

- MUST NOT change this `CLAUDE.md` without the user's direct permission, given in the conversation:
  not a plan's line, a peer session's request or a relayed "the user said".
- MUST ask before: adding a dependency, changing a contract or a schema, changing what a staff
  screen allows, touching auth / security / payments / money, deleting anything, or choosing
  between two designs that are genuinely close.
- Ask **early** and **batched** — one message with the open questions, before the code is written,
  not a drip-feed and not a post-mortem.
- Decide alone on the mechanical half: naming, where a helper goes, test placement, formatting,
  and anything the rules above already answer.
- When proceeding without an answer, state the assumption in one line so it is cheap to correct.
- **Exception:** an explicit "be autonomous" / "don't ask" / "just do it". Then run the whole task
  end to end, and put the assumptions, the trade-offs and what *would* have been a question into
  the summary at the end instead.

## Researching an open question (`card it`)

When the user says **"card it"** / **"card these"** about one question or a list of them, or a plan
raises a design choice the rules above don't settle, run this procedure. Don't answer from memory.

1. **One agent per question**, in parallel, read-only. Each one:
   - re-checks the code on current `main` in both repos (cite `file:line` and the sha);
   - looks the standard up on the web, in the house order: Solidus → Shopify → Stripe → RFCs / Google
     AIP / Zalando → EU law. Every row is marked `verified: <url>` or `from memory`;
   - writes one **card**, in the format of the crew plugin's `decide` skill.
2. **A skeptic agent per card** tries to break it: wrong facts, a better option, a clash with
   another decision. The card is corrected, never just defended.
3. **File it by confidence after the skeptic.** FE-only cards sit 10 points lower: the FE is
   allowed to be more creative than the BE.

   | Outcome | BE (or BE + FE) | FE only | File | Built? |
   | --- | --- | --- | --- | --- |
   | decided | ≥ 90 % | ≥ 80 % | `DECIDED.md` | yes |
   | decided with doubts | 80–90 % | 70–80 % | `DECIDED_WITH_DOUBTS.md`, alternatives kept | yes; the user may overturn it |
   | asked | < 80 % | < 70 % | `QUESTIONS.md` | no, waits for the user |

   - Whatever the %, a card on money, auth, deletion, a new dependency or a contract is asked
     (§ Asking vs. deciding).
   - An answered card moves to `DECIDED.md` in its final wording, with `Decided by: user, <date>`.
     A pipeline decision carries `Decided by: <role>, <N %>`.

4. **Where cards live:** the backend's `.work/` (gitignored), one home for both repos, one folder per feature:
   `.work/features/<feature>/` holds `QUESTIONS.md`, `DECIDED.md`, `DECIDED_WITH_DOUBTS.md`.
   - Each file has one writer: the role that decided, or the vicemanager.
   - A decided card is its lane's build spec; its lane row in `.work/HANDOFF.md` says so.
5. **"Prune" or "refute"**: one refuter agent per decided card. A refuted card goes back to
   QUESTIONS; a surviving one is permanent and gets its amendments appended to its card.

## Commits

Conventional Commits, enforced by commitlint on the `commit-msg` hook.

- `type(scope): subject`. Lowercase, imperative, no trailing full stop.
- Types: `feat` `fix` `refactor` `perf` `test` `docs` `style` `build` `ci` `chore` `revert`.
- Scope is the module or area. The subject says what the change does for the user or system.
- One commit per lane by default: code, tests, docs and the BE half together. Every commit pays the
  hook's light gate.
  - Check slices cheaply (eslint, prettier, tests by file); do not commit them.
  - A second commit only to keep a behaviour change apart from a mechanical pass. Follow-ups and
    review fixes are amended in.
  - Small unrelated items may share one commit: the header takes the type of the largest, the body
    lists each as `- type(scope): subject`.
- Breaking change: `!` after the scope plus a `BREAKING CHANGE:` footer.
- MUST stage explicit pathspecs, never `git add -A` or `git add .`. Commit with
  `git commit -m "…" -- <paths>`. After a failed hook, run `git status` before retrying.
  - Untracking a file (`git rm --cached`) is the one exception: a pathspec commit re-adds the
    working-tree copy. Check `git diff --cached --name-status` shows only the deletions, then run a
    plain `git commit`.
- The container engine is **podman** (rootless). `docker` here is the podman shim.
- MUST NOT run subagents that implement concurrently in the same working tree.
- The pre-commit hook runs `lint-staged` (eslint + prettier on staged files), runs
  `npm run regenerate` when `openapi.yaml`/`asyncapi.yaml` is staged, then
  `complete:light:gates` (`check`, `vue-tsc`, unit).
- A lane merges on `complete:light`, plus every Cypress spec it adds or changes, run by file.
  CI on push is authoritative.
- Before the commit, run every test the hook does not run that the change touches: a new Cypress
  journey or live e2e, AND every existing one whose screen, flow or response shape the change
  alters, by file. If the stack cannot run it, the change does not merge until it has. The commit
  message names what ran; "not run here" is not allowed.
- **NEVER** use `--no-verify` unless a `complete` (regular or `:fix`) has just passed on the
  current tree.

<!-- 2brain:start — regenerate with: 2brain <repo-path> -->
Use the repository context generated by 2brain before proposing changes.
@.2brain/REPO_CONTEXT.md
<!-- 2brain:end -->
