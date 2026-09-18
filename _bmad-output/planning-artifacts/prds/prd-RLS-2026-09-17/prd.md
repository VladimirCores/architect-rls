---
title: RLS Simulator Trainer
created: 2026-09-17
updated: 2026-09-17
---

# PRD: RLS Simulator Trainer
*Working title — confirm.*

## 0. Document Purpose

PRD for the RLS Simulator Trainer — a desktop application for training radar operators in manual recognition and marking of moving objects. Written for the Team Lead, project manager, and dev team as the specification for the MVP build. The document is structured as a Glossary-anchored feature catalog with globally numbered FRs, assumptions tagged inline, and a clear MVP scope boundary. Downstream artifacts (architecture, epics, stories) derive from this PRD.

The product is a test assignment for a Software Architect position — an internal tool replicating an existing working system. The codebase already exists (Bun + Hono + Drizzle backend, Flutter frontend, monorepo) and this PRD formalises what is built and what remains.

## 1. Vision

RLS Simulator Trainer is a desktop application that simulates radar station operations for training operators to identify and mark dangerous moving objects. The system runs a boid flock simulation on a map, presents moving targets within radar range, and lets the operator classify each boid by status. Three modes — simulation (infinite), training (timed), and exam (timed, recorded, replayable) — provide progressive skill assessment. The application uses a client-server architecture with API contracts identical to a planned future web version, enabling a seamless transition from desktop to online deployment. The RLS (РЛС) is the radar station on the map with a configurable detection radius.

## 2. Target User

### 2.1 Jobs To Be Done
- As an **operator-trainee**, I want to practice identifying dangerous objects among a stream of moving targets so I can develop real-world radar recognition skills.
- As an **operator-trainee**, I want to receive feedback on my performance (exam score) so I can understand my readiness level.
- As an **admin**, I want to configure users, maps, and reference data so I can set up training scenarios.
- As an **admin**, I want to control which features each user can access so I can tailor the training experience.

### 2.2 Non-Users (v1)
- External instructors who do not have system access — exam results are exported for external evaluation.
- End users of the future web version — not in scope for v1.

### 2.3 Key User Journeys

- **UJ-1. Operator starts a training session and marks boids.**
  - **Persona + context:** A trainee operator sits at a desktop terminal, launches the app, and begins a timed training session.
  - **Entry state:** App is running, a map with RLS and guard object is displayed, boids are appearing in the RLS radius.
  - **Path:** Operator observes boids → hovers for params → clicks LMB to mark dangerous, RMB to open status menu → boid is marked and becomes inactive after delay → session ends when timer expires or all RLS are destroyed.
  - **Climax:** Timer stops, results are saved, exam report is generated.
  - **Resolution:** Operator sees score, can review replay or start a new session.
  - **Edge case:** If all RLS are disabled before the session ends, the session ends as a failure immediately.

- **UJ-2. Admin configures a user's features.**
  - **Persona + context:** An admin sets up a new operator account and decides which capabilities the operator can access.
  - **Entry state:** Admin is logged in, admin panel is open.
  - **Path:** Admin navigates to user management → selects a user → toggles feature flags (reports, statistics, map upload, settings, exam recording upload) → saves.
  - **Climax:** User logs in and sees only the features their admin enabled.
  - **Resolution:** Admin can change features at any time.

## 3. Glossary

- **RLS (РЛС)** — Radio-Locating Station; a radar station on the map with a configurable radius of detection.
- **Boid** — A simulated moving object within the RLS detection radius. Has a status, trajectory, speed, and movement pattern.
- **Guard Object (Объект-охрана)** — The protected target on the map, rendered as a polygon. Boids entering this polygon are considered to have reached the target.
- **Map** — A vector tile map (.mbtiles) showing terrain and locations. Multiple maps available; admin can upload new ones.
- **Feature Flag** — A boolean toggle controlling access to a specific UI feature or API endpoint per user.
- **Session** — A single run of a simulation/training/exam mode, with a defined start and end.
- **Exam Recording (`.rlsrec`)** — An event-sourced file capturing all operator actions and boid movements for replay.
- **Status** — A label assigned to a boid indicating its classification (e.g., dangerous, safe, unknown).
- **Trail** — The visual path line behind a moving boid, with configurable display duration.
- **Admin** — The single user with full system access, including user management and feature configuration.
- **Operator** — A user with limited access, restricted to the simulation/training/exam UI and the features enabled by the admin.

