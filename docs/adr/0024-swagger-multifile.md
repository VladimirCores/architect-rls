# ADR-0024: Swagger — домен-ориентированная multi-file спецификация

**Дата:** 2026-09-18
**Статус:** Accepted
**Теги:** api, infra, tooling

---

## Контекст

`swagger/openapi.yaml` — единый файл спецификации API. Рост файла усложняет ревью, конфликты в git и навигацию по роутам. Нужно разбить спеку на множественные YAML-файлы по доменам, вынести общие схемы (DRY) и дать возможность запускать Swagger UI локально из папки `swagger/`.

## Рассмотренные варианты

1. **Ручное разбиение + самописный резолвер `$ref`** — хрупко, легко сломать внутренние ссылки.
2. **`@redocly/cli split`** — стандартный инструмент, но генерирует **плоскую** структуру (`paths/` + `components/schemas/` — один файл на элемент) без доменных папок и без выноса общих схем.
3. **Доменная multi-file структура (выбран)** — каждая группа роутов в своей папке `swagger/<domain>/` с `paths.yaml` и `entities.yaml`; общие схемы — в корневом `swagger/entities.yaml`; `$ref` — относительные `file.yaml#/pointer`. Ссылки на пути из корня — JSON Pointer (`/` → `~1`).
4. **Swagger UI поверх Bun-сервера (`swagger-ui-dist`, workspace `@rls/swagger`)** — рассмотрен, **заменён** контейнерным запуском (вариант 5).
5. **Swagger UI через контейнер (выбран)** — корневой `docker-compose.yml` с образом `swaggerapi/swagger-ui`; файлы монтируются в контейнер, ссылки разрешаются nginx как относительные URL.

## Решение

### Структура

- `swagger/openapi.yaml` — корень: `openapi`, `info`, `servers`, `tags`, `paths`, `components.securitySchemes`. Контента роутов/схем не содержит — только `$ref`.
- `swagger/entities.yaml` — **общие схемы** (используются в нескольких доменах): `Problem`, `ProblemResponse`, `OkResponse`. DRY: общее не дублируется по доменам.
- `swagger/<domain>/paths.yaml` — пути домена, ключи — URL-пути (например `/login`, `/rls/{id}`).
- `swagger/<domain>/entities.yaml` — схемы, используемые только этим доменом.
- Домены: `auth`, `users`, `simulation`, `boids`, `rls`, `map`, `settings`, `reports`, `logs`, `admin`, `events`.
- `swagger/components/parameters/`, `swagger/components/headers/` — разделяемые параметры и заголовки.

### Соглашения по `$ref`

| Где | Ссылка |
|---|---|
| Внутри домена → своя схема | `./entities.yaml#/components/schemas/LoginRequest` |
| Внутри домена → схема другого домена | `../users/entities.yaml#/components/schemas/Profile` |
| Внутри домена → общая схема | `../entities.yaml#/components/schemas/Problem` |
| Внутри домена → параметр | `../components/parameters/PageParam.yaml` |
| `openapi.yaml` → путь домена | `"auth/paths.yaml#/~1login"` (JSON Pointer: `/` → `~1`) |
| `openapi.yaml` → схема домена | `./auth/entities.yaml#/components/schemas/LoginRequest` |
| `openapi.yaml` → общая схема | `./entities.yaml#/components/schemas/Problem` |

### Запуск Swagger UI

- Корневой `docker-compose.yml`: образ `swaggerapi/swagger-ui`, порт `9989:8080`, монтирование `./swagger:/spec:Z`, `SWAGGER_JSON=/spec/openapi.yaml`.
- Команда: `npm run swagger:ui` → `podman compose -f docker-compose.yml up` → http://localhost:9989.
- Монтирование всей папки `swagger/` в `/spec` даёт nginx отдавать поддомены и общие схемы по относительным URL (браузер резолвит `$ref` сам).

### Инструменты

- `@redocly/cli` — `lint`, `bundle` (`npm run swagger:lint`, `npm run swagger:bundle`).
- `swaggerapi/swagger-ui` — контейнер для локального просмотра.
- Podman/Docker Compose — оркестрация контейнера.
- `redocly split` (`npm run swagger:split`) — **не использовать**: перепишет структуру в плоский формат.

## Следствия

**Положительные:**
- ✅ Домен-ориентированная навигация: ревью и правки по папкам роутов.
- ✅ DRY: общие схемы в одном корневом `entities.yaml`, без дублирования.
- ✅ Swagger UI запускается одной командой (`npm run swagger:ui`), без отдельного Bun-сервера и workspace.
- ✅ Меньше конфликтов в git при параллельной работе над разными доменами.

**Отрицательные / риски:**
- ⚠️ `openapi.yaml` в корне не самодостаточен — резолвится только инструментом/браузером, понимающим внешние `$ref`.
- ⚠️ Структура ведётся вручную; `redocly split` её перезапишет — придерживаться соглашений из таблицы `$ref`.
- ⚠️ `:Z` в монтировании требуется для SELinux (podman); без него контейнер не читает файлы.
- ⚠️ `swagger/dist/` — генерируемый артефакт (`swagger:bundle`); не коммитить.

## Ссылки

- [Redocly CLI — lint](https://redocly.com/docs/cli/commands/lint/)
- [Redocly CLI — bundle](https://redocly.com/docs/cli/commands/bundle/)
- [swaggerapi/swagger-ui (Docker image)](https://hub.docker.com/r/swaggerapi/swagger-ui)
- [JSON Pointer (RFC 6901)](https://datatracker.ietf.org/doc/html/rfc6901)
- [ADR-0002 — Монорепозиторий и сборка](0002-monorepo-build.md)
- [ADR-0005 — API First — Orval генерация Hono-роутов и Zod-схем](0005-api-first.md)