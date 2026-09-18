# ADR-0017: Modular monolith и границы модулей

**Дата:** 2026-09-17
**Статус:** Accepted
**Теги:** architecture, backend

---

## Контекст

Нужно зафиксировать парадигму и границы модулей системы. Desktop (Linux, Windows) — первичный клиент, но те же API-контракты должны обслуживать будущую web-версию. Отдельные модули должны развиваться независимо, не расходясь по интерфейсам.

## Решение

**Парадигма: Multiplatform API-first modular monolith.**

- Единый деплой с чёткими границами модулей.
- API-контракт (OpenAPI 3.1 в `swagger/`) — источник истины; клиенты — потребители.
- Desktop — первичный клиент; web использует те же контракты.

**Восемь модулей:**

| Модуль | Ответственность |
|---|---|
| **Simulation Engine** | Логика boids, тики, движение, состояние |
| **Session Manager** | Владеет состоянием сессии (карта, РЛС, boids, таймер, запись экзамена) |
| **API Gateway** | Hono-роуты, валидация, auth, WebSocket transport |
| **Event Store** | Append-only события, проекции, `.rlsrec` |
| **Reference Data** | Справочники RLS, boids, объекты-охраны (CRUD) |
| **Maps** | `.mbtiles` загрузка, хранение, tile serving |
| **Users & Features** | Auth, роли, feature flags |
| **Analytics** | Статистика, метрики сессий |
| **Reports** | Индивидуальные и агрегированные отчёты |

**Направление зависимостей:**

```
Users & Features
    ↓
API Gateway
    ↓
Simulation Engine / Session Manager
    ↓
Event Store / Reference Data / Maps

Analytics → читает из Event Store, Reference Data
Reports   → читает из Event Store, Reference Data
```

**Правила:**

- Simulation Engine читает Reference Data напрямую (read-only зависимость, без циклов).
- Session Manager владеет состоянием сессии и сохраняет её в реальном времени.
- Никакой модуль не зависит от модуля своего уровня или ниже.

## Следствия

**Положительные:**
- ✅ Модули развиваются независимо, не расходясь по интерфейсам.
- ✅ Единый деплой упрощает поставку и тестирование.
- ✅ API-контракт — единый источник истины для desktop и web.

**Отрицательные / риски:**
- ⚠️ Необходимо строго следить за направлением зависимостей (нарушение = дрейф).
- ⚠️ Modular monolith при разрастании требует рефакторинга на микросервисы.

## Ссылки

- [Architecture Spine — RLS Simulator Trainer](../../_bmad-output/planning-artifacts/architecture/architecture-RLS-2026-09-17/ARCHITECTURE-SPINE.md)
- [Диаграмма архитектуры (docs/archify/rls-architecture.html)](../archify/rls-architecture.html) — визуализация модулей, границ и первичного пути