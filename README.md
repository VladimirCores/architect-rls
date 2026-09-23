# RLS — Симулятор РЛС

Desktop-приложение для тренировки операторов РЛС (Linux/Windows). Наблюдение и маркировка движущихся объектов (boids) в реальном времени.

## Возможности

- **Симуляция в реальном времени**: до 1000 объектов, обновление координат каждые ~16 мс
- **Запись сессий**: воспроизведение действий оператора (event sourcing, `.rlsrec`)
- **Server-authoritative**: REST для статусов, WebSocket для координат
- **API-first**: OpenAPI 3.1 как источник истины (`swagger/`)
- **Модульная архитектура**: 8 доменных модулей в едином деплое

## Технологический стек

| Компонент | Технология |
|-----------|------------|
| Backend | Bun + Hono + Drizzle (TypeScript) |
| Frontend | Flutter (Canvas 2D) |
| База данных | SQLite (dev) / Postgres (prod) |

## Архитектура

Подробнее см. [ARCHITECTURE.md](ARCHITECTURE.md). Основные модули:

- **Simulation Engine** — физика и состояние объектов
- **Session Manager** — жизненный цикл сессии
- **Event Store** — лог событий (аппенд-онли)
- **Analytics & Reports** — статистика и отчёты

## Быстрый старт

```bash
# Backend в режиме разработки
bun run backend:dev

# Swagger UI (документация API)
docker compose up  # http://localhost:9989
```

## Разработка

```bash
# Генерация Hono-роутов и Zod-схем из OpenAPI (orval)
bun run generate:api

# Запуск тестов
bun run backend:test

# Линтинг и форматирование
bun run lint
bun run format
```

## E2E тесты (Robot Framework)

E2E‑тесты на [Robot Framework](https://robotframework.org/) с библиотекой
[robotframework-browser](https://marketsquare.github.io/robotframework-browser/)
(Playwright). Пример‑тест покрывает роут `POST /api/v1/login`. Подробнее —
в [`tests/e2e/README.md`](tests/e2e/README.md).

```bash
# Поднять окружение для E2E (venv + robotframework-browser + Chromium),
# развернуть БД с тестовым пользователем, запустить бекенд и выполнить тесты
bun run e2e

# Только установка инструментария
bun run e2e:install

# Или через task:
task e2e
```

Переменные окружения: `RLS_TEST_PORT` (по умолчанию `3001`), `BIND_ADDRESS`,
`DB_PATH`. Тесты пишут артефакты в `tests/e2e/results/` (в `gitignore`).

## Документация

- [Архитектурные решения (ADR)](docs/adr/)
- [Интерактивная диаграмма архитектуры](docs/archify/rls-architecture.html)
- [OpenAPI спецификация](swagger/openapi.yaml)
