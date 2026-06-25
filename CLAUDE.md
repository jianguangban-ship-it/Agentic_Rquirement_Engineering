# CLAUDE.md

This file provides guidance for AI assistants (including Claude) working on the **PMSM Simulator** project.

## Project Overview

**PMSM Simulator** is a browser-based, real-time simulator of Permanent Magnet Synchronous Machine (PMSM) drives with Field Oriented Control (FOC), built for motor design engineers. It runs the physics/control loop in a Web Worker and renders live charts on the main thread.

- **Stack**: TypeScript 5.7, Vite 6.0, uPlot 1.6, Vitest 3.0
- **Platform**: Modern browsers with ES Module + Web Worker support
- **Status**: Active development (v0.1.0)

Key capabilities:

- Supports both **SPMSM** (Ld = Lq, no reluctance torque) and **IPMSM** (Ld ≠ Lq) motor types
- Physically accurate d-q models: voltage equations, electromagnetic torque (magnet + reluctance), mechanical dynamics
- Realistic power electronics: SVPWM inverter with DC bus voltage constraints
- Real-time parameter tuning (hot reload), simulation speed control, and 6 live charts

> **Detailed design spec**: see [`docs/plan.md`](docs/plan.md) for the full requirement document, equations, and motor presets. See [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md) for the user guide.

## Architecture

The app uses a two-thread model: the **main thread** owns UI/rendering, and a **Web Worker** runs the simulation loop. They communicate via `postMessage`.

```
MAIN THREAD (UI)                      WEB WORKER THREAD
  index.html + src/main.ts              src/simulation/simulation.worker.ts
    ui/router.ts   (hash router)          simulation-engine.ts (step loop)
    ui/dashboard.ts (orchestrator)        motor-model.ts       (d-q equations)
    ui/parameter-panel.ts (config page)   foc-controller.ts    (FOC + transforms)
    ui/control-bar.ts (buttons/inputs)    svpwm.ts             (inverter model)
    ui/charts.ts   (6 uPlot charts)       ode-solver.ts        (RK4 integrator)
    ui/presets.ts  (motor preset data)
         postMessage() <-> onmessage()
```

**Data flow**: User configures parameters → main thread sends `start` to the worker → worker runs FOC → SVPWM → Motor Model → RK4 each step → worker sends decimated state batches (~60 FPS) → main thread updates charts and status bar. Mid-simulation edits are sent as `update*` commands for hot reload.

Shared types (motor/controller/inverter params, worker messages, simulation state) live in `src/types.ts`.

## Repository Structure

```
full-pmsm-simulator/
├── index.html              # HTML layout (header nav + simulation view)
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config (strict)
├── vite.config.ts          # Vite build config (ES worker format)
├── docs/
│   ├── plan.md             # Design requirement document (source of truth)
│   └── USER_MANUAL.md      # User guide
├── src/
│   ├── main.ts             # Entry point (wires router + dashboard)
│   ├── types.ts            # Shared type definitions
│   ├── styles/main.css     # Stylesheet (dark theme)
│   ├── ui/                 # Main-thread UI modules
│   └── simulation/         # Web Worker simulation modules
└── tests/                  # Vitest unit tests
```

## Development Setup

### Prerequisites

- Node.js (with npm)
- Git

### Getting Started

```bash
npm install      # Install dependencies
npm run dev      # Start Vite dev server (hot reload)
```

## Build & Run

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc`) then build for production (`vite build`) → `dist/` |
| `npm run preview` | Preview the production build locally |

## Testing

Tests use **Vitest** and live in `tests/`. They cover the simulation core (motor model, FOC controller, ODE solver, simulation engine).

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |

Write tests for new simulation/control logic; keep the physics and control math covered.

## Code Conventions

### General Principles

- Keep code simple, readable, and well-structured.
- Prefer clarity over cleverness; follow the single responsibility principle.
- TypeScript is in `strict` mode with `noUnusedLocals`/`noUnusedParameters` — keep the build clean.
- Keep simulation code (worker side) free of DOM/UI dependencies; keep UI code free of physics logic.
- Write meaningful commit messages that explain _why_, not just _what_.

### Branching Strategy

- Feature branches should use descriptive names.
- Claude-generated branches follow the pattern: `claude/<description>-<session-id>`.

## AI Assistant Guidelines

When working on this repository, AI assistants should:

1. **Read before writing** — Always read existing files before proposing changes.
2. **Consult the design spec** — `docs/plan.md` is the source of truth for requirements, equations, and presets. Update it (and its Revision Log) when behavior changes.
3. **Stay focused** — Only make changes that are directly requested or clearly necessary.
4. **Avoid over-engineering** — Do not add abstractions, helpers, or features beyond what is asked for.
5. **Respect the thread boundary** — Don't introduce DOM access in worker modules or simulation math in UI modules.
6. **Update this file** — When significant structural changes are made (new modules, dependencies, build tools, or conventions), update CLAUDE.md to reflect them.
7. **Track work** — Use todo lists to plan and track multi-step tasks.
8. **Ask when uncertain** — If requirements are ambiguous, ask for clarification rather than guessing.
9. **Security first** — Do not introduce code vulnerable to injection, XSS, or other OWASP top 10 issues.
10. **Test coverage** — Write Vitest tests for new simulation/control functionality.
