---
name: RLS Simulator Trainer
type: architecture-spine
purpose: build-substrate
altitude: project
paradigm: Multiplatform API-first modular monolith
scope: Desktop client (Linux, Windows) + local server with future web version compatibility
status: draft
created: 2026-09-17
updated: 2026-09-17
binds: []
sources:
  - PRD: _bmad-output/planning-artifacts/prds/prd-RLS-2026-09-17/prd.md
  - Product Brief: _bmad-output/planning-artifacts/briefs/brief-RLS-2026-09-17/brief.md
  - ARCHITECTURE.md (project root)
  - ADRs: docs/adr/
companions: []
---

# Architecture Spine — RLS Simulator Trainer

## Design Paradigm

**Multiplatform API-first modular monolith.** Desktop (Linux, Windows) is the primary client; same API contracts serve the future web version. Single deployable unit with clear module boundaries. The API contract (OpenAPI 3.1 in `swagger/`) is the source of truth; clients are consumers.

```
┌─────────────────────────────────────────────┐
│               Desktop Client                │
│  (Flutter)                                  │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐ │
│  │  Map    │  │  UI      │  │  Tutorial │ │
│  │  View   │  │  Layer   │  │  Overlay  │ │
│  └────┬────┘  └─────┬────┘  └───────────┘ │
│       │              │                      │
│       └──────┬───────┘                      │
│              │ WebSocket / REST             │
├──────────────┼──────────────────────────────┤
│         Local Server (Bun + Hono)           │
│                                              │
│  ┌─────────────────┐  ┌──────────────────┐ │
│  │ Simulation      │  │ Session Manager  │ │
│  │ Engine          │  │                  │ │
│  └────────┬────────┘  └────────┬─────────┘ │
│           │                    │            │
│  ┌────────┴────────┐  ┌───────┴──────────┐ │
│  │ Reference Data  │  │ Event Store      │ │
│  │ (RLS, Boids,    │  │ (.rlsrec)        │ │
│  │  Guard Objects) │  │                  │ │
│  └─────────────────┘  └──────────────────┘ │
│                                              │
│  ┌─────────────┐  ┌──────────┐  ┌────────┐ │
│  │ Maps        │  │ Reports  │  │ Users  │ │
│  │ (.mbtiles)  │  │          │  │ & Feats│ │
│  └─────────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────┘
```

## Invariants & Rules

### AD-1 — Server-authoritative simulation

- **Binds:** all simulation-related FRs, Session Manager
- **Prevents:** client-predicted state diverging from server truth; exam replay inconsistency
- **Rule:** The server is the single source of truth for simulation state. Clients render what they receive; they never derive state independently. REST for status changes, WebSocket for coordinate streams. Inactive boids are not sent over WebSocket; the client retains them locally.

### AD-2 — Event-sourced exam recording

- **Binds:** FR-19 (Exam mode), FR-27 (Event-sourced recording), FR-28 (.rlsrec format)
- **Prevents:** loss of exam data on interruption; incompatible replay formats
- **Rule:** All exam events are append-only and immutable. Session Manager writes events to Event Store in real-time (not batch at end). The `.rlsrec` file contains session metadata, map reference, event log, and boid coordinate frames. Replay rejects files with incompatible versions.

### AD-3 — Module dependency direction

- **Binds:** all 8 modules
- **Prevents:** circular dependencies; modules depending on consumers
- **Rule:** Dependencies flow downward: Users & Features → API Gateway → Simulation Engine / Session Manager → Event Store / Reference Data / Maps. Analytics and Reports consume from Event Store and Reference Data. No module may depend on a module at the same or lower level.

### AD-4 — Canvas 2D rendering (Flutter Custom Painter)

- **Binds:** Map View, all map-related FRs
- **Prevents:** DOM-based rendering that can't handle 1000+ boids; split rendering layers that desync
- **Rule:** The map is rendered via Flutter Custom Painter on a single Canvas 2D layer. All map elements (polygons, RLS circles, boids, trails, status markers) are drawn in one pass. Hit-testing uses coordinate checks on the canvas.

### AD-5 — Client-side action state machine

