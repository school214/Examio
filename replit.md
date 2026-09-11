# Examio

Examio is a Swedish Årskurs 8 practice-exam platform that helps students rehearse exams and understand what to improve.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/examio` — React/Vite student and admin web app.
- `artifacts/api-server` — Express API for exams, attempts, results, and admin summaries.
- `lib/api-spec/openapi.yaml` — source of truth for API contracts.
- `lib/db/src/schema/examio.ts` — Drizzle schema for Examio tables.
- `artifacts/api-server/src/lib/seed.ts` — idempotent development seed for Religion and History exams.

## Architecture decisions

- Student-facing exam payloads never include answer keys; grading happens in the API on submission.
- Exam content is data-driven so additional subjects and exams can be added without changing the student dashboard.
- The first release uses deterministic server-side practice feedback so existing exams remain usable even before AI services are configured.
- The frontend consumes generated hooks from the OpenAPI contract rather than hand-written API types.

## Product

- Swedish homepage and student dashboard.
- Seeded Religionskunskap and Historia Årskurs 8 practice exams.
- Mixed question types, attempt autosave, question navigation, marking, submission, and practice result feedback.
- Result history, learning profile, and a starting admin exam-management surface.

## User preferences

All user-facing student content should remain Swedish and should distinguish Examio practice assessments from official school grades.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- Restart the managed API and web workflows after backend or frontend changes.
- Admin authentication, Gemini generation, and image generation still need their production integration pass.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
