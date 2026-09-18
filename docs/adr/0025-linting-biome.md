# ADR-0025: Линтинг и форматирование TypeScript (Biome)

**Дата:** 2026-09-18
**Статус:** Accepted
**Теги:** tooling, backend, frontend, infra

---

## Контекст

TypeScript-код живёт в Bun-workspace пакетах (`backend`, будущий root). Нужен единый линтер и форматтер для всех TS-проектов, которые используют Bun, с минимальной конфигурацией и быстрой работой.

## Рассмотренные варианты

1. **ESLint (flat config) + Prettier** — индустриальный стандарт, но: отдельные конфиги для lint и format, медленнее, больше зависимостей и плагинов для настройки TS.
2. **Biome (выбран)** — один бинарник, объединяет линтер и форматтер, быстрый (Rust), нативная поддержка TS/TSX, минимальный конфиг, одна зависимость.
3. **Deno lint** — не подходит: проект на Bun.

## Решение

- **Biome 2.x** — единый инструмент для линта и форматирования всего TypeScript в workspace.
- **Единый конфиг** `biome.json` в корне репозитория (один на все пакеты).
  - `preset: "recommended"` — рекомендуемый набор правил.
  - `vcs.enabled` + `useIgnoreFile` — уважает `.gitignore`.
  - `files.includes` — исключает `swagger/dist/`, `backend/migrations/`, `*.gen.ts`.
  - Форматтер: 2 пробела, `lf`, line width 100, двойные кавычки, trailing commas.
- **Скрипты (Bun) в корне:**
  - `lint` → `biome check .`
  - `lint:fix` → `biome check --write .`
  - `format` → `biome format --write .`
- **Скрипты в пакетах:**
  - `backend`: `lint`, `lint:fix`, `format` (по `src/`).
  - `swagger`: TS отсутствует (спека — только YAML), поэтому Biome для swagger не применяется; YAML линтуется `redocly` (`npm run swagger:lint`).
- **Taskfile (root):** задачи `lint`, `lint:fix`, `format` → `bun run ...`.
- Biome установлен как devDependency корня (один на workspace).

## Следствия

**Положительные:**
- ✅ Один инструмент для lint + format, быстрый, единый конфиг на весь workspace.
- ✅ Одна devDependency вместо связки ESLint + плагины + Prettier.

**Отрицательные / риски:**
- ⚠️ Меньше кастомизируемых правил, чем у ESLint с плагинами (при необходимости конкретные правила добавляются в `biome.json`).
- ⚠️ Правила `noUnusedVariables`/`noUnusedImports` помечают неиспользуемые деструктурированные поля контрактов в стаб-контроллерах — оставлены как warnings (exit 0), не ошибки.

## Ссылки

- [Biome — официальный сайт](https://biomejs.dev/)
- [Biome — конфигурация](https://biomejs.dev/reference/configuration/)
- [ADR-0001 — Стек технологий](0001-stack.md)