# Project conventions (Claude Code)

This file is the shared source of truth for every coding agent working on this
repository (Claude Code, Codex CLI, Cursor CLI). The same content also lives in
`AGENTS.md` and `.cursor/rules/project.md` — if you change one, change all three
so the tools never disagree on how to work here.

## What this project is

A personal blog and portfolio site for **Matthew Rushmer**. Site title /
`<title>`: **"Matt Rushmer | Security and Cloud Solutions"**. The owner logs in
at `/admin` to write stories and manage photos without touching code. Design
goal: clean yet eye-catching — a sky blue / cloudy white palette with amber-red
accents, used through verified-accessible gradients (see "Design system"
below), not flat single-accent minimalism.

## Tech stack (decided — do not change without asking)

- **Next.js 15 (App Router) + TypeScript (strict) + Tailwind CSS**. Next.js is
  pinned to the 15.x line deliberately — this stays inside the
  `@opennextjs/aws` compatibility matrix for the future AWS deployment. Do not
  bump to Next.js 16 without checking OpenNext's compatibility page first.
- **AWS CDK v2 (TypeScript)** for all infrastructure, written now, deployed
  later. Hosting is **OpenNext (`@opennextjs/aws`) wired by a small
  hand-written CDK stack** — not SST (SST v3 dropped CloudFormation, which
  would break the "CDK for all infra" rule).
- **DynamoDB** (single table) for content, **S3 + CloudFront** (private
  bucket, OAC, presigned uploads) for photos, **Lambda + sharp** for image
  resizing (AWS mode only).
- **Cognito**, one admin user, MFA required (AWS mode only).
- Region: **ap-southeast-2**. No custom domain yet.
- Tests: Vitest (unit + adapter contract tests), Playwright (e2e).
- Image renditions: WebP + a single JPEG fallback at 5 widths in v1. AVIF is
  deferred — do not add it without being asked; it's a deliberate scope cut
  (slow to encode, not worth it until the WebP pipeline is proven).

## Local-first architecture — the one abstraction that's allowed

The app runs in one of two modes, chosen by `DEPLOY_TARGET=local|aws` (default
`local`). Every environment difference is hidden behind **exactly one small
adapter interface per concern, with exactly two implementations**. Do not add
any other abstraction layer, factory, or indirection beyond these four:

1. **Content store** (`src/adapters/content-store/`) — local: JSON files
   under `./data/*.json`; aws: DynamoDB.
2. **File storage** (`src/adapters/file-storage/`) — local: `./data/uploads/`
   served by a Next.js route handler; aws: private S3 + CloudFront, presigned
   uploads.
3. **Image processing** (`src/adapters/image-processing/`) — local: `sharp`
   in-process; aws: S3-triggered Lambda running `sharp`. Both implementations
   import the **same** rendition ladder from `src/core/images/renditions.ts`
   so output is byte-for-byte comparable. Never fork that file per mode.
4. **Admin auth** (`src/adapters/auth/`) — local: single admin account,
   bcrypt/argon2 hash from env, signed httpOnly `SameSite` cookie; aws:
   Cognito + MFA. Both modes share one server-side guard
   (`src/server/auth/require-session.ts`) — never write a second guard.

Every environment-specific value (table names, bucket, CloudFront domain,
Cognito IDs, region) comes from env vars documented in `.env.example`. Never
hardcode an AWS resource name or ARN in application code.

**This must always be true:**
`npm install && npm run seed && npm run dev` gives a fully working site with a
working `/admin`, with **zero cloud access and no AWS account**.
`npm run build && npm start` must also work locally. If a change breaks either
of these, it's a regression — fix it before moving on.

CDK stacks must `cdk synth` cleanly at all times. They are **not** deployed
until explicitly instructed (see Stop-and-ask list below).

## Design system

All colour tokens live in `app/globals.css` (`:root`) — never hardcode a hex
value in a component. The palette is sky blue + cloudy white with amber-red
("warm") accents:

