# ADR-0005: API First — Orval генерация Hono роутов и Zod-схем

**Дата:** 2026-09-18 (обновлено)
**Статус:** Accepted
**Теги:** api, backend, frontend

---

## Контекст

Нужен единый контракт для backend (TS) и frontend (Dart). Источник истины — OpenAPI-спека в `swagger/`. Требуется генерировать Hono-роуты и Zod-схемы из спеки, но так, чтобы **бизнес-логика оставалась отдельно** (в `controllers/`).

## Рассмотренные варианты

1. **`@hono/zod-openapi` (ранее)** — роуты описывались вручную Zod-схемами, spec генерировался из кода. Источник истины де-факто — код, спека — зеркало. Ручная синхронизация через CI-дифф.
2. **`hono-takibi`** — генератор OpenAPI → `@hono/zod-openapi`; рассматривался, но не выбран (отказ от генерации и валидации на стороне спеки).
3. **`orval` (выбран)** — генератор из OpenAPI, поддерживает `client: 'hono'`: Hono-роуты, Zod-схемы, типы, валидатор, типизированные контексты. Спека — источник истины, код — производный артефакт.

## Решение

### Поток генерации

1. **`swagger/` — источник истины** (multi-file OpenAPI 3.1, домен-ориентированная, см. ADR-0024).
2. **Бандл:** `redocly bundle swagger/openapi.yaml → swagger/dist/openapi.json` (единый файл, т.к. Orval не резолвит multi-file `$ref`).
3. **Генерация:** `orval` по `backend/orval.config.ts` → `backend/src/generated/`:
   - `endpoints/<tag>/<tag>.ts` — Hono-приложение с роутами (по тегу: auth, profile, simulation, …).
   - `endpoints/<tag>/<tag>.zod.ts` — Zod-схемы запросов/ответов.
   - `endpoints/<tag>/<tag>.context.ts` — типизированные контексты Hono.
   - `endpoints/filename.validator.ts` — валидатор (`zValidator` на базе `@hono/zod-validator`, включая response-валидацию).
   - `handlers/<operationId>.ts` — **стабы-обработчики** (тонкие: валидация + вызов контроллера).
   - `schemas/` — TypeScript-типы.

### Разделение кода

- **Сгенерированное** (`backend/src/generated/`) — роуты, Zod, типы, валидатор, стабы. Не редактировать вручную; перегенерируется.
- **Бизнес-логика** (`backend/src/controllers/`) — по одному файлу на домен (auth, profile, rls, …). Контроллеры импортируют сгенерированные контексты/типы.
- **Связка:** стаб-обработчик вызывает контроллер. Orval (`handlerGenerationStrategy: smart`) **сохраняет тело стаба** при регенерации — вызов контроллера не затирается.
- **`backend/src/main.ts`** — собирает приложение: `Hono<AppEnv>`, middleware (БД, auth), монтирует сгенерированные tag-приложения через `app.route("/api/v1", …)`.

### Пример — `/login`

- `backend/src/generated/handlers/login.ts` (сгенерирован, стаб): валидация `LoginBody`/`LoginResponse` → `login(c)`.
- `backend/src/controllers/auth.ts` (бизнес-логика): проверка пароля, роли, features, ответ профилем или `problem+json`.

### Команды

- Корень: `bun run generate:api` = `swagger:bundle` + `backend:generate`.
- Backend: `bun run generate` = `orval --config orval.config.ts`.

## Следствия

**Положительные:**
- ✅ Спека — источник истины; код генерируется из неё, расхождение исключено.
- ✅ Бизнес-логика изолирована в `controllers/`, отдельно от сгенерированных роутов/Zod.
- ✅ Zod-валидация (в т.ч. response) включена в сгенерированные стабы.
- ✅ Contract-тесты на CI (Schemathesis) сверяют поведение со спекой.

**Отрицательные / риски:**
- ⚠️ Стабы-обработчики генерируются; вызов контроллера сохраняется за счёт `smart`-стратегии Orval — при смене `operationId`/тега файл пересоздаётся (нужно переподключить контроллер).
- ⚠️ Orval требует единый бандл спеки (`swagger/dist/openapi.json`) — обязателен шаг `swagger:bundle` перед генерацией.
- ⚠️ Сгенерированные tag-приложения — `new Hono()` без `AppEnv`; типизация окружения достигается в `main.ts` через `app.route` и middleware.

## Ссылки

- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [Orval — Hono](https://orval.dev/docs/guides/hono)
- [@hono/zod-validator](https://github.com/honojs/middleware/tree/main/packages/zod-validator)
- [Redocly CLI — bundle](https://redocly.com/docs/cli/commands/bundle/)
- [ADR-0017 — Modular monolith и границы модулей](0017-modular-monolith.md)
- [ADR-0024 — Swagger: домен-ориентированная multi-file спецификация](0024-swagger-multifile.md)