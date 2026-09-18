# ARCHITECTURE.md

**Проект:** Симулятор-тренажёр РЛС для тренировки ручного распознавания и маркирования движущихся объектов
**Статус:** Draft → MVP
**Формат:** Architecture Decision Records (ADR) + описание системы

---

## Содержание

1. [Обзор системы](#1-обзор-системы)
2. [Структура репозитория](#2-структура-репозитория)
2.1. [OpenAPI-спецификация (swagger/)](#21-openapi-спецификация-swagger)
2.2. [Диаграмма архитектуры (docs/archify)](#22-диаграмма-архитектуры-docsarchify)
3. [ADR-001: Стек технологий](#adr-001-стек-технологий)
4. [ADR-002: Монорепозиторий и сборка](#adr-002-монорепозиторий-и-сборка)
5. [ADR-003: Аутентификация через Basic Auth](#adr-003-аутентификация-через-basic-auth)
6. [ADR-004: Система features](#adr-004-система-features)
7. [ADR-005: API First с @hono/zod-openapi](#adr-005-api-first-с-honozod-openapi)
8. [ADR-006: Версионирование и формат ошибок](#adr-006-версионирование-и-формат-ошибок)
9. [ADR-007: Пагинация](#adr-007-пагинация)
10. [ADR-008: Режимы развёртывания backend](#adr-008-режимы-развёртывания-backend)
11. [ADR-009: Транспорт координат](#adr-009-транспорт-координат)
12. [ADR-010: EventBus](#adr-010-eventbus)
13. [ADR-011: Три базы данных](#adr-011-три-базы-данных)
14. [ADR-012: Пайплайн карт](#adr-012-пайплайн-карт)
15. [ADR-013: Жизненный цикл локального backend](#adr-013-жизненный-цикл-локального-backend)
16. [ADR-014: Event sourcing для аналитики](#adr-014-event-sourcing-для-аналитики)
17. [ADR-015: Frontend и управление состоянием](#adr-015-frontend-и-управление-состоянием)
18. [ADR-016: Desktop-first поставка](#adr-016-desktop-first-поставка)
19. [ADR-017: Modular monolith и границы модулей](#adr-017-modular-monolith-и-границы-модулей)
20. [ADR-018: Рендеринг карты](#adr-018-рендеринг-карты)
21. [ADR-019: Модель взаимодействия оператора](#adr-019-модель-взаимодействия-оператора)
22. [ADR-020: Поток данных клиент-сервер](#adr-020-поток-данных-клиент-сервер)
23. [ADR-021: Жизненный цикл сессии](#adr-021-жизненный-цикл-сессии)
24. [ADR-022: Хранение карт](#adr-022-хранение-карт)
25. [ADR-023: Модуль отчётов](#adr-023-модуль-отчётов)
26. [ADR-024: Swagger — multi-file спецификация](#adr-024-swagger--multi-file-спецификация)
27. [ADR-025: Линтинг и форматирование TS (Biome)](#adr-025-линтинг-и-форматирование-ts-biome)
28. [Открытые вопросы и TODO](#открытые-вопросы-и-todo)
29. [Ссылки](#ссылки)

---

## 1. Обзор системы

**Назначение.** Desktop-приложение (Linux, Windows) — симулятор-тренажёр работы РЛС. Оператор наблюдает за движущимися объектами (boids) в радиусе действия станции и помечает их как опасные/безопасные. Backend может быть переиспользован на сервере (с Postgres) для режима реальных данных и централизованной аналитики.

**Ключевые характеристики:**

- До 1000 boids на симуляцию, динамическое появление.
- Обновление координат в около-реальном времени (16 мс).
- Запись и воспроизведение действий пользователя (event sourcing).
- Три независимых хранилища: карта, приложение, аналитика.
- Единое API для desktop и web-версий.
- Русский язык, без локализации.

**Роли:** `admin`, `user`. Регистрация отсутствует — пользователей создаёт админ.

**Статус:** тестовое задание, перерастающее в MVP.

---

## 2. Структура репозитория

```
/
├── backend/              # Bun + Hono + Drizzle
│   ├── src/
│   │   ├── domain/       # чистая логика: boids, РЛС, правила
│   │   ├── application/  # use-cases
│   │   ├── controllers/  # бизнес-логика Hono-роутов
│   │   ├── infrastructure/
│   │   │   ├── db/       # sqlite / postgres адаптеры, Drizzle-схемы
│   │   │   ├── map/      # mbtiles-провайдер
│   │   │   ├── bus/      # EventBus (InProcess / Redis)
│   │   │   └── http/     # Hono-роуты, middleware
│   │   └── main.ts
│   ├── migrations/
│   └── Taskfile.yaml
├── frontend/             # Flutter
│   ├── lib/
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
└── LICENSES.md
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

## ADR-001: Стек технологий

**Статус:** Accepted

**Контекст.** Нужен десктопный кроссплатформенный тренажёр с единым API для desktop и web, возможностью переиспользовать backend на сервере, и скоростью разработки, достаточной для тестового задания.

**Решение.**

| Слой | Технология |
|---|---|
| Backend | Bun + Hono + Drizzle + Zod |
| API-спецификация | OpenAPI 3.1 |
| Генерация | `@hono/zod-openapi`, `openapi-generator-cli` (dart-dio) |
| Frontend | Flutter (desktop + web) |
| UI | Material 3 |
| Состояние | `wire` / `wire_flutter` |
| Карта | `flutter_map` + `vector_map_tiles` |
| Desktop-БД | SQLite (`better-sqlite3`) |
| Server-БД | Postgres |
| Карты | MBTiles (векторные) |
| Пайплайн карт | planetiler |
| Сборка | GitLab CI + Taskfile |
| Линтинг и форматирование | Biome (см. ADR-025) |
| Desktop-упаковка | flutter_distributor |

**Следствия.**

- ✅ Единый язык (TS) на backend для local и server.
- ✅ Flutter даёт одинаковый UI для desktop и web.
- ⚠️ `wire` — нишевая библиотека; иметь fallback-план.
- ⚠️ `better-sqlite3` — нативный модуль, требует предсборки под платформу.

---

## ADR-002: Монорепозиторий и сборка

**Статус:** Accepted

**Контекст.** Нужно собирать backend, frontend, swagger и тесты в одном репо для нескольких платформ (Linux, Windows, web).

**Решение.**

- **Bun Workspaces** для backend-пакетов + отдельная папка Flutter.
- **Taskfile** с sub-taskfiles: `Taskfile.yaml` (root), `backend/Taskfile.yaml`, `frontend/Taskfile.yaml`.
- **Единый `.env`** (не в git) + `.env.example` (в git). Копируется ссылками через `prepare`-скрипт.
- **Сборка:** GitLab CI + локальные цели вида `prod:desktop-linux`, `prod:desktop-win`. Матричные сборки.
- **Инъекция окружения:**
  - Dev — `dart-define`.
  - Prod — значения вшиваются в код, файлы не поставляются.
  - **Override:** ENV переменная процесса имеет приоритет над вшитой константой.
- **Desktop-упаковка:** `flutter_distributor` — все доступные форматы (AppImage, deb, rpm, EXE Installer).

**Следствия.**

- ✅ Один граф задач на все языки.
- ✅ Кеш GitLab CI снижает время сборки.
- ⚠️ `dart-define` не покрывает все случаи — override через ENV нужен для смены стенда без пересборки.

---

## ADR-003: Аутентификация через Basic Auth

**Статус:** Accepted (заменяет предыдущий дизайн с JWT access/refresh)

**Контекст.** Изначально планировались JWT access + refresh с проактивным обновлением, httpOnly-cookie для web, secure storage для desktop. Это добавляет сложность: refresh-очередь, отзыв, cookie-политики, CORS с credentials.

**Решение.** **Basic Auth. Токены не используются.**

- Клиент хранит логин/пароль **в памяти** на время сессии.
- Каждый запрос несёт `Authorization: Basic <base64(login:password)>`.
- **Каждая новая сессия требует логин** (старт приложения, перезагрузка вкладки).
- Logout = очистка памяти.
- Бан = невозможность залогиниться.
- Смена пароля — через `POST /actions/changepassword` (инициирует сам пользователь).
- Полный профиль (features, права) загружается после входа через `GET /profile`.

**Пароли:**

- Минимум **8 символов**.
- **argon2id** (встроен в Bun).
- Параметры (OWASP-рекомендация для интерактивного логина):
  - `memoryCost = 65536` (64 MiB)
  - `timeCost = 3`
  - `parallelism = 1`
  - `hashLength = 32`
- Пароли никогда не хранятся в plaintext/обратимо.

**Роуты:**

- `POST /auth` — проверка логина/пароля, возврат базового профиля (uid, роль).
- `GET /profile` — полный профиль (права, features).
- `GET /admin/users/:id` — профиль пользователя (только админ; поля те же, что в `/profile`, дополняются).
- `POST /actions/changepassword` — смена пароля самим пользователем.

**Роль admin:**

- Логин `admin` зарезервирован, запрещён для регистрации и входа под общим UI.
- На экране `/auth` — галочка «Войти как Администратор», при которой скрывается поле логина.
- Регистрации пользователей нет — создаёт админ через отдельный UI.

**Следствия.**

- ✅ Радикальное упрощение: нет refresh-логики, cookie-политик, отзыва, очередей.
- ✅ Работает одинаково на desktop и web.
- ⚠️ Пароль в памяти клиента — при XSS на web может быть украден. Trade-off принят осознанно.
- ⚠️ Basic Auth поверх HTTP небезопасен — обязателен HTTPS на сервере.
- ⚠️ Нет granular revocation на уровне access — но при Basic это не имеет смысла.

---

## ADR-004: Система features

**Статус:** Accepted

**Контекст.** Нужно динамически управлять доступом к частям UI и API. Features создаёт админ, но часть из них — базовая и должна существовать всегда.

**Решение.**

- Features — **динамический список** в БД: таблица `features` с колонкой `code` (уникальная).
- **Базовые features — строковые константы в коде** (не enum в БД, чтобы избежать миграции на каждую новую фичу). Сидируются миграцией.
- Проверка в коде: `requireFeature('radar.export')`.
- **Единый middleware** на все роуты.
  - В OpenAPI-спеке — кастомный extension `x-features: [radar.export]` на операцию.
  - Middleware читает extension из сгенерированного роута.
  - Декларативно, без ручного дублирования.

**Следствия.**

- ✅ Типизация фич в TS + динамика из админки.
- ✅ Одна точка проверки на API.
- ⚠️ Нужно поддерживать синхронизацию между константами в коде и записями в БД (сидирование).

---

## ADR-005: API First с @hono/zod-openapi

**Статус:** Accepted

**Контекст.** Нужен единый контракт для backend (TS) и frontend (Dart). Изначально рассматривалась схема spec → код для роутов Hono, но полноценного генератора Hono из OpenAPI нет.

**Решение.**

- **Источник истины — OpenAPI 3.1 spec** (`swagger/`).
- Для Hono используется **`@hono/zod-openapi`**: роуты описываются Zod-схемами, из них **генерируется spec**, который затем сверяется с эталонным в `swagger/`.
- Для Dart — **`openapi-generator-cli`** с шаблоном `dart-dio` (клиент на Dio).
- DTO и роуты полностью разделены. Бизнес-логика — в папке `controllers/`, по одному файлу на домен (auth, profile, rls, boids, settings, simulation, marking, map, reports, logs, admin/users, admin/features, events).

**Роуты (v1):**

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/auth` | Аутентификация |
| GET | `/profile` | Свой профиль |
| POST | `/actions/changepassword` | Смена пароля |
| GET | `/map/tiles/:z/:x/:y` | Векторные тайлы |
| CRUD | `/map/rls/:id` | РЛС на карте |
| CRUD | `/rls` (+sub) | Справочник РЛС |
| CRUD | `/boids` (+sub) | Справочник boids |
| RU | `/settings` (+sub) | Настройки симуляций |
| GET | `/reports` (+sub) | Отчёты |
| GET | `/logs` (+sub) | Логи |
| CRUD | `/admin/users` (+sub) | Пользователи |
| GET | `/admin/users/:id` | Профиль пользователя (админ) |
| CRUD | `/admin/features` (+sub) | Features |
| POST | `/actions/simulation/start\|stop\|pause\|complete` | Управление симуляцией |
| POST | `/event` | Произвольное событие (`{type: int, ...}`) |

**Следствия.**

- ✅ Один spec → два клиента (TS, Dart).
- ✅ Contract-тесты на CI (Schemathesis).
- ⚠️ `@hono/zod-openapi` требует, чтобы spec генерировался из кода, а не наоборот. Источник истины де-факто — код, а spec в `swagger/` — зеркало. Держать синхронизацию через CI-диффу.

---

## ADR-006: Версионирование и формат ошибок

**Статус:** Accepted

**Решение.**

- **API-версия — `/api/v1`** с первого дня.
- **Формат ошибок — `application/problem+json`** (RFC 7807).
- **Версия схемы БД** — отдельная таблица `_migrations`. **Не связана** с версией API.
  - Формат: `name` (string), `applied_at` (timestamp), `hash` (string), `status` (enum: applied/failed).
  - Версия принадлежит backend (миграции применяются при старте на desktop, отдельным шагом в CI на сервере).

**Следствия.**

- ✅ API и БД эволюционируют независимо.
- ✅ Клиент парсит ошибки единообразно.
- ⚠️ Сопоставление версий API ↔ БД — только в документации, вручную.

---

## ADR-007: Пагинация

**Статус:** Accepted

**Решение.**

- Формат ответа: `{items, total, page, size}`.
- Лимит `size`: **max 200**.
- Поведение при `page < 1`: **ошибка 422** (problem+json).
- Крайние случаи (отрицательные, превышение max, нечисловые значения) — **единый middleware** на всех пагинированных роутах.

**Следствия.**

- ✅ Единая логика для всех списков.
- ✅ UI может строить нормальную пагинацию благодаря `total`.

---

## ADR-008: Режимы развёртывания backend

**Статус:** Accepted

**Контекст.** Backend должен работать и как локальный процесс на десктопе (SQLite), и как сервер (Postgres, в будущем — k8s).

**Решение.**

- **Переключатель:** ENV `DEPLOYMENT_TYPE={local|web}`.
- **Фабрика зависимостей:** драйвер БД, провайдер карт, EventBus, логгер — выбираются по `DEPLOYMENT_TYPE`.
- **Локально:** одна сборка Bun (скомпилированный бинарник), SQLite, in-process pub/sub, файловые логи.
- **Сервер:** тот же код, Postgres, внешний Redis pub/sub (при RPS-триггере), логи в файл (пока).

**Следствия.**

- ✅ Один кодовый базис.
- ✅ Переиспользование на сервере без форка.
- ⚠️ Различия (SQLite vs Postgres) локализованы в репозиториях; часть запросов может потребовать двух реализаций.

---

## ADR-009: Транспорт координат

**Статус:** Accepted

**Решение.**

- **Транспорт:** **WebSocket** (не UDP).
- **Формат:** **бинарный** (ArrayBuffer / Float32Array).
  - Сериализация — отдельные middleware на клиенте и сервере.
- **Интервал:** `INTERACTIVE_UPDATE = 16` мс (≈60 Гц).
  - Значение `adaptive` — задел на будущее, не реализуется.
- **Нагрузка:** до 1000 boids.
  - Задел: передача **дельты** (только изменения) снизит нагрузку на порядок. В требования пока не входит.

**Следствия.**

- ✅ Бинарный формат снижает нагрузку на сериализацию.
- ✅ WebSocket даёт гарантию доставки/порядка (в отличие от UDP).
- ⚠️ 1000 boids × 60 Гц × 8 байт ≈ 480 КБ/с на клиента. Дельта — следующий шаг оптимизации.

---

## ADR-010: EventBus

**Статус:** Accepted

**Контекст.** Сейчас backend запускается одним процессом и может использовать встроенный pub/sub Bun. В будущем — k8s с несколькими подами, где in-process шина не работает.

**Решение.**

- Абстракция **`EventBus`** с методами: `publish`, `subscribe`, `unsubscribe`.
- Реализации:
  - **`InProcessBus`** — используется сейчас (встроенный pub/sub Bun).
  - **`RedisBus`** — задел на k8s.
- **Триггер перехода на RedisBus — RPS** (порог определить при нагрузочном тестировании).

**Следствия.**

- ✅ Готовность к горизонтальному масштабированию без переписывания.
- ⚠️ Пока RedisBus не реализован, k8s с >1 подом невозможен.

---

## ADR-011: Три базы данных

**Статус:** Accepted

**Контекст.** Разные жизненные циклы данных: карта — read-only, приложение — read/write с миграциями, аналитика — read/write с event sourcing. Нужна возможность быстро выгрузить логи/аналитику копированием.

**Решение.** Три независимых хранилища.

### 11.1 Карта

- **MBTiles**, read-only, без миграций.
- Пайплайн: `Geofabrik .osm.pbf → planetiler → .mbtiles (vector) → /map/tiles`.
- Загружается при первом запуске / в CI на основе `MAP_TILES={region|manual}`.
  - `region` — имя файла из `assets/maps` или регион с Geofabrik.
  - `manual` — путь указывает пользователь.
- Список поддерживаемых регионов (**`SUPPORTED_REGIONS`**) — **в коде как справочник**. В `.env` — только выбранный регион.
- **Версия карты** — поле `version` в стандартной `metadata` MBTiles.
- Стиль карты — один, вшит во frontend, версионируется с ним.

### 11.2 Приложение

- **SQLite** (desktop) / **Postgres** (server), Drizzle как единый ORM.
- Данные: пользователи/профили, настройки, features, права, boids, РЛС.
- **JSON с базовыми настройками** может загружаться при первом запуске для инициализации.
- Миграции: схема и данные меняются. Версия — `_migrations`.

### 11.3 Аналитика

- **SQLite** (desktop) / **Postgres** (server).
- Сущности: сессии, симуляции, тренировки, экзамены, логи, активность.
- **Event sourcing** — см. ADR-014.
- PII нет, только ID.

**Транзакции между БД:** **Dual-Mode Transactional Sagas** — `db.batch` в Drizzle + Saga-паттерн, реализуются в конкретных контроллерах.

**Следствия.**

- ✅ Быстрый бэкап аналитики копированием файла.
- ✅ Разные команды/нагрузки могут развивать БД независимо.
- ⚠️ Нет транзакций между хранилищами — консистентность через Saga.
- ⚠️ Три хранилища на desktop — нагрузка на бэкап/миграции.

---

## ADR-012: Пайплайн карт

**Статус:** Accepted

**Решение.**

- **Пайплайн:** `Geofabrik .osm.pbf → planetiler → .mbtiles (vector)`.
- **planetiler требует JDK** — наличие в CI и на dev-машинах обязательно.
- **Параметры planetiler:** подбираются оптимально под регион.
  - Малые регионы: heap 2–4 ГБ, минуты-десятки минут.
  - Россия целиком: heap 8+ ГБ, часы, десятки ГБ диска.
- **GitLab CI:** результат (`.mbtiles`) сохраняется как **артефакт**. Кеш по ключу `region + planetiler version + source hash`.
- **Проверка при старте dev-сервера:** наличие MBTiles региона; при отсутствии — инструкция или авто-генерация.
- **README** должен явно описывать требования (JDK, место, время).

**Следствия.**

- ✅ Воспроизводимость.
- ✅ Кеш экономит часы CI.
- ⚠️ Первая генерация крупного региона — дорого. Нужен явный gate в CI.

---

## ADR-013: Жизненный цикл локального backend

**Статус:** Accepted

**Решение.**

- Backend поставляется как **скомпилированный Bun-бинарник** в `assets/backend/<platform>/`.
- **Старт:** Flutter извлекает бинарник во временную директорию и запускает как дочерний процесс.
- **Стоп:** Flutter завершает процесс при закрытии приложения.
- **Порт:** фиксированный; если не задан — **динамический через handshake по stdout** (backend пишет `READY port=N`, Flutter парсит).
- **Логи:** только в **файл**, лимит **10 МБ** на сессию. В БД логи не пишутся.
- **Watchdog** (автозавершение backend при краше Flutter) — **задел на будущее**, не реализуется.

**Следствия.**

- ✅ Единый бинарник, кроссплатформенный через matrix-сборку.
- ⚠️ Без watchdog возможны зомби-процессы — учитывать при эксплуатации.
- ⚠️ Антивирусы/гейткиперы могут блокировать неподписанные бинарники — при поставке в MVP решить.

---

## ADR-014: Event sourcing для аналитики

**Статус:** Accepted

**Контекст.** Нужна запись и воспроизведение действий пользователя. Это фактически event sourcing, что влияет на схему аналитики и формат логов.

**Решение.**

- Все значимые действия пользователя и системы сохраняются как **события**.
- **Таблица `events`:**
  - `event_id` — incremental int (PK).
  - `name` — string.
  - `timestamp`.
  - `uid` — user id.
  - `type` — int (основные типы).
  - дополнительные поля — по мере необходимости.
- **Источники событий:**
  - Роуты `/actions/*` (основные).
  - Роут `POST /event` — для произвольных событий `{type: int, ...}`.
- **Криптографическая подпись событий экзамена** (Ed25519) — **TODO** (см. раздел 19).
- Метрика успешной сессии: % правильно определённых «специальных» boids — рассчитывается на основе событий, времени, параметров симуляции и конечного состояния boids.

**Следствия.**

- ✅ Полное воспроизведение сессий.
- ✅ Гибкая аналитика.
- ⚠️ Схема событий должна быть спроектирована до застывания MVP — изменения дороги.
- ⚠️ Рост объёма данных — потребуется retention-политика.

---

## ADR-015: Frontend и управление состоянием

**Статус:** Accepted

**Решение.**

- **Flutter** — единый UI для desktop и web.
- **Material 3**, только стандартные компоненты.
- **Состояние:** `wire` / `wire_flutter`.
  - Причина выбора: реализует принцип **Flux**, разделяет бизнес-логику (асинхронные команды) от UI. Позволяет заменить UI-библиотеку без переписывания логики.
- **Локальные стейты** — в виджетах, где это уместно.
- **DTO:** mixin **`WithState`** (не общий тип) — состояния `INITIAL / PROCESSING / READY / ERROR`.
- **Карта:** `flutter_map` + `vector_map_tiles`.
- **Радар:** `CustomPainter` поверх карты + отдельные painter’ы для трейлов boids.
- **Взаимодействие:** клик ЛКМ/ПКМ, контекстное меню, комбинации клавиш, горячие клавиши.
- **Web = desktop** по UI (поставляется только desktop).
- **Адаптивности нет.** Дизайн — гибкий, без брейкпоинтов.
- **Локализации нет** — русский.

**CORS:**

- Dev: `@hono/cors` с `origin: '*'`.
- Prod: настраивается через reverse proxy.
- Решение должно работать в обоих режимах без переписывания.

**Следствия.**

- ✅ Единый UI-код для двух платформ.
- ⚠️ `wire` — риск зрелости; fallback — `riverpod` / `bloc` / `signals`.
- ⚠️ Без адаптивности web-версия неудобна при изменении размера окна, но она позиционируется как dev-канал.

---

## ADR-016: Desktop-first поставка

**Статус:** Accepted

**Решение.**

- **Целевые платформы:** Linux, Windows. **macOS не поддерживается.**
- **Web** — канал разработки и отладки, поставка планируется.
- **Упаковка:** `flutter_distributor` — все форматы (AppImage, deb, rpm, EXE Installer).
- **Матричные сборки** в GitLab CI.

**Следствия.**

- ✅ Фокус на desktop упрощает UI и тестирование.
- ⚠️ Web потребует CORS и адаптации при поставке.

---

## ADR-017: Modular monolith и границы модулей

**Статус:** Accepted

**Решение.**

- **Парадигма: Multiplatform API-first modular monolith.** Единый деплой с чёткими границами модулей; API-контракт (OpenAPI 3.1 в `swagger/`) — источник истины; клиенты — потребители.
- **Восемь модулей:** Simulation Engine, Session Manager, API Gateway, Event Store, Reference Data, Maps, Users & Features, Analytics, Reports.
- **Направление зависимостей:** Users & Features → API Gateway → Simulation Engine / Session Manager → Event Store / Reference Data / Maps. Analytics и Reports читают из Event Store и Reference Data.
- Simulation Engine читает Reference Data напрямую (read-only). Session Manager владеет состоянием сессии.
- Никакой модуль не зависит от модуля своего уровня или ниже.

---

## ADR-018: Рендеринг карты (Canvas 2D / Custom Painter)

**Статус:** Accepted

**Решение.**

- **Единый слой Canvas 2D (Flutter Custom Painter)** рендерит все элементы карты: полигоны объектов-охраны, круги радиусов РЛС, boids, шлейфы (trails), маркеры статусов.
- Hit-testing — координатная проверка на канвасе (не DOM).
- Неактивные/остановившиеся boids не передаются по WebSocket, но сохраняются на клиенте и отображаются на карте.

---

## ADR-019: Модель взаимодействия оператора

**Статус:** Accepted

**Решение.**

- **Event-driven** с клиентской машиной состояний действий: `idle → progress → complete | failed`; в `failed` — сообщение об ошибке.
- Визуализация статуса действия: цветной кружок у boid; на конечных состояниях пропадает через заданное время.
- **Паттерн «второй клик»** для деструктивных действий: удаление — красная кнопка «подтвердить», обновление — жёлтая.
- Статусы boids и их цвета настраиваются админом.

---

## ADR-020: Поток данных клиент-сервер (REST + WebSocket)

**Статус:** Accepted

**Решение.**

- **Server-authoritative.** Сервер — единственный источник истины состояния симуляции.
- **REST** — статусы и действия (`/actions/boids/mark` и т.д.).
- **WebSocket** — координаты boids (бинарный формат, см. ADR-009).
- **Оптимизация:** неактивные boids не передаются по WS; клиент хранит их локально и отображает на карте.

---

## ADR-021: Жизненный цикл сессии

**Статус:** Accepted

**Решение.**

- **Session Manager владеет состоянием сессии** (карта, РЛС, boids, таймер, запись экзамена); Simulation Engine отделён.
- **Завершение экзамена и тренировки инициирует сервер** (authoritative timing); время может длиться, пока «управляющий» не решит.
- **Session Manager сохраняет в реальном времени**, события пишутся в Event Store по мере возникновения (исключает потерю данных при крахе).

---

## ADR-022: Хранение карт

**Статус:** Accepted

**Решение.**

- Карты — `.mbtiles` на **файловой системе сервера** (для desktop — та же система); S3/MinIO в v1 не используется.
- Клиент запрашивает список карт (`GET /maps`), есть кнопка «обновить список».
- Загрузку новой карты выполняет admin **или пользователь с правом** (`maps.upload`); новая версия **сразу перезаписывает** текущую (last-write-wins). Версионирование отсутствует.

---

## ADR-023: Модуль отчётов

**Статус:** Accepted

**Решение.**

- **Данные:** Event Store + параметры сессии и симуляции (время, результаты, количество boids, процент угаданных/пропущенных, время обнаружения по статусам — расширяемо).
- **Формат:** JSON основной; PDF — будущее.
- **Доступ:** пользователь видит свои отчёты; admin (или пользователь с `reports.see_all`) — все.

---

## ADR-024: Swagger — домен-ориентированная multi-file спецификация

**Статус:** Accepted

**Решение.**

- **Формат:** OpenAPI 3.1, multi-file, домен-ориентированная. Детали структуры, ссылок и правил — в разделе 2.1.
- **Разбиение (вручную, не redocly split):** `swagger/openapi.yaml` — корень (paths и components.schemas — только `$ref`); корневой `swagger/entities.yaml` — общие схемы (Problem, ProblemResponse, OkResponse); доменные папки `swagger/<domain>/` с `paths.yaml` + `entities.yaml`; `swagger/components/parameters|headers/` — разделяемые элементы.
- **Ссылки:** относительные `file.yaml#/pointer` (см. таблицу в разделе 2.1); в `openapi.yaml` пути — JSON Pointer (`/` → `~1`).
- **DRY:** схемы, используемые несколькими доменами, выносятся в корневой `entities.yaml`, не дублируются.
- **Локальный просмотр (Swagger UI):** корневой `docker-compose.yml` (образ `swaggerapi/swagger-ui`, порт `9989:8080`, монтирует `./swagger:/spec:Z`, `SWAGGER_JSON=/spec/openapi.yaml`); запуск — `npm run swagger:ui` (podman compose).
- **Проверка:** `npm run swagger:lint` (redocly lint), `npm run swagger:bundle` (redocly bundle → `swagger/dist/openapi.json`).
- `swagger/dist/` не коммитится.

---

## ADR-025: Линтинг и форматирование TS (Biome)

**Статус:** Accepted

**Решение.**

- **Biome 2.x** — единый инструмент для линта и форматирования всего TypeScript в workspace (объединяет линтер и форматтер, быстрый, нативная поддержка TS).
- **Единый конфиг** `biome.json` в корне: `preset: "recommended"`, `vcs.enabled` (уважает `.gitignore`), исключения `swagger/dist/`, `backend/migrations/`, `*.gen.ts`; форматтер 2 пробела, `lf`, line width 100.
- **Скрипты (Bun):** корень — `lint`/`lint:fix`/`format`; `backend` — `lint`/`lint:fix`/`format`; `swagger` — `lint:ts`/`lint:ts:fix` (чтобы не конфликтовать с redocly `lint`).
- **Taskfile (root):** `lint`, `lint:fix`, `format`.
- Biome — devDependency корня (одна на весь workspace).

**Следствия.**

- ✅ Один инструмент для lint + format, единый конфиг.
- ⚠️ Меньше кастомизации, чем ESLint + плагины; конкретные правила добавляются по мере необходимости.
- ⚠️ Неиспользуемые поля контрактов в стаб-контроллерах — warnings (exit 0), не ошибки.

---

## Открытые вопросы и TODO

### TODO

- [ ] **Криптоподпись событий экзамена** (Ed25519): где хранится ключ подписи, где — публичный ключ проверки. Отправка подписанных событий на сервер до завершения экзамена.
- [ ] **Watchdog** для локального Bun-процесса (автозавершение при краше Flutter).
- [ ] **RedisBus** — реализация при достижении порога RPS.
- [ ] **Адаптивная передача координат** (дельта) — при превышении нагрузки.
- [ ] **`adaptive` режим `INTERACTIVE_UPDATE`**.

### Открытые вопросы

1. **`SUPPORTED_REGIONS`** — где именно в коде: константа, JSON-файл, или таблица в БД? Предлагаю JSON-файл в `assets/`, читается при старте.
2. **argon2id** — параметры `memoryCost=64 MiB, timeCost=3, parallelism=1` могут быть тяжелы для слабых машин. Нужен ли fallback?
3. **planetiler** — конкретные параметры для типового региона (например, Москва и область): heap, threads, версия.
4. **GitLab CI cache key** для MBTiles — уточнить формат: `mbtiles-{region}-{planetiler_version}-{source_hash}`.
5. **`_migrations`** — точный формат полей: `status` — enum или bool? Нужна ли колонка `dirty` (прерванные миграции)?
6. **`POST /event`** — валидация `type`: справочник в БД или enum в коде? Лимит частоты?
7. **Retention-политика** для `events` — сколько хранить локально? На сервере?
8. **Contract-тесты** — Schemathesis: как запускать (на каждый PR, nightly)? Где хранить baseline?
9. **`/admin/users/:id`** — какие поля добавляются к `/profile`? Только features или ещё что-то?
10. **CORS** — если prod через reverse proxy, нужен ли `@hono/cors` в prod-сборке вообще, или он только для dev?
11. **`LICENSES.md`** — ИИ-агент проверяет на инициализации. Какой инструмент: `license-checker`, `cargo-license`, кастомный? Формат вывода?
12. **Три БД на desktop** — подтверждаем разделение app / analytics даже локально? Или объединить в одну SQLite с двумя схемами?
13. **`better-sqlite3` + Bun** — прототип на старте: проверить сборку и работу в Bun-рантайме до проектирования схемы.
14. **`DEPLOYMENT_TYPE`** — какие ещё места, кроме БД/карт/шины/логгера, ветвятся по этому параметру?
15. **`/actions/simulation/*`** — что именно возвращает каждый роут (state, id сессии, что-то ещё)?
16. **Пометка boid** — какой роут? Входит в CRUD `/boids` или отдельный `/actions/boids/mark`?
17. **`GET /logs`** — если логи пишутся в файл, что возвращает этот роут? Читает файл? Или логи в БД только на сервере?
18. **Воспроизведение сессии** — формат: seq событий с timestamp, или запись координат? От этого зависит схема `events`.

---

## Ссылки

- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [RFC 7807 — Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807)
- [RFC 7617 — Basic Authentication](https://datatracker.ietf.org/doc/html/rfc7617)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [argon2 (Bun)](https://bun.sh/docs/api/hashing#bun-password)
- [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- [Hono](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Schemathesis](https://schemathesis.readthedocs.io/)
- [planetiler](https://github.com/onthegomap/planetiler)
- [Geofabrik — Russia](https://download.geofabrik.de/russia.html)
- [MBTiles Specification](https://github.com/mapbox/mbtiles-spec)
- [flutter_map](https://docs.fleaflet.dev/)
- [vector_map_tiles](https://pub.dev/packages/vector_map_tiles)
- [wire](https://pub.dev/packages/wire)
- [flutter_distributor](https://pub.dev/packages/flutter_distributor)
- [Taskfile](https://taskfile.dev/)
- [Redocly CLI — lint](https://redocly.com/docs/cli/commands/lint/)
- [Redocly CLI — bundle](https://redocly.com/docs/cli/commands/bundle/)
- [swaggerapi/swagger-ui (Docker image)](https://hub.docker.com/r/swaggerapi/swagger-ui)
- [JSON Pointer (RFC 6901)](https://datatracker.ietf.org/doc/html/rfc6901)
- [Podman Compose](https://docs.podman.io/en/latest/markdown/podman-compose.1.html)