- Background `#f5fafd`, surface `#ffffff`, foreground `#0b1f3a`, muted
  `#3f5876`, border `#dce8f2`.
- Accent (sky) `#0369a1` / hover `#075985` / light `#0ea5e9` (decorative only
  — see below).
- Accent-warm (amber-red) `#c2410c` / hover `#9a3412` / light `#ea580c`
  (decorative only).

**Gradients are tiered by where they're allowed, because a gradient's bright
stops can fail WCAG contrast even when its endpoints individually pass** —
contrast across a gradient must be sampled at multiple points, not just
checked at the ends:

1. **Decorative-only** (`--gradient-brand`, `--gradient-sky`,
   `--gradient-warm`) — includes the bright `*-light` stops. Safe for
   background glows/blobs and the thin header bar. Never put text on these.
2. **Button-safe** (`--gradient-sky-button`, `--gradient-warm-button`) —
   accent → accent-hover only, no bright stop. Used for solid button fills
   with white text; verified >6:1 contrast at the midpoint.
3. **Text-safe** (`--gradient-brand-text`) — sky-700 → ember-700 only. Used
   for `.gradient-text` (headings, wordmark); verified >4.5:1 at 5 sample
   points (0/25/50/75/100%) against the background.

When adding a new gradient, verify contrast the same way (sample multiple
points along it against its actual background/text pairing, not just the
endpoints) before wiring it into anything that carries text.

## Git workflow

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`,
  `chore:`, `perf:`, `ci:`. Imperative mood, subject under 72 chars, body line
  when the "why" isn't obvious from the diff.
- **Many small, atomic commits.** Each commit leaves the project in a working
  state. Never batch unrelated changes into one commit.
- Short-lived branches per phase/feature (`feat/stories`, `feat/admin-auth`,
  `feat/cdk-stacks`, …), merged into `main` with `--no-ff` so the history stays
  readable.
- Before every commit: check `git status` and `git diff --staged`. Confirm no
  secrets, `.env*` files, `./data` contents, or build artifacts are staged.
  Never `git add -A` blindly — add specific files.
- Never force-push, never rewrite published history, never commit with
  `--no-verify`.

## Code style

- Many small files over few large ones: 200-400 lines typical, 800 max.
  Organize by feature/domain, not by type.
- No comments that restate what the code does. A comment is only worth adding
  when it explains a non-obvious WHY (a workaround, a hidden constraint, a
  subtle invariant).
- Validate at system boundaries (route handlers, upload endpoints) with zod.
  Adapters persist already-validated data; they don't re-validate.
- Don't add abstractions, dependencies, or config options beyond what's
  actually needed right now. No speculative generality.

## Security — non-negotiable

- Never put secrets, keys, passwords, or tokens in code, prompts, or commits.
  Read them from env vars (`.env.local` locally, git-ignored; Secrets
  Manager/SSM when deployed). `.env.example` holds placeholder names only.
- The S3 bucket (AWS mode) must never be publicly readable except through
  CloudFront.
- Upload validation in **both** modes: verify image type by content (magic
  bytes), not just file extension; max 15 MB; sanitize filenames.
- The local admin must refuse to enable `/admin` if its password env var is
  missing — never fall back to a default password.
- Admin pages AND admin API routes must be protected server-side in both
  modes via the shared session guard — never trust a client-side check alone.

## Do not add (out of scope — ask first if you think one is needed)

Comments/discussion features, newsletters, analytics, site search, a
dark-mode toggle, i18n, e-commerce, or any auth provider beyond the single
admin account.

## Stop and ask before

- Running `cdk deploy` or anything that creates a billable AWS resource.
- Creating a GitHub repository (one already exists at
  `github.com/MattRushmer/MyBlog` — don't create another).
- Adding any dependency that isn't already part of the agreed stack.
- Buying or configuring a domain.
- Modifying IAM permissions beyond what the architecture plan states.
- Deleting any file outside this project directory.

If the same error persists after 3 fix attempts, stop and report what was
tried instead of continuing to loop.