## 4. Features

| Feature | FRs | Realizes |
| --- | --- | --- |
| Boid Simulation Engine | FR-1 – FR-5 | UJ-1 |
| Map and Visualization | FR-6 – FR-11 | UJ-1 |
| Operator Interactions | FR-12 – FR-16 | UJ-1 |
| Session Modes | FR-17 – FR-20 | UJ-1 |
| Roles and Access Control | FR-21 – FR-23 | UJ-2 |
| Reference Data Management | FR-24 – FR-26 | — |
| Exam Recording and Replay | FR-27 – FR-29 | UJ-1 |
| Visual Tutorial | FR-30 | UJ-1 |
| System Notifications | FR-31 – FR-32 | UJ-1 |

### 4.1 Boid Simulation Engine
**Description:** The server runs a boid flock simulation with configurable parameters. Boids move in real time (no acceleration) with speeds from 10 km/h to 300 km/h across distances of 1–100 km. Movement patterns include random flight, straight-line trajectories, arced paths, and direct approach toward the guard object. Boids render on the map only when inside the RLS detection radius and disappear when they enter the guard object polygon. [ASSUMPTION: The simulation runs server-side; the client renders the state received via WebSocket or HTTP polling at ~16 ms tick intervals.] Realizes UJ-1.

**Functional Requirements:**

#### FR-1: Boid movement patterns
The system supports four boid movement patterns: random, straight, arced, and approach toward the guard object. Each boid has a movement pattern assigned from the reference data.

**Consequences (testable):**
- System generates boids with one of the four movement patterns per session configuration.
- Boid trajectories are smooth and continuous within each tick.

#### FR-2: Boid speed range
Boid speeds range from 10 km/h to 300 km/h as defined in the boid reference data.

**Consequences (testable):**
- No boid exceeds 300 km/h or falls below 10 km/h.
- Speed is applied consistently per tick.

#### FR-3: RLS detection radius
Boids render on the map only when inside the RLS detection radius. The radius is rendered as a circle on the map.

**Consequences (testable):**
- Boids outside the RLS radius are not rendered.
- Boids entering the radius appear on the map.

#### FR-4: Guard object polygon interaction
When a boid enters the guard object polygon, it disappears from the map and an impact indicator is shown on the guard object.

**Consequences (testable):**
- Boid entering polygon triggers impact visual on guard object and removes boid from map.

#### FR-4b: RLS disabling on impact
When a boid hits an RLS, that RLS is disabled and its visual indicator changes. If no RLS remain active, the session ends as a failure.

**Consequences (testable):**
- Boid hitting RLS disables that RLS (visual indicator changes).
- Session ends with failure when zero RLS remain active.

#### FR-5: Dangerous boid auto-deactivation
Boids marked as dangerous become inactive after a configurable delay of 2–10 seconds. During this delay, the boid remains visible and markable. [NOTE FOR PM: Is the 2–10 second range a fixed set of options or a continuously configurable value?]

**Consequences (testable):**
- After marking a boid dangerous, it remains active for the configured delay.
- After the delay expires, the boid becomes inactive (stops moving, gets inactive color).
- Delay is configurable per session or per boid reference data.

### 4.2 Map and Visualization
**Description:** The main UI is a map view showing the guard object (polygon), RLS stations (with detection radius circles), and boids with movement trails. The map supports panning and zooming. A home button in the top-right corner focuses the view on the RLS (or the first RLS if multiple). The map is rendered from an .mbtiles vector tile snapshot bundled with the application. Multiple maps are available; admin and users with the map-upload feature can load different maps.

**Functional Requirements:**

#### FR-6: Map rendering and panning
The map is rendered from .mbtiles vector tiles. The operator can pan and zoom the map. The map is displayed full-screen with the UI overlay.

**Consequences (testable):**
- Map loads from bundled .mbtiles files on startup.
- Pan and zoom are responsive and smooth.

#### FR-7: RLS radius visualization
Each RLS is rendered with a circle representing its detection radius. The radius is proportional to the RLS parameters from the reference data.

