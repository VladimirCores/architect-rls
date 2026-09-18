# ADR-0016: Desktop-first поставка

**Дата:** 2026-09-17
**Статус:** Accepted
**Теги:** infra, frontend

---

## Контекст

Нужно определить целевые платформы и способ упаковки. macOS не входит в scope.

## Решение

- **Целевые платформы:** Linux, Windows. **macOS не поддерживается.**
- **Web** — канал разработки и отладки, поставка планируется. CORS в prod зависит от origin: same-origin (backend отдаёт статику) — не нужен; отдельный origin — через reverse proxy (см. ADR-0015).
- **Упаковка:** `flutter_distributor` — все форматы (AppImage, deb, rpm, EXE Installer).
- **Матричные сборки** в GitLab CI.

## Следствия

**Положительные:**
- ✅ Фокус на desktop упрощает UI и тестирование.

**Отрицательные / риски:**
- ⚠️ Web потребует CORS при отдельном origin; см. ADR-0015 — разрешение через reverse proxy.

## Ссылки

- [flutter_distributor](https://pub.dev/packages/flutter_distributor)