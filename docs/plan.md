# PMSM Simulator - Design Requirement Document

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [System Architecture](#2-system-architecture)
3. [Functional Requirements](#3-functional-requirements)
4. [UI Design Requirements](#4-ui-design-requirements)
5. [Simulation Engine Requirements](#5-simulation-engine-requirements)
6. [Motor Model Requirements](#6-motor-model-requirements)
7. [Control Algorithm Requirements](#7-control-algorithm-requirements)
8. [Inverter Model Requirements](#8-inverter-model-requirements)
9. [Performance Requirements](#9-performance-requirements)
10. [Motor Preset Specifications](#10-motor-preset-specifications)
11. [Revision Log](#11-revision-log)

---

## 1. Project Summary

| Item | Detail |
|------|--------|
| Name | PMSM Simulator |
| Version | 0.1.0 |
| Platform | Browser (ES Module, Web Worker) |
| Stack | TypeScript 5.7, Vite 6.0, uPlot 1.6 |
| Purpose | Real-time simulation of Permanent Magnet Synchronous Motor drives with Field Oriented Control |

### Goals

- Provide an interactive, browser-based environment for studying PMSM motor dynamics and FOC control
- Support both SPMSM (Ld = Lq) and IPMSM (Ld != Lq) motor types
- Implement physically accurate models: d-q voltage equations, electromagnetic torque (magnet + reluctance), mechanical dynamics
- Include realistic power electronics: SVPWM inverter with DC bus voltage constraints
- Allow real-time parameter tuning and visualization

---

## 2. System Architecture

### Thread Model

```
┌───────────────────────────────────────────────────┐
│                 MAIN THREAD (UI)                  │
│                                                   │
│  index.html + main.ts                             │
│    ├── router.ts         (hash-based view router)  │
│    ├── dashboard.ts      (orchestrator)            │
│    ├── parameter-panel.ts (config-page card grid)  │
│    ├── control-bar.ts    (buttons, speed, load)   │
│    ├── charts.ts         (6 uPlot charts)         │
│    └── presets.ts        (motor preset data)       │
│                                                   │
│           postMessage() ↕ onmessage()             │
├───────────────────────────────────────────────────┤
│               WEB WORKER THREAD                   │
│                                                   │
│  simulation.worker.ts                             │
│    ├── simulation-engine.ts  (step loop)          │
│    ├── motor-model.ts        (d-q equations)      │
│    ├── foc-controller.ts     (FOC + transforms)   │
│    ├── svpwm.ts              (inverter model)     │
│    └── ode-solver.ts         (RK4 integrator)     │
└───────────────────────────────────────────────────┘
```

### Data Flow

1. User configures parameters on the Parameter-Configuration page and sets run options in the control bar
2. On Start, main thread sends `start` command with all parameters to the worker
3. Worker runs the simulation loop: FOC controller -> SVPWM -> Motor Model -> RK4
4. Worker sends decimated state batches back to main thread (~60 FPS)
5. Main thread updates 6 charts and the status bar
6. Mid-simulation parameter changes are sent as `update*` commands

### File Structure

```
full-pmsm-simulator/
├── index.html                          # HTML layout
├── package.json                        # Dependencies and scripts
├── tsconfig.json                       # TypeScript config
├── vite.config.ts                      # Vite build config
├── docs/
│   ├── plan.md                         # This document
│   └── USER_MANUAL.md                  # User guide
├── src/
│   ├── main.ts                         # Entry point (wires router + dashboard)
│   ├── types.ts                        # Shared type definitions
│   ├── styles/
│   │   └── main.css                    # Full stylesheet
│   ├── ui/
│   │   ├── router.ts                   # Hash-based view router
│   │   ├── dashboard.ts               # UI orchestrator (charts mount lazily)
│   │   ├── parameter-panel.ts          # Config page: parameter cards + presets
│   │   ├── control-bar.ts             # Bottom: buttons + inputs
│   │   ├── charts.ts                  # 6 real-time charts
│   │   └── presets.ts                 # Motor preset data
│   └── simulation/
│       ├── simulation.worker.ts       # Web Worker entry
│       ├── simulation-engine.ts       # Main simulation loop
│       ├── motor-model.ts             # PMSM equations
│       ├── foc-controller.ts          # FOC + PI + transforms
│       ├── svpwm.ts                   # Space Vector PWM
│       └── ode-solver.ts             # RK4 integrator
```

---

## 3. Functional Requirements

### FR-01: Motor Type Support

| ID | Requirement | Status |
|----|-------------|--------|
| FR-01.1 | Support SPMSM motors (Ld = Lq, no reluctance torque) | Done |
| FR-01.2 | Support IPMSM motors (Ld != Lq, reluctance torque) | Done |
| FR-01.3 | Motor type determined by preset selection | Done |
| FR-01.4 | SPMSM: constrain Ld = Lq (auto-sync when editing) | Done |
| FR-01.5 | SPMSM: disable MTPA strategy (only id = 0 allowed) | Done |
| FR-01.6 | IPMSM: enable both id = 0 and MTPA strategies | Done |

### FR-02: Parameter Configuration

| ID | Requirement | Status |
|----|-------------|--------|
| FR-02.1 | Editable motor parameters: Rs, Ld, Lq, psi_f, p, J, B | Done |
| FR-02.2 | Editable controller gains: Kp_d, Ki_d, Kp_q, Ki_q, Kp_s, Ki_s | Done |
| FR-02.3 | Editable inverter parameters: Vdc, Idc_max | Done |
| FR-02.4 | Control strategy selector: id = 0 / MTPA | Done |
| FR-02.5 | Preset import via dropdown in left panel | Done |
| FR-02.6 | Mid-simulation parameter updates (hot reload) | Done |

### FR-03: Simulation Control

| ID | Requirement | Status |
|----|-------------|--------|
| FR-03.1 | Start / Pause / Resume / Reset controls | Done |
| FR-03.2 | Adjustable simulation speed: 0.1x to 10x | Done |
| FR-03.3 | Speed reference input (rad/s), adjustable mid-sim | Done |
| FR-03.4 | Load torque profiles: constant, step, ramp | Done |
| FR-03.5 | Load apply time and ramp duration configuration | Done |

### FR-04: Visualization

| ID | Requirement | Status |
|----|-------------|--------|
| FR-04.1 | Phase currents chart (ia, ib, ic) with axis labels | Done |
| FR-04.2 | d-q currents chart (id, iq) with axis labels | Done |
| FR-04.3 | Torque chart (Te, TL) with axis labels | Done |
| FR-04.4 | Speed chart (omega_m) with axis labels | Done |
| FR-04.5 | Voltage chart (Vd, Vq) with axis labels | Done |
| FR-04.6 | d-q trajectory chart (iq vs id) with axis labels | Done |
| FR-04.7 | Ring buffer (5000 points) for smooth scrolling | Done |
| FR-04.8 | Data decimation (every 10th sample) for UI performance | Done |

### FR-05: Status Bar

| ID | Requirement | Status |
|----|-------------|--------|
| FR-05.1 | Display simulation time t | Done |
| FR-05.2 | Display mechanical speed omega_m | Done |
| FR-05.3 | Display electromagnetic torque Te | Done |
| FR-05.4 | Display d-q currents id, iq | Done |
| FR-05.5 | Display electrical frequency fe | Done |
| FR-05.6 | Display phase current RMS (Irms) | Done |
| FR-05.7 | Display mechanical power Pmech | Done |
| FR-05.8 | Display back-EMF voltage | Done |
| FR-05.9 | Display SVPWM modulation index m | Done |

### FR-06: Page Navigation

| ID | Requirement | Status |
|----|-------------|--------|
| FR-06.1 | Header nav tabs to switch between top-level pages | Done |
| FR-06.2 | Hash-based routing (`#/simulation`, `#/parameter-configuration`) | Done |
| FR-06.3 | Default to `#/simulation`; unknown hash falls back to default | Done |
| FR-06.4 | Active tab highlighted; bookmarking + back/forward supported | Done |
| FR-06.5 | Lazy per-view init on first show (charts get a sized container) | Done |
| FR-06.6 | Parameter-Configuration page hosts all parameter sections (card grid) | Done |

---

## 4. UI Design Requirements

### Page Navigation

The app is a single-page application with hash-based routing (`src/ui/router.ts`).
A persistent header nav switches between top-level views; only the body content
swaps. The header (title + nav tabs) stays fixed.

| Route | View | Status |
|-------|------|--------|
| `#/simulation` (default) | Simulation page (charts + control/status bars) | Done |
| `#/parameter-configuration` | Parameter-Configuration page (parameter card grid) | Done |

Routing behavior: unknown/empty hash falls back to `#/simulation`; the active tab
is highlighted; bookmarking, reload-on-route, and browser back/forward are
supported. The parameter panel and control bar are wired eagerly at startup (so
configuration is ready before Start regardless of the landing route); only the
uPlot charts mount lazily on the simulation view's first show, so they get a
sized (visible) container.

### Layout (Simulation page)

```
+---------------------------------------------+
|  Header: "PMSM Simulator"  [Simulation]     |
|                  [Parameter-Configuration]  |
+---------------------------------------------+
|  Chart Grid (2 x 3, full width)             |
|  [Phase Currents]      [d-q Currents]       |
|  [Torque]              [Speed]              |
|  [Voltages]            [d-q Trajectory]     |
+---------------------------------------------+
|  Control Bar (Start/Pause/Reset + inputs)   |
+---------------------------------------------+
|  Status Bar (real-time metrics)             |
+---------------------------------------------+
```

### Layout (Parameter-Configuration page)

All parameter sections live here as a responsive grid of cards
(`repeat(auto-fill, minmax(280px, 1fr))`) that reflows with the viewport width.

```
+---------------------------------------------+
|  Header: "PMSM Simulator"  [Simulation]     |
|                  [Parameter-Configuration]  |
+---------------------------------------------+
|  Parameter Configuration                    |
|  +-------------+ +-------------+ +---------+ |
|  | Motor       | | Controller  | | Control | |
|  | Parameters  | | Gains       | | Strategy| |
|  |             | |             | +---------+ |
|  |             | |             | | DC Bus  | |
|  +-------------+ +-------------+ +---------+ |
+---------------------------------------------+
```

### Parameter Cards (Parameter-Configuration page)

1. **Motor Parameters**
   - "Type" dropdown: "Import Motor Parameters" (default) + 4 preset options
   - Number inputs: Rs, Ld, Lq, psi_f, p, J, B

2. **Controller Gains**
   - d-axis: Kp_d, Ki_d
   - q-axis: Kp_q, Ki_q
   - Speed: Kp_s, Ki_s

3. **Control Strategy**
   - Mode dropdown: "id = 0" / "MTPA"
   - Type hint text (motor type constraints info)

4. **DC Bus**
   - Vdc, Idc_max

### Motor Type Constraints (UI Behavior)

| Condition | MTPA Option | Strategy | Ld/Lq | Hint Text |
|-----------|-------------|----------|-------|-----------|
| No preset selected | Enabled | Free choice | Independent | "Import a preset to set motor type constraints" |
| SPMSM preset imported | Disabled | Forced to id = 0 | Synced (Ld = Lq) | "SPMSM: id = 0 only (Ld = Lq)" |
| IPMSM preset imported | Enabled | Free choice (preset sets MTPA) | Independent | "IPMSM: MTPA available (Ld != Lq)" |

### Theme

- Dark color scheme (background: #1a1a2e, surface: #16213e)
- Accent: #e94560 (red), Success: #4ecdc4 (green)
- Monospace fonts for parameter labels and status bar
- 6px border radius, 12px gap
- Parameter sections render as bordered surface cards on the config page

---

## 5. Simulation Engine Requirements

### Timing

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Plant timestep | 10 us (100 kHz) | Captures fast electrical dynamics |
| Control rate | 100 us (10 kHz) | Realistic digital controller rate |
| Control divider | 10 plant steps per control step | Separation of plant/control timescales |
| UI update rate | ~60 FPS (16 ms) | Smooth chart animation |
| Data decimation | 10x | Reduces data rate to UI |

### Simulation Speed

| Multiplier | Steps per frame (~16 ms) |
|------------|--------------------------|
| 0.1x | ~160 |
| 0.5x | ~800 |
| 1x | ~1600 |
| 2x | ~3200 |
| 5x | ~8000 |
| 10x | ~16000 |

### Worker Commands

| Command | Parameters | Description |
|---------|------------|-------------|
| start | motorParams, controllerParams, inverterParams, loadProfile, speedRef | Initialize and start simulation |
| pause | - | Halt simulation loop |
| resume | - | Continue from paused state |
| stop | - | Halt and discard engine |
| updateMotorParams | motorParams | Hot-update motor parameters |
| updateControllerParams | controllerParams | Hot-update controller gains |
| updateInverterParams | inverterParams | Hot-update DC bus parameters |
| updateLoadProfile | loadProfile | Change load torque profile |
| updateSpeedRef | speedRef | Change speed reference |
| setSimSpeed | speed | Change wall-time multiplier |

---

## 6. Motor Model Requirements

### State Vector

```
y = [id, iq, omega_m, theta_e]
```

### Electrical Equations (d-q frame)

```
did/dt = (Vd - Rs*id + omega_e*Lq*iq) / Ld
diq/dt = (Vq - Rs*iq - omega_e*(Ld*id + psi_f)) / Lq
```

### Electromagnetic Torque

```
Te = 1.5 * p * [psi_f*iq + (Ld - Lq)*id*iq]
         magnet torque   reluctance torque
```

- SPMSM (Ld = Lq): Te = 1.5 * p * psi_f * iq
- IPMSM (Ld != Lq): Both terms contribute

### Mechanical Dynamics

```
d_omega_m/dt = (Te - TL - B*omega_m) / J
d_theta_e/dt = p * omega_m
```

### Output Metrics

| Metric | Formula | Unit |
|--------|---------|------|
| Electrical frequency | fe = \|p * omega_m\| / (2*pi) | Hz |
| Phase current RMS | Irms = sqrt(id^2 + iq^2) / sqrt(2) | Arms |
| Mechanical power | Pmech = Te * omega_m | W |
| Back-EMF peak | EMF = \|p * omega_m * psi_f\| | V |
| Modulation index | m = V_ref / (Vdc / sqrt(3)) | - |

### Load Torque Profiles

| Type | Behavior |
|------|----------|
| Constant | TL = value for all t >= applyTime |
| Step | TL = value instantaneously at t = applyTime |
| Ramp | TL linearly ramps from 0 to value over rampDuration starting at applyTime |

---

## 7. Control Algorithm Requirements

### FOC Architecture

```
Speed Loop (PI) -> iq_ref
                    |
Strategy ---------> id_ref (id=0 or MTPA)
                    |
Current Loops (PI) -> Vd, Vq
                       |
Inverse Park -> v_alpha, v_beta
                       |
SVPWM -> duty cycles -> reconstructed phase voltages
                       |
Clarke + Park -> id_meas, iq_meas (feedback)
```

### PI Controllers

- Anti-windup via back-calculation
- Voltage loop limits: +/- Vdc/sqrt(3)
- Speed loop limits: +/- Idc_max

### MTPA (IPMSM only)

```
id_ref = psi_f/(4*(Lq-Ld)) - sqrt((psi_f/(4*(Lq-Ld)))^2 + iq_ref^2/2)
```

Safety: when Ld = Lq (SPMSM), returns id_ref = 0.

### Coordinate Transforms

| Transform | Direction | Usage |
|-----------|-----------|-------|
| Clarke | abc -> alpha-beta | Current measurement |
| Park | alpha-beta -> dq | Current measurement |
| Inverse Park | dq -> alpha-beta | Voltage command |
| Inverse Clarke | alpha-beta -> abc | Phase voltage reconstruction |

---

## 8. Inverter Model Requirements

### SVPWM

- 6-sector space vector modulation
- Overmodulation handling (proportional scaling when T1+T2 > Ts)
- Symmetric zero-vector distribution (T0/2 on each side)
- Voltage reconstruction from duty cycles

### DC Bus Constraints

- Maximum phase voltage (linear): Vdc / sqrt(3)
- FOC voltage outputs clamped to this limit
- Modulation index > 1.0 indicates overmodulation

---

## 9. Performance Requirements

| Requirement | Target |
|-------------|--------|
| Numerical method | RK4 (4th-order accuracy) |
| Plant timestep | 10 us |
| Chart buffer | 5000 samples per series |
| Rendering | Non-blocking (Web Worker) |
| Browser support | Modern browsers with Web Worker + ES Module support |

---

## 10. Motor Preset Specifications

### Preset 1: Small SPMSM (100W)

| Parameter | Value |
|-----------|-------|
| Motor type | SPMSM |
| Rs | 2.875 Ohm |
| Ld = Lq | 8.5 mH |
| psi_f | 0.175 Wb |
| Pole pairs | 4 |
| J | 0.0008 kg*m^2 |
| B | 0.001 N*m*s/rad |
| Vdc | 48 V |
| Idc_max | 10 A |
| Strategy | id = 0 |
| PI gains | Kp_d=20, Ki_d=1000, Kp_q=20, Ki_q=1000, Kp_s=0.5, Ki_s=5 |

### Preset 2: Medium SPMSM (1kW)

| Parameter | Value |
|-----------|-------|
| Motor type | SPMSM |
| Rs | 0.958 Ohm |
| Ld = Lq | 5.25 mH |
| psi_f | 0.1827 Wb |
| Pole pairs | 3 |
| J | 0.003 kg*m^2 |
| B | 0.001 N*m*s/rad |
| Vdc | 200 V |
| Idc_max | 15 A |
| Strategy | id = 0 |
| PI gains | Kp_d=15, Ki_d=800, Kp_q=15, Ki_q=800, Kp_s=1.0, Ki_s=10 |

### Preset 3: Industrial IPMSM (5kW)

| Parameter | Value |
|-----------|-------|
| Motor type | IPMSM |
| Rs | 0.35 Ohm |
| Ld | 4 mH |
| Lq | 8 mH |
| psi_f | 0.32 Wb |
| Pole pairs | 4 |
| J | 0.01 kg*m^2 |
| B | 0.002 N*m*s/rad |
| Vdc | 400 V |
| Idc_max | 25 A |
| Strategy | MTPA |
| PI gains | Kp_d=10, Ki_d=500, Kp_q=10, Ki_q=500, Kp_s=2.0, Ki_s=20 |

### Preset 4: EV Traction IPMSM (50kW)

| Parameter | Value |
|-----------|-------|
| Motor type | IPMSM |
| Rs | 0.015 Ohm |
| Ld | 0.3 mH |
| Lq | 0.7 mH |
| psi_f | 0.08 Wb |
| Pole pairs | 4 |
| J | 0.05 kg*m^2 |
| B | 0.005 N*m*s/rad |
| Vdc | 600 V |
| Idc_max | 150 A |
| Strategy | MTPA |
| PI gains | Kp_d=5, Ki_d=200, Kp_q=5, Ki_q=200, Kp_s=5.0, Ki_s=50 |

---

## 11. Revision Log

| Rev | Date | Commit | Description |
|-----|------|--------|-------------|
| 0.1 | - | `0f9f200` | Initial project setup with CLAUDE.md |
| 0.2 | - | `9ae09d9` | Core PMSM simulator: motor model, FOC controller, RK4 solver, 6 charts, parameter panel, control bar, dark theme UI |
| 0.3 | - | `2e34cd4` | Merge PR #1: initial simulator into main |
| 0.4 | - | `a68a8e8` | Add load unit label, phase current frequency (fe) display, user manual |
| 0.5 | - | `356306e` | Add phase current RMS (Irms) display to status bar |
| 0.6 | - | `d2943a6` | Add axis unit labels to all charts and mechanical power (Pmech) to status bar |
| 0.7 | - | `4fdc4e0` | Add inverter model with SVPWM, DC bus parameters (Vdc, Idc_max), back-EMF display, modulation index |
| 0.8 | - | `b7ba6bd` | Merge CLAUDE.md branch into main |
| 0.9 | - | `4001543` | UI consolidation: move preset selector from header to left panel as "Import Motor Parameters", remove duplicate Type dropdown, add motor type constraints (SPMSM: id=0 only + Ld=Lq sync, IPMSM: MTPA enabled), add type hint in Control Strategy section, clean up unused CSS |
| 0.10 | - | `922bc21` | Add multi-page navigation: header nav tabs with hash-based router (`src/ui/router.ts`), wrap existing UI in `#/simulation` view, add `#/parameter-configuration` "Coming soon" placeholder page; lazy per-view init |
| 0.11 | - | (current) | Migrate all parameter sections (Motor Parameters, Controller Gains, Control Strategy, DC Bus) from the simulation sidebar to the Parameter-Configuration page as a responsive card grid; simulation charts now span full width; parameter panel + control bar mount eagerly, charts mount lazily on first show |
