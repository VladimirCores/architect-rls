# ARCHITECTURE.md

**Проект:** Симулятор-тренажёр РЛС для тренировки ручного распознавания и маркирования движущихся объектов
**Статус:** Draft → MVP
**Формат:** Architecture Decision Records (ADR) + описание системы + Architecture Spine

**Парадигма:** Multiplatform API-first modular monolith

---

## 1. Обзор системы

**Назначение.** Desktop-приложение (Linux, Windows) — симулятор-тренажёр работы РЛС. Оператор наблюдает за движущимися объектами (boids) в радиусе действия станции и помечает их как опасные/безопасные. Backend может быть переиспользован на сервере (с Postgres) для режима реальных данных и централизованной аналитики.

**Парадигма: Multiplatform API-first modular monolith.** Desktop (Linux, Windows) — первичный клиент; те же API-контракты обслуживают будущую web-версию. Единый деплой с чёткими границами модулей. API-контракт (OpenAPI 3.1 в `swagger/`) — источник истины; клиенты — потребители.

**Ключевые характеристики:**

- До 1000 boids на симуляцию, динамическое появление.
- Обновление координат в около-реальном времени (16 мс).
- Запись и воспроизведение действий пользователя (event sourcing, `.rlsrec`).
- Три независимых хранилища: карта, приложение, аналитика.
- Единое API для desktop и web-версий.
- Server-authoritative: REST для статусов, WebSocket для координат.
- Рендеринг карты — единый слой Canvas 2D (Flutter Custom Painter).
- Русский язык, без локализации.

**Роли:** `admin`, `user`. Регистрация отсутствует — пользователей создаёт админ.

**Статус:** тестовое задание, перерастающее в MVP.

---

## 1.1 Модули (границы системы)

Восемь модулей в едином деплое (см. ADR-0017):

| Модуль | Ответственность |
|---|---|
| **Simulation Engine** | Логика boids, тики, движение, состояние |
| Session Manager | Владеет состоянием сессии (карта, РЛС, boids, таймер, запись экзамена) |
| API Gateway | Hono-роуты, валидация, auth, WebSocket transport |
| Event Store | Append-only события, проекции, `.rlsrec` |
| Reference Data | Справочники RLS, boids, объекты-охраны (CRUD) |
| Maps | `.mbtiles` загрузка, хранение, tile serving |
| Users & Features | Auth, роли, feature flags |
| Analytics | Статистика, метрики сессий |
| Reports | Индивидуальные и агрегированные отчёты |

**Направления зависимостей:** Users & Features → API Gateway → Simulation Engine / Session Manager → Event Store / Reference Data / Maps. Analytics и Reports читают из Event Store и Reference Data.

---

## 2. Структура репозитория

```
/
├── backend/              # Bun + Hono + Drizzle (модули: Simulation, Session, Gateway, Event Store, Reference Data, Maps, Users, Analytics, Reports)
│   ├── src/
│   │   ├── domain/       # чистая логика: boids, РЛС, правила
│   │   ├── application/  # use-cases
│   │   ├── controllers/  # бизнес-логика Hono-роутов
│   │   ├── infrastructure/
│   │   │   ├── db/       # sqlite / postgres адаптеры, Drizzle-схемы
│   │   │   ├── map/      # mbtiles-провайдер
│   │   │   ├── bus/      # EventBus (InProcess / Redis)
│   │   │   ├── http/     # Hono-роуты, middleware
│   │   │   └── ws/       # WebSocket-handler (координаты boids)
│   │   └── main.ts
│   ├── migrations/
│   └── Taskfile.yaml
├── frontend/             # Flutter
│   ├── lib/
│   │   ├── map/          # Custom Painter (Canvas 2D), hit-testing
│   │   ├── ui/           # виджеты, state machine действий
│   │   ├── services/     # WebSocket + REST клиенты
│   │   └── main.dart
│   ├── assets/
│   │   ├── maps/         # .mbtiles снэпшоты
│   │   └── backend/      # скомпилированный Bun-бинарник
│   └── Taskfile.yaml
├── swagger/              # OpenAPI 3.1 spec (источник истины) — multi-file, домен-ориентированная
│   ├── openapi.yaml      # корень: openapi, info, servers, tags, paths ($ref на <domain>/paths.yaml), components
│   ├── entities.yaml     # ОБЩИЕ схемы (DRY): Problem, ProblemResponse, OkResponse
│   ├── <domain>/         # домен роутов (auth, users, simulation, boids, rls, map, settings, reports, logs, admin, events)
│   │   ├── paths.yaml    #   пути домена (ключи — URL-пути, напр. /login)
│   │   └── entities.yaml #   схемы, используемые только этим доменом
│   ├── components/       # разделяемые элементы
│   │   ├── parameters/   #   query/путевые параметры (PageParam, RlsIdPath, ...)
│   │   └── headers/      #   RateLimit-*, Retry-After
│   └── dist/             # бандл спеки (генерируется `swagger:bundle`, не коммитится)
├── docker-compose.yml    # Swagger UI (swaggerapi/swagger-ui) — порт 9989, монтирует ./swagger:/spec
├── tests/                # e2e, unit, contract
├── docs/
│   ├── adr/              # Architecture Decision Records
│   └── archify/          # интерактивная диаграмма архитектуры (rls-architecture.html + .json)
├── .env.example
├── Taskfile.yaml
├── LICENSES.md
└── ARCHITECTURE.md
```

