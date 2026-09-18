# ADR-0005: API First с @hono/zod-openapi

**Дата:** 2026-09-17
**Статус:** Accepted
**Теги:** api, backend, frontend

---

## Контекст

Нужен единый контракт для backend (TS) и frontend (Dart). Изначально рассматривалась схема spec → код для роутов Hono, но полноценного генератора Hono из OpenAPI нет.

## Решение

- **Источник истины — код роутов** (Hono + Zod). OpenAPI-спека в `swagger/` — производный артефакт, генерируется из кода и сверяется с ним в CI.
- Для Hono используется **`@hono/zod-openapi`**: роуты описываются Zod-схемами, из них **генерируется spec**, который затем сверяется с эталонным в `swagger/`.
- Для Dart — **`openapi-generator-cli`** с шаблоном `dart-dio` (клиент на Dio).
- DTO и роуты полностью разделены. Бизнес-логика — в папке `controllers/`, по одному файлу на домен (auth, profile, rls, boids, settings, simulation, marking, map, reports, logs, admin/users, admin/features, events).

### Роуты (v1)

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/login` | Аутентификация |
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
| POST | `/actions/boids/mark` | Пометка boid оператором (опасный/безопасный) |
| POST | `/event` | Произвольное событие (`{type: int, ...}`) |

## Следствия

**Положительные:**
- ✅ Один spec → два клиента (TS, Dart).
- ✅ Contract-тесты на CI (Schemathesis).

**Отрицательные / риски:**
- ⚠️ `@hono/zod-openapi` требует, чтобы spec генерировался из кода, а не наоборот. Источник истины де-факто — код, а spec в `swagger/` — зеркало. Держать синхронизацию через CI-дифф.

## Ссылки

- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)