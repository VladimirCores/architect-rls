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

## Документация

- [Архитектурные решения (ADR)](docs/adr/)
- [Интерактивная диаграмма архитектуры](docs/archify/rls-architecture.html)
- [OpenAPI спецификация](swagger/openapi.yaml)
