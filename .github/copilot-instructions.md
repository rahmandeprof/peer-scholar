## Repo quick facts

- Framework: NestJS (TypeScript). Entry: `src/main.ts` -> `AppModule` (`src/app/app.module.ts`).
- DB: TypeORM with Postgres. ORM config: `src/database/ormconfig.ts`. Migrations auto-generated from entities (see `src/database/migrations`).
- Key modules: `src/app/auth`, `src/app/users`, `src/app/otp`, `src/mail`, `src/database`, `src/app/admin`.
- Scripts (use `yarn`): see `package.json` for common workflows: `start`, `start:dev`, `build`, `test`, `migration:run`, `migration:revert`, `seed:run`, `typeorm` helper.

## Goal for AI coding agents

Be immediately productive: follow repository conventions (module layout, TypeORM patterns, env validation) and prefer minimal, low-risk edits. Always reference the exact files below when changing behavior.

## Architecture & conventions (what to know)

- Modular Nest app: features are grouped by folder under `src/app/*` (e.g., `auth`, `users`, `otp`, `admin`). New features should follow that pattern (module/controller/service/entity/dto).
- Database ownership: Entities live under `src/*/entities` or `src/database/entities`. Migrations are generated from entities (do NOT hand-edit migrations unless absolutely necessary). Use the provided typeorm script: `yarn typeorm -- migration:generate ./src/database/migrations/<Name>` and `yarn migration:run`.
- Config & env: `@nestjs/config` is configured globally in `AppModule` and validated by `src/validation/env.validation.ts`. Missing/invalid env will block startup — consult `src/config/configuration.ts` and the `validate` function before adding new env keys.
- Auth: The project uses a wrapper `better-auth` and a local config at `src/app/auth/auth.ts`. `AuthModule.forRoot(...)` is called in `AppModule`. To change authentication behavior, check `src/app/auth/*` (guards, permissions, decorators).
- Logging & interceptors: Global interceptors are registered in `AppModule` — `RequestLoggingInterceptor` and `ErrorsInterceptor` (`src/interceptor/*`). Keep cross-cutting changes consolidated there.
- Mail templates: Handlebars/EJS templates are under `src/mail/templates/*.hbs`. Use `MailModule` and `MailService` when wiring email flows.
- Path aliases: Code uses `@/...` imports. Runtime scripts that execute TypeScript (typeorm, seeds) register `tsconfig-paths` (see package.json `typeorm` and `seed:run` scripts). When running ad-hoc scripts, include `-r tsconfig-paths/register`.
- Factories/seeders: Seeding uses `@jorgebodega/typeorm-seeding`. Look at `src/database/factories` and `src/database/seeders` before adding test data.

## Developer workflows & commands (explicit)

- Install deps: `yarn`
- Dev run: `yarn start:dev` (uses Nest watch)
- Build: `yarn build` (outputs `dist/`)
- Prod run: `yarn start:prod` (runs compiled `dist/main`)
- Tests: unit `yarn test`; e2e `yarn test:e2e` (jest config for e2e in `test/jest-e2e.json`); debug tests: `yarn test:debug`.
- TypeORM & migrations: `yarn typeorm -- <command>` (this script runs the TypeORM CLI via ts-node and tsconfig-paths). Examples:
  - Generate: `yarn typeorm -- migration:generate ./src/database/migrations/<Name>`
  - Run: `yarn migration:run`
  - Revert: `yarn migration:revert`
- Seed: `yarn seed:run` (uses `ts-node` and `tsconfig-paths` with `@jorgebodega` seeding CLI). Check `src/database/seeders/*.ts`.
- Lint/format: `yarn lint`, `yarn format` (husky + lint-staged runs on pre-commit).

## Patterns and code examples (do this, not that)

- When adding a new feature module:

  1. Create `src/app/<feature>/<feature>.module.ts`, controller, service, DTOs and `entities/` folder.
  2. Register the module in `AppModule` imports.
  3. If the feature needs env keys, add them to `configuration.ts` and update `env.validation.ts`.

- Database changes: Modify entity files under `entities/` and then generate a migration via the typeorm script above (do not manually write migration SQL unless necessary).

- Authentication changes: Modify `src/app/auth/auth.ts`, `auth.service.ts`, or `auth.guard.ts`. Permissions and custom decorators are in `src/app/auth/permissions.ts` and `src/app/auth/decorators.ts`.

- Email templates: Edit `src/mail/templates/*.hbs`. Use `MailService` to send and pass variables matching templates.

## Where to look for causes when something fails

- App won't start: check env (validated in `src/validation/env.validation.ts`) and `configuration.ts`.
- DB migration failures: inspect `src/database/ormconfig.ts` and migrations under `src/database/migrations`.
- Unexpected auth/permission errors: check `src/app/auth/*` (guards, decorators) and `AppModule` where `AuthModule.forRoot(...)` is wired.

## Testing & CI notes

- Jest config in `package.json` uses `rootDir: src`, so tests live under `src/**` with `.spec.ts` patterns. e2e tests use `test/jest-e2e.json`.
- Keep tests fast and avoid requiring external services; prefer mocking DB for unit tests. For integration/e2e use a test Postgres instance or docker-compose if available.

## Quick checklist for PRs that an AI agent might create

1. Add/modify files under `src/` only. Follow existing folder/module layout.
2. If you add env variables -> update `configuration.ts` and `env.validation.ts`.
3. If you change entities -> generate migration (`yarn typeorm ...`) or note migration needed in PR description.
4. Run `yarn lint` and `yarn test` locally before proposing changes.

## Contact & follow-ups

If something is unclear in this file, tell me which area you want more examples for (migrations, auth, mail templates, or seeding) and I will expand that section.

---

Files referenced (start here):

- `src/app/app.module.ts`, `src/app/auth/*`, `src/app/users/*`, `src/validation/env.validation.ts`, `src/config/configuration.ts`, `src/database/ormconfig.ts`, `src/database/migrations/`, `src/mail/templates/`.
