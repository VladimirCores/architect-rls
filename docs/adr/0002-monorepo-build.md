# ADR-0002: Монорепозиторий и сборка

**Дата:** 2026-09-17
**Статус:** Accepted
**Теги:** infra

---

## Контекст

Нужно собирать backend, frontend, swagger и тесты в одном репо для нескольких платформ (Linux, Windows, web).

## Рассмотренные варианты

1. **Nx** — мощный граф задач, но не покрывает Dart/Flutter нативно.
2. **Bun Workspaces + Taskfile (выбран)** — простота, покрытие всех языков.

## Решение

- **Bun Workspaces** для backend-пакетов + отдельная папка Flutter.
- **Taskfile** с sub-taskfiles: `Taskfile.yaml` (root), `backend/Taskfile.yaml`, `frontend/Taskfile.yaml`.
- **Единый `.env`** (не в git) + `.env.example` (в git). Копируется ссылками через `prepare`-скрипт.
- **Сборка:** GitLab CI + локальные цели вида `prod:desktop-linux`, `prod:desktop-win`. Матричные сборки.
- **Инъекция окружения:**
  - Dev — `dart-define`.
  - Prod — значения вшиваются в код, файлы не поставляются.
  - **Override:** ENV переменная процесса имеет приоритет над вшитой константой.
- **Desktop-упаковка:** `flutter_distributor` — все доступные форматы (AppImage, deb, rpm, EXE Installer).

## Следствия

**Положительные:**
- ✅ Один граф задач на все языки.
- ✅ Кеш GitLab CI снижает время сборки.

**Отрицательные / риски:**
- ⚠️ `dart-define` не покрывает все случаи — override через ENV нужен для смены стенда без пересборки.

## Ссылки

- [Taskfile](https://taskfile.dev/)
- [flutter_distributor](https://pub.dev/packages/flutter_distributor)