---

## 2.1 OpenAPI-спецификация (swagger/)

**Формат:** OpenAPI 3.1, multi-file, домен-ориентированная. Источник истины для API-контрактов (ADR-0005, ADR-0017). Клиенты (Flutter, генераторы) — потребители.

**Структура файлов:**

- `swagger/openapi.yaml` — корень: `openapi`, `info`, `servers`, `tags`, `paths`, `components.securitySchemes`. Самостоятельного контента роутов/схем не содержит — только `$ref`.
- `swagger/entities.yaml` — **общие схемы** (используются в нескольких доменах): `Problem`, `ProblemResponse`, `OkResponse`. DRY-принцип: общее выносится сюда, не дублируется по доменам.
- `swagger/<domain>/` — домен роутов: `auth`, `users`, `simulation`, `boids`, `rls`, `map`, `settings`, `reports`, `logs`, `admin`, `events`. Внутри:
  - `paths.yaml` — пути домена, ключи — URL-пути (например `/login`, `/rls/{id}`).
  - `entities.yaml` — схемы, используемые **только** этим доменом (например `LoginRequest`, `Boid`).
- `swagger/components/parameters/`, `swagger/components/headers/` — разделяемые параметры и заголовки (например `PageParam`, `RlsIdPath`, `RateLimit-Limit`).

**Соглашения по ссылкам (`$ref`):**

| Где | Ссылка |
|---|---|
| Внутри домена → своя схема | `./entities.yaml#/components/schemas/LoginRequest` |
| Внутри домена → схема другого домена | `../users/entities.yaml#/components/schemas/Profile` |
| Внутри домена → общая схема | `../entities.yaml#/components/schemas/Problem` |
| Внутри домена → параметр | `../components/parameters/PageParam.yaml` |
| `openapi.yaml` → путь домена | `"auth/paths.yaml#/~1login"` (JSON Pointer: `/` → `~1`) |
| `openapi.yaml` → схема домена | `./auth/entities.yaml#/components/schemas/LoginRequest` |
| `openapi.yaml` → общая схема | `./entities.yaml#/components/schemas/Problem` |

**Правила редактирования:**

- Новый роут → файл `paths.yaml` своего домена (или новый домен), ссылки — по таблице выше.
- Новая схема → `entities.yaml` своего домена; если она нужна нескольким доменам — в корневой `swagger/entities.yaml`.
- После правок проверять: `npm run swagger:lint` (redocly lint), при необходимости `npm run swagger:bundle`.
- Не использовать `swagger:split` (redocly split) — структура ведётся вручную, split перезапишет её в плоский формат.

**Локальный просмотр (Swagger UI):**

```bash
npm run swagger:ui     # podman compose up — http://localhost:9989
```

Использует `swaggerapi/swagger-ui` (docker-compose.yml в корне), монтирует `./swagger:/spec:Z`, `SWAGGER_JSON=/spec/openapi.yaml`. Ссылки разрешаются браузером как относительные URL, поэтому поддомены и общие схемы отдаются nginx контейнера.

---

## 2.2 Диаграмма архитектуры (docs/archify)

**Файлы:**

- `docs/archify/rls-architecture.html` — интерактивная диаграмма высокого уровня (генерируется Archify, коммитится как артефакт).
- `docs/archify/rls-architecture.json` — исходная спецификация диаграммы (JSON).
- `docs/archify/rls-architecture.visual-check.html` — контактный лист скриншотов (light/dark, 1440×900 и 2048×1320) из последней визуальной проверки.

**Как открыть:** просто открыть `docs/archify/rls-architecture.html` в браузере (double-click / `open` / `xdg-open`). Файл самодостаточный — не требует сервера, сети или зависимостей. Встроенный вьюер: theme light/dark, pan/zoom, поиск, focus по компонентам, трассировка связей, экспорт PNG/SVG.

**Что изображено:** 12 ключевых компонентов (пользователи, клиент, API Gateway, Session Manager, Simulation Engine, Users & Features, Reference Data, Maps, Event Store, App DB, Analytics & Reports), один первичный путь (Operator → Client → Gateway → Session → Engine → Event Store → Analytics) и границы (Backend modular monolith, Data stores). Подробности структуры и модулей — в разделах 1, 2.1 и ADR.