**Consequences (testable):**
- RLS circle is visible and correctly sized relative to the map scale.
- Multiple RLS circles are rendered when multiple RLS exist.

#### FR-8: Home button focus
A home button in the top-right corner of the map view focuses the camera on the RLS station. When multiple RLS exist, it focuses on the first one (or the nearest to the guard object). [NOTE FOR PM: When the home button is clicked with multiple RLS, which RLS does it focus on? Proposal: nearest to guard object.]

**Consequences (testable):**
- Clicking home button animates the map view to center on the RLS.
- With multiple RLS, the view centers on the primary RLS.

#### FR-9: Map selection and upload
Admin and users with the map-upload feature can select a map from the available list or upload a new .mbtiles file. Maps are stored in the application's maps folder.

**Consequences (testable):**
- Map selector shows all available .mbtiles files in the maps folder.
- Admin can upload a new .mbtiles file which becomes available to all users.
- Operator with map-upload feature can also upload maps.

#### FR-10: Boid trail visualization
Each boid displays a movement trail (trail) behind it. The trail duration is configurable.

**Consequences (testable):**
- Trail is rendered behind each moving boid.
- Trail duration reflects the configured value.
- Trail is removed after the configured duration elapses.

#### FR-11: Boid hover tooltip
Hovering over a boid displays its estimated parameters and current status.

**Consequences (testable):**
- Tooltip appears on hover with boid speed, trajectory, distance to target, and status.
- Tooltip disappears when the cursor moves away.

### 4.3 Operator Interactions
**Description:** The operator interacts with boids on the map using mouse input. Left-click marks a boid as dangerous. Right-click opens a context menu to select from available statuses. The operator's actions are recorded for exam replay.

**Functional Requirements:**

#### FR-12: LMB mark as dangerous
Left-clicking on a boid marks it as dangerous. The boid receives a visual marker indicating the dangerous status.

**Consequences (testable):**
- LMB click on a boid changes its status to dangerous.
- Visual marker (color/icon) appears on the boid.

#### FR-13: RMB status menu
Right-clicking on a boid opens a context menu listing all available statuses for that boid. The operator selects a status to apply.

**Consequences (testable):**
- RMB click opens a context menu with status options.
- Selecting a status applies it to the boid and closes the menu.
- Not all statuses are available for all boids (some statuses are restricted).

#### FR-14: Configurable boid statuses
Admin can configure which statuses are available for boids. The default set includes: unknown, safe, neutral, friendly, suspicious, dangerous, extreme, interceptor, reconnaissance, stationary, inactive, evading, bait, engaged, lost.

**Consequences (testable):**
- Admin can add, remove, or reorder available statuses.
- Statuses are persisted and applied per session.
- Default statuses are present on first setup.

#### FR-15: Configurable boid status colors
Admin can configure the color used to mark boids for each status. Colors are applied consistently across the UI.

**Consequences (testable):**
- Each status has an associated color.
- Admin can change the color for any status.
- Color changes are reflected immediately in the UI.

#### FR-16: Status change
The operator can change a boid's status after initial marking. A new status replaces the previous one.

**Consequences (testable):**
- RMB menu allows changing an already-marked boid to a different status.
- The boid's visual marker updates to reflect the new status.

### 4.4 Session Modes
**Description:** The application supports three simulation modes: Simulation (infinite, no timer), Training (timed, can be stopped or reset), and Exam (timed, recorded, replayable). Training and Exam modes have a countdown timer. Exam sessions are recorded as `.rlsrec` files for later replay and analysis.

**Functional Requirements:**

#### FR-17: Simulation mode
Simulation runs indefinitely with no timer. The operator can observe boids and mark them without time pressure.

**Consequences (testable):**
- Simulation starts when the operator selects it.
- No timer is displayed.
- Session does not end automatically.

#### FR-18: Training mode
Training runs with a countdown timer. The operator can stop the simulation (pauses all boid movement) or reset it (restarts from the beginning).

**Consequences (testable):**
- Training session starts with a visible countdown timer.
- Stop button pauses boid movement and the timer.
- Reset button restarts the session from the beginning.

#### FR-19: Exam mode
Exam runs with a countdown timer. All operator actions and boid movements are recorded. At the end, a report with the percentage of correctly identified dangerous boids is generated. The recording is saved as an `.rlsrec` file. [NOTE FOR PM: What percentage of correct identifications constitutes a passing exam? The external system determines this; the PRD should note it is configurable.]