- **Binds:** Operator Interactions, all interaction FRs
- **Prevents:** ambiguous action states; lost user feedback
- **Rule:** Every operator action passes through a client-side state machine: idle → progress → complete | failed. Terminal states (complete/failed) show a visual indicator (colored circle near the boid) that fades after a timeout. Destructive actions require confirmation via second-click pattern (red button with "confirm" text for delete, yellow for update).

### AD-6 — Map storage and access

- **Binds:** Maps module, map-related FRs
- **Prevents:** version conflicts; stale map data
- **Rule:** Maps are stored as `.mbtiles` files on the server filesystem. New uploads overwrite the current map immediately (last-write-wins). Clients request the list of available maps via the API (refresh button). No versioning in v1.

### AD-7 — Reports data source and access

- **Binds:** Reports module, report-related FRs
- **Prevents:** reports built on inconsistent data; unauthorized report access
- **Rule:** Reports are built from Event Store events plus session/simulation parameters (time spent, results, boid counts, detection times by status). JSON is the primary format; PDF is deferred. Users see only their own reports; admin and feature-enabled users see all reports.

## Consistency Conventions

| Concern | Convention |
| --- | --- |
| Naming (entities, files, interfaces, events) | kebab-case for files, camelCase for code, snake_case for DB columns |
| Data & formats (ids, dates, error shapes, envelopes) | UUID for ids, ISO 8601 for dates, RFC 7807 for errors, envelope `{data, meta}` for all API responses |
| State & cross-cutting (mutation, errors, logging, config, auth) | Server-authoritative; all mutations via REST; real-time via WebSocket; Basic Auth; structured logging |

## Stack

| Name | Version |
| --- | --- |
| Bun | latest stable |
| Hono | latest stable |
| Drizzle ORM | latest stable |
| Flutter | latest stable |
| SQLite / PostgreSQL | per deployment mode |
| .mbtiles | vector tile format |

## Structural Seed

```
/
├── backend/                  # Bun + Hono + Drizzle
│   ├── src/
│   │   ├── domain/           # pure logic: boids, RLS, rules
│   │   ├── application/      # use-cases
│   │   ├── controllers/      # Hono routes
│   │   ├── infrastructure/
│   │   │   ├── db/           # sqlite / postgres adapters
│   │   │   ├── map/          # mbtiles provider
│   │   │   ├── bus/          # EventBus
│   │   │   ├── http/         # Hono routes, middleware
│   │   │   └── ws/           # WebSocket handler
│   │   └── main.ts
│   ├── migrations/
│   └── Taskfile.yaml
├── frontend/                 # Flutter
│   ├── lib/
│   │   ├── map/              # Custom Painter canvas, hit-testing
│   │   ├── ui/               # widgets, state machine
│   │   ├── services/         # WebSocket + REST client
│   │   └── main.dart
│   ├── assets/
│   │   ├── maps/             # .mbtiles snapshots
│   │   └── backend/          # compiled Bun binary
│   └── Taskfile.yaml
├── swagger/                  # OpenAPI 3.1 spec
├── docs/
│   └── adr/                  # Architecture Decision Records
├── .env.example
├── Taskfile.yaml
└── ARCHITECTURE.md
```

## Capability → Architecture Map

| Capability / Area | Lives in | Governed by |
| --- | --- | --- |
| Boid simulation | Simulation Engine | AD-1, AD-3 |
| Map rendering | Frontend (Map View) | AD-4 |
| Operator interactions | Frontend (UI Layer) | AD-5 |
| Exam recording | Session Manager + Event Store | AD-2, AD-3 |
| Map management | Maps module | AD-6, AD-3 |
| Reports | Reports module | AD-7, AD-3 |
| User & feature management | Users & Features module | AD-3 |
| API contract | API Gateway | AD-1, AD-3 |

## Deferred

- **PDF report generation** — JSON is primary; PDF is deferred to v2.
- **Map versioning** — last-write-wins in v1; versioning deferred.
- **Cryptographic signing of exam events** — deferred (tracked in ADR-0014).
- **Web version client** — API contracts are ready; web client is deferred.
- **Advanced analytics** — basic metrics in Reports; advanced analytics deferred.
- **Settings panel** — feature-flagged; full UI deferred.
- **Exam recording upload** — feature-flagged; upload mechanism deferred.
