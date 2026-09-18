# ADR-0001: Стек технологий

**Дата:** 2026-09-17
**Статус:** Accepted
**Теги:** backend, frontend, infra

---

## Контекст

Нужен десктопный кроссплатформенный тренажёр с единым API для desktop и web, возможностью переиспользовать backend на сервере, и скоростью разработки, достаточной для тестового задания.

## Рассмотренные варианты

1. **Electron + React + Node.js/Python** — быстро, но тяжёлый рантайм, два разных стека.
2. **Tauri + Rust** — лёгкий, но требует опыта с Rust.
3. **Flutter + Bun/Hono (выбран)** — единый UI для desktop и web, единый TS на backend.

## Решение

| Слой | Технология |
|---|---|
| Backend | Bun + Hono + Drizzle + Zod |
| API-спецификация | OpenAPI 3.1 |
| Генерация | `orval` (hono-клиент), `openapi-generator-cli` (dart-dio) |
| Frontend | Flutter (desktop + web) |
| UI | Material 3 |
| Состояние | `wire` / `wire_flutter` |
| Карта | `flutter_map` + `vector_map_tiles` |
| Desktop-БД | SQLite (`bun:sqlite`, встроен в Bun) |
| Server-БД | Postgres |
| Карты | MBTiles (векторные) |
| Пайплайн карт | planetiler |
| Сборка | GitLab CI + Taskfile |
| Линтинг и форматирование | Biome (см. ADR-0025) |
| Desktop-упаковка | flutter_distributor |

## Следствия

**Положительные:**
- ✅ Единый язык (TS) на backend для local и server.
- ✅ Flutter даёт одинаковый UI для desktop и web.

**Отрицательные / риски:**
- ⚠️ `wire` — нишевая библиотека; иметь fallback-план.
- ✅ `bun:sqlite` — встроен в Bun, ноль нативных модулей и пребилдов (важно для одиночного бинарника, ADR-0013). Замена исходного `better-sqlite3`: его нативный V8-аддон не грузится в Bun.

## Ссылки

- [Hono](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Flutter](https://flutter.dev/)
- [Bun SQLite](https://bun.sh/docs/api/sqlite)