**Consequences (testable):**
- Exam session starts with a visible countdown timer.
- All operator actions (marks, status changes) are recorded as events.
- All boid movements are recorded as coordinate frames.
- Session ends when timer expires or all RLS are destroyed.
- Report is generated with percentage of correct dangerous identifications.
- Recording is saved as `.rlsrec` file.

#### FR-20: Exam replay
Recorded exam sessions (`.rlsrec` files) can be replayed, showing both boid movement and operator actions.

**Consequences (testable):**
- Replay loads the `.rlsrec` file and reproduces the session.
- Boid movement is animated as in the original session.
- Operator actions (marks, status changes) are shown in sequence.
- Replay speed can be adjusted (normal, faster, slower).

### 4.5 Roles and Access Control
**Description:** The system has two roles: Admin (single, full access) and Operator (limited access). The admin creates users and assigns feature flags per user. Feature flags are boolean toggles controlling access to specific UI features and API endpoints.

**Functional Requirements:**

#### FR-21: Admin role
The admin has full access to all system features including user management, map upload, reference data CRUD, and feature configuration. There is exactly one admin account, created during initial setup.

**Consequences (testable):**
- Admin can access all menus and configuration panels.
- Only one admin account exists in the system.
- Admin can create new operator accounts.

#### FR-22: Operator role
The operator has access only to the simulation/training/exam UI and the features enabled by the admin via feature flags.

**Consequences (testable):**
- Operator sees only the features enabled by admin.
- Operator cannot access admin panels or user management.

#### FR-23: Feature flags
Admin can enable or disable the following features per user: reports, statistics, map upload, settings, exam recording upload. These are boolean toggles stored in the user configuration.

**Consequences (testable):**
- Each feature flag is a boolean value per user.
- Admin can toggle any feature flag for any user.
- Feature flags control both UI visibility and API access.

### 4.6 Reference Data Management (CRUD)
**Description:** The admin (and users with appropriate feature flags) can manage reference data: boid definitions, RLS definitions, and guard objects. Boid and RLS parameters are fixed in reference data and cannot be changed per simulation. Guard object positions can be adjusted on the map.

**Functional Requirements:**

#### FR-24: Boid CRUD
Admin can create, read, update, and delete boid definitions. Each boid definition includes movement pattern, speed range, and default status.

**Consequences (testable):**
- Admin can add a new boid definition with specified parameters.
- Admin can edit existing boid definitions.
- Admin can delete boid definitions.
- Boid definitions are used as reference data in simulations.

#### FR-25: RLS CRUD
Admin can create, read, update, and delete RLS definitions. Each RLS definition includes detection radius and other parameters.

**Consequences (testable):**
- Admin can add a new RLS definition with specified parameters.
- Admin can edit existing RLS definitions.
- Admin can delete RLS definitions.
- RLS definitions are used as reference data in simulations.

#### FR-26: Guard object CRUD
Admin and users with appropriate permissions can create, read, update, and delete guard objects. Guard objects are placed on specific areas of the loaded map as polygons.

**Consequences (testable):**
- Admin can add a guard object as a polygon on the map.
- Admin can edit the polygon shape and position.
- Admin can delete guard objects.
- Guard object positions persist across sessions.

### 4.7 Exam Recording and Replay System
**Description:** Exam sessions are recorded using event sourcing. The recording captures operator actions (marks, status changes), boid coordinates at each tick, the map used, and boid statuses. Recordings are saved as `.rlsrec` files for replay and external analysis.

**Functional Requirements:**

#### FR-27: Event-sourced recording
During an exam session, all significant events (operator actions, boid state changes, session start/end) are recorded as immutable events with timestamps.

**Consequences (testable):**
- Events are recorded in chronological order.
- Each event has a unique identifier and timestamp.
- Events cannot be modified after recording.

#### FR-28: `.rlsrec` file format
Recordings are saved as `.rlsrec` files containing session metadata, map reference, event log, and boid coordinate frames. The format includes version compatibility checks.

**Consequences (testable):**
- `.rlsrec` file contains all data needed for replay.
- File includes version information for compatibility checking.
- Replay rejects files with incompatible versions.