**Как обновить:**

Диаграмма генерируется инструментом **Archify** (навык в `.agents/skills/archify`). Рабочий процесс:

1. Отредактировать `docs/archify/rls-architecture.json` (добавить/убрать компоненты, связи, границы, карточки). Правки структуры — в JSON, не в HTML.
2. Проверить композицию (показывает 9 чеков + диаграмму/метрики):
   ```bash
   node .agents/skills/archify/bin/archify.mjs validate architecture docs/archify/rls-architecture.json --quality showcase --json
   ```
3. Пересобрать HTML (замораживает спецификацию в снапшот):
   ```bash
   node .agents/skills/archify/bin/archify.mjs deliver architecture docs/archify/rls-architecture.json docs/archify/rls-architecture.html --quality showcase --json
   ```
4. Обновить визуальные доказательства (контактный лист; exit 0 = контеймент на 4 размерах прошёл):
   ```bash
   node .agents/skills/archify/bin/archify.mjs visual-check docs/archify/rls-architecture.html --json
   ```
5. Закоммитить `rls-architecture.json` + `rls-architecture.html` (+ обновлённый `visual-check.html`).

**Правила:**

- Диаграмма — **высокоуровневая**: держать ≤ 12 первичных компонентов, один очевидный первичный путь, короткие боковые ветви.
- Не раздувать: лишние рёбра убирать до добавления маршрутизации; метки — семантические (протокол, направление, механизм), не дублирующие то, что уже очевидно из концов связи.
- «Неизвестное» помечать в карточках, а не выдумывать.
- Диаграмма отражает архитектуру из ADR; при изменении модулей/границ обновлять и JSON, и ADR.

---

## 3. Индекс ADR

| № | Решение | Статус |
|---|---|---|
| [0001](docs/adr/0001-stack.md) | Стек технологий | Accepted |
| [0002](docs/adr/0002-monorepo-build.md) | Монорепозиторий и сборка | Accepted |
| [0003](docs/adr/0003-basic-auth.md) | Аутентификация через Basic Auth | Accepted |
| [0004](docs/adr/0004-features.md) | Система features | Accepted |
| [0005](docs/adr/0005-api-first.md) | API First с @hono/zod-openapi | Accepted |
| [0006](docs/adr/0006-versioning-errors.md) | Версионирование и формат ошибок | Accepted |
| [0007](docs/adr/0007-pagination.md) | Пагинация | Accepted |
| [0008](docs/adr/0008-deployment-modes.md) | Режимы развёртывания backend | Accepted |
| [0009](docs/adr/0009-coordinates-transport.md) | Транспорт координат | Accepted |
| [0010](docs/adr/0010-event-bus.md) | EventBus | Accepted |
| [0011](docs/adr/0011-three-databases.md) | Три базы данных | Accepted |
| [0012](docs/adr/0012-maps-pipeline.md) | Пайплайн карт | Accepted |
| [0013](docs/adr/0013-local-backend-lifecycle.md) | Жизненный цикл локального backend | Accepted |
| [0014](docs/adr/0014-event-sourcing.md) | Event sourcing для аналитики | Accepted |
| [0015](docs/adr/0015-frontend-state.md) | Frontend и управление состоянием | Accepted |
| [0016](docs/adr/0016-desktop-first.md) | Desktop-first поставка | Accepted |
| [0017](docs/adr/0017-modular-monolith.md) | Modular monolith и границы модулей | Accepted |
| [0018](docs/adr/0018-rendering.md) | Рендеринг карты (Canvas 2D / Custom Painter) | Accepted |
| [0019](docs/adr/0019-interaction-model.md) | Модель взаимодействия оператора | Accepted |
| [0020](docs/adr/0020-data-flow.md) | Поток данных клиент-сервер (REST + WS) | Accepted |
| [0021](docs/adr/0021-session-lifecycle.md) | Жизненный цикл сессии | Accepted |
| [0022](docs/adr/0022-maps-storage.md) | Хранение карт | Accepted |
| [0023](docs/adr/0023-reports.md) | Модуль отчётов | Accepted |
| [0024](docs/adr/0024-swagger-multifile.md) | Swagger — домен-ориентированная multi-file спецификация (domain/paths.yaml + entities.yaml, DRY) | Accepted |
| [0025](docs/adr/0025-linting-biome.md) | Линтинг и форматирование TypeScript (Biome) | Accepted |

---

## 4. Открытые вопросы и TODO

См. [docs/adr/OPEN-QUESTIONS.md](docs/adr/OPEN-QUESTIONS.md).

---

## 5. Ссылки

См. [docs/adr/REFERENCES.md](docs/adr/REFERENCES.md).