#### FR-29: Exam report
At the end of an exam session, a report is generated showing the percentage of correctly identified dangerous boids. The report is exported for external evaluation.

**Consequences (testable):**
- Report shows percentage of correct dangerous identifications.
- Report includes session metadata (duration, boid count, etc.).
- Report can be exported for external processing.

### 4.8 Visual Tutorial
**Description:** New users see a visual tutorial walkthrough of the UI elements on first launch. The tutorial highlights key UI components and explains their purpose.

**Functional Requirements:**

#### FR-30: First-launch tutorial
On first launch (or when explicitly triggered), the system displays a step-by-step visual tutorial highlighting the main UI elements: map view, header with controls, sidebar menu, status markers, and interaction methods.

**Consequences (testable):**
- Tutorial appears on first launch for new users.
- Tutorial can be re-triggered from settings.
- Tutorial highlights each UI element in sequence.

### 4.9 System Notifications
**Description:** The system displays notifications for important events: session start/end, RLS disabled, guard object hit, exam results, and errors.

**Functional Requirements:**

#### FR-31: Session notifications
The system shows notifications for session start, session end (timer expired or all RLS destroyed), and significant events (RLS disabled, guard object hit).

**Consequences (testable):**
- Notification appears when a session starts.
- Notification appears when the session ends with the reason (time expired / all RLS destroyed).
- Notification appears when an RLS is disabled by a boid impact.

#### FR-32: Error notifications
The system shows notifications for errors such as invalid map files, missing reference data, or connection issues with the local server.

**Consequences (testable):**
- Error notification appears when a map file fails to load.
- Error notification appears when reference data is missing or corrupted.

## 5. Non-Goals (Explicit)

- **Web version** — not in scope for MVP. API contracts are designed to be reusable, but the web client is a future effort.
- **User registration** — no self-registration; users are created by the admin only.
- **Authentication beyond Basic Auth** — the existing architecture uses Basic Auth; no OAuth, SSO, or multi-factor auth in v1.
- **Multiplayer / concurrent operators** — only one operator per session.
- **Analytics and reporting** — exam reports produce a simple percentage score; advanced analytics are future.
- **Export of results** — exam recording upload is a feature flag; export functionality is future.
- **Settings panel** — settings are a feature flag; full settings UI is future.
- **Cryptographic signing of exam events** — noted as TODO in architecture, not in MVP scope.

## 6. MVP Scope

### 6.1 In Scope
- Desktop application (Linux, Windows) with local Bun/Hono server
- Boid simulation engine with 3 modes (simulation, training, exam)
- Map rendering from .mbtiles files with pan/zoom
- RLS detection radius visualization
- Guard object polygon rendering and interaction
- Boid movement (random, straight, arc, approach)
- Boid hover tooltip with params and status
- LMB mark dangerous, RMB status menu
- Configurable boid statuses and colors
- Dangerous boid auto-deactivation after delay
- Exam recording (`.rlsrec`) and replay
- Admin/user roles with feature flags
- Reference data CRUD (boids, RLS, guard objects)
- Map selection and upload
- Visual tutorial for new users
- System notifications
- Exam report with percentage score

### 6.2 Out of Scope for MVP
- Web version (API-ready, client separate)
- Advanced analytics and statistics dashboard
- Settings panel (feature-flagged)
- Exam recording upload (feature-flagged)
- Export of results (feature-flagged)
- Cryptographic signing of exam events
- Multiplayer / concurrent operators
- Self-registration and OAuth/SSO

## 7. Success Metrics

- **Operator accuracy** — percentage of dangerous boids correctly identified in exam mode (target: ≥80% for passing).
- **Session replay fidelity** — replay reproduces boid movement and operator actions within ±1 tick of original timing.
- **Feature flag enforcement** — operator cannot access disabled features (UI hidden, API returns 403).
- **Map loading** — .mbtiles maps load within 3 seconds of selection.
- **Simulation tick rate** — boid coordinate updates at approximately 16 ms intervals.

## 8. Open Questions

- **Trail configuration** — is trail duration a global setting or per-boid/per-session?
- **Notification system** — are notifications toast-style, banner, or modal? (Proposal: toast for transient, banner for session-end events.)
