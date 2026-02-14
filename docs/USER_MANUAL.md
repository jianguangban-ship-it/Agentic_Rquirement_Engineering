# PMSM Simulator - User Manual

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [User Interface Overview](#3-user-interface-overview)
4. [How to Use the Simulator](#4-how-to-use-the-simulator)
5. [Mathematical Background](#5-mathematical-background)
   - 5.1 [PMSM Dynamic Model](#51-pmsm-dynamic-model)
   - 5.2 [Coordinate Transforms](#52-coordinate-transforms)
   - 5.3 [Field Oriented Control (FOC)](#53-field-oriented-control-foc)
   - 5.4 [PI Controllers with Anti-Windup](#54-pi-controllers-with-anti-windup)
   - 5.5 [Maximum Torque Per Ampere (MTPA)](#55-maximum-torque-per-ampere-mtpa)
   - 5.6 [Space Vector PWM (SVPWM)](#56-space-vector-pwm-svpwm)
   - 5.7 [Numerical Integration (RK4)](#57-numerical-integration-rk4)
6. [Motor Presets](#6-motor-presets)
7. [Glossary of Symbols](#7-glossary-of-symbols)

---

## 1. Introduction

The **PMSM Simulator** is a browser-based, real-time simulation tool for Permanent Magnet Synchronous Motors. It implements a complete Field Oriented Control (FOC) drive system, allowing users to explore motor dynamics, tune controller gains, and observe the transient and steady-state behavior of PMSM drives.

The simulator supports two motor types:

- **SPMSM** (Surface Permanent Magnet Synchronous Motor) - where Ld = Lq
- **IPMSM** (Interior Permanent Magnet Synchronous Motor) - where Ld ≠ Lq, exhibiting reluctance torque

---

## 2. Getting Started

### Prerequisites

- **Node.js** (version 18 or later) - [https://nodejs.org](https://nodejs.org)
- **Git** (for cloning the repository)

### Installation

```bash
git clone <repo-url>
cd Agentic_Rquirement_Engineering
npm install
```

### Running the Simulator

```bash
npm run dev
```

Open your browser and navigate to **http://localhost:5173/**

### Restarting After Shutdown

If you shut down your PC and want to run the simulator again:

1. Open a terminal (Git Bash, PowerShell, etc.)
2. Navigate to the project directory
3. Run `npm run dev`
4. Open **http://localhost:5173/** in your browser

You do **not** need to run `npm install` again.

---

## 3. User Interface Overview

The simulator interface is divided into five main areas:

```
+---------------------------------------------+
|  Header (title + motor preset selector)     |
+----------+----------------------------------+
|          |  Chart Grid (2 x 3)              |
| Parameter|  [Phase Currents] [d-q Currents] |
| Panel    |  [Torque]         [Speed]        |
| (sidebar)|  [Voltages]       [d-q Trajectory]|
+----------+----------------------------------+
|  Control Bar (buttons + inputs)             |
+---------------------------------------------+
|  Status Bar (real-time data readout)        |
+---------------------------------------------+
```

### Parameter Panel (Left Sidebar)

Edit the motor parameters and controller gains:

| Parameter | Symbol | Unit |
|-----------|--------|------|
| Stator Resistance | Rs | Ohm |
| d-axis Inductance | Ld | H |
| q-axis Inductance | Lq | H |
| Flux Linkage | psi_f | Wb |
| Pole Pairs | p | - |
| Rotor Inertia | J | kg*m^2 |
| Friction Coefficient | B | N*m*s/rad |

Controller gains for d-axis, q-axis, and speed PI loops (Kp and Ki for each) are also configurable. The control strategy can be set to **id = 0** (for SPMSM) or **MTPA** (for IPMSM).

### Chart Grid (6 Panels)

| Chart | Description |
|-------|-------------|
| Phase Currents | Three-phase stator currents ia, ib, ic (A) |
| d-q Currents | Direct and quadrature axis currents id, iq (A) |
| Torque | Electromagnetic torque Te and load torque TL (N*m) |
| Speed | Mechanical angular velocity omega_m (rad/s) |
| Voltages | d-q axis voltage commands Vd, Vq (V) |
| d-q Trajectory | Phase plane plot of iq vs id |

### Control Bar (Bottom)

- **Start / Pause / Reset** buttons
- **Sim Speed** dropdown (0.1x to 10x)
- **Speed Ref** input (rad/s) - target speed for the speed controller
- **Load** section - type (Constant/Step/Ramp), value (N*m), and apply time (s)

### Status Bar

Real-time display of key simulation variables:

| Variable | Description | Unit |
|----------|-------------|------|
| t | Simulation time | s |
| omega_m | Mechanical angular velocity | rad/s |
| Te | Electromagnetic torque | N*m |
| id | d-axis current | A |
| iq | q-axis current | A |
| fe | Phase current electrical frequency | Hz |
| Irms | Phase current RMS value | Arms |

---

## 4. How to Use the Simulator

### Basic Workflow

1. **Select a motor preset** from the top-right dropdown (or manually set parameters in the sidebar)
2. **Set the speed reference** in the control bar (e.g., 100 rad/s)
3. **Configure the load torque** - choose the type, value, and apply time
4. **Click Start** to begin the simulation
5. **Observe** the 6 real-time charts updating
6. **Adjust** speed reference or load profile while the simulation is running
7. **Pause/Resume** to freeze or continue
8. **Reset** to return to initial conditions

### Experimenting with Load Disturbance

1. Start with no load (value = 0)
2. Set load type to "Step", value to 0.5 N*m, apply time to 0.5 s
3. Click Start and observe the torque step response
4. Watch how the speed controller compensates for the load disturbance

### Comparing SPMSM vs IPMSM

1. Select "Small SPMSM (100W)" preset and run a test
2. Reset, then select "Industrial IPMSM (5kW)" preset
3. Compare the d-q trajectory plots - the IPMSM will show non-zero id due to MTPA strategy

---

## 5. Mathematical Background

This section documents the mathematical models and control theory used in the simulator.

### 5.1 PMSM Dynamic Model

The PMSM is modeled in the synchronous rotating d-q reference frame. This eliminates the time-varying inductances that appear in the three-phase (abc) frame and produces a system of constant-coefficient differential equations.

#### Voltage Equations

The stator voltage equations in the d-q frame are:

```
Vd = Rs * id + Ld * (did/dt) - omega_e * Lq * iq
Vq = Rs * iq + Lq * (diq/dt) + omega_e * (Ld * id + psi_f)
```

Rearranging for the current derivatives (used for numerical integration):

```
did/dt = (Vd - Rs * id + omega_e * Lq * iq) / Ld
diq/dt = (Vq - Rs * iq - omega_e * (Ld * id + psi_f)) / Lq
```

Where:
- `omega_e = p * omega_m` is the electrical angular velocity
- `p` is the number of pole pairs

#### Electromagnetic Torque

The electromagnetic torque consists of two components:

```
Te = 1.5 * p * [psi_f * iq + (Ld - Lq) * id * iq]
          ^                    ^
    magnet torque        reluctance torque
```

- For **SPMSM** (Ld = Lq): the reluctance torque is zero, so `Te = 1.5 * p * psi_f * iq`
- For **IPMSM** (Ld ≠ Lq): both components contribute, enabling MTPA optimization

#### Mechanical Dynamics

The rotor motion equation:

```
J * (d_omega_m/dt) = Te - TL - B * omega_m
```

Rearranged:

```
d_omega_m/dt = (Te - TL - B * omega_m) / J
```

Where:
- `J` = rotor inertia (kg*m^2)
- `TL` = load torque (N*m)
- `B` = viscous friction coefficient (N*m*s/rad)

#### Electrical Angle

The electrical angle evolves as:

```
d_theta_e/dt = omega_e = p * omega_m
```

#### Phase Current Frequency

The frequency of the three-phase stator currents (ia, ib, ic) equals the electrical frequency:

```
fe = omega_e / (2 * pi) = (p * omega_m) / (2 * pi)    [Hz]
```

#### Phase Current RMS

The RMS (Root Mean Square) value of the phase currents is derived from the d-q current magnitudes. Since the simulator uses an amplitude-invariant Clarke/Park transform, the d-q current vector magnitude equals the peak phase current:

```
I_peak = sqrt(id^2 + iq^2)
I_rms  = I_peak / sqrt(2) = sqrt(id^2 + iq^2) / sqrt(2)    [Arms]
```

This gives the true RMS for sinusoidal phase currents produced under FOC steady-state operation.

#### State Vector

The complete state vector for numerical integration is:

```
y = [id, iq, omega_m, theta_e]
```

#### Load Torque Profiles

The simulator supports three load profiles:

| Type | Behavior |
|------|----------|
| Constant | TL = value, for t >= applyTime |
| Step | TL = value, instantaneously at t = applyTime |
| Ramp | TL linearly increases from 0 to value over rampDuration, starting at applyTime |

For all types, TL = 0 before the apply time.

---

### 5.2 Coordinate Transforms

The FOC algorithm requires transformations between the three-phase stationary frame (abc), the two-axis stationary frame (alpha-beta), and the synchronous rotating frame (d-q).

#### Clarke Transform (abc -> alpha-beta)

Converts balanced three-phase quantities to a two-axis stationary frame:

```
i_alpha = ia
i_beta  = (ia + 2 * ib) / sqrt(3)
```

This is the amplitude-invariant form assuming `ia + ib + ic = 0`.

#### Inverse Clarke Transform (alpha-beta -> abc)

```
va = v_alpha
vb = (-v_alpha + sqrt(3) * v_beta) / 2
vc = (-v_alpha - sqrt(3) * v_beta) / 2
```

#### Park Transform (alpha-beta -> dq)

Rotates the stationary frame to align with the rotor flux using the electrical angle `theta_e`:

```
id =  i_alpha * cos(theta_e) + i_beta * sin(theta_e)
iq = -i_alpha * sin(theta_e) + i_beta * cos(theta_e)
```

#### Inverse Park Transform (dq -> alpha-beta)

```
v_alpha = Vd * cos(theta_e) - Vq * sin(theta_e)
v_beta  = Vd * sin(theta_e) + Vq * cos(theta_e)
```

#### Transform Chain

The full signal path in FOC:

```
Measurement:  ia, ib, ic  --[Clarke]--> i_alpha, i_beta  --[Park]--> id, iq
Control:      Vd, Vq  --[Inv. Park]--> v_alpha, v_beta  --[Inv. Clarke]--> va, vb, vc
```

---

### 5.3 Field Oriented Control (FOC)

FOC is the industry-standard control method for high-performance AC motor drives. It decouples the torque-producing and flux-producing components of stator current by controlling them independently in the d-q reference frame.

#### Control Architecture

```
                    Speed Loop           Current Loops
                   +--------+           +--------+
omega_ref --(+)--->| PI     |--iq_ref-->| PI (q) |----> Vq
             |     | Speed  |           +--------+
             |     +--------+
  omega_m ---(--)               id_ref-->| PI (d) |----> Vd
                                         +--------+

  id_ref is set by the control strategy:
    - id = 0 strategy:  id_ref = 0
    - MTPA strategy:    id_ref = f(iq_ref)  (see Section 5.5)
```

#### Cascaded Loop Structure

1. **Outer Loop (Speed):** Compares the speed reference with measured speed, outputs the q-axis current reference (iq_ref)
2. **Inner Loops (Current):** Two independent PI controllers regulate id and iq to their references by outputting Vd and Vq

The inner current loops run faster than the outer speed loop. In this simulator:
- Plant integration timestep: 10 us (100 kHz)
- FOC control update: every 10th step (10 kHz effective control rate)

---

### 5.4 PI Controllers with Anti-Windup

Each control loop uses a Proportional-Integral (PI) controller with back-calculation anti-windup.

#### PI Output

```
output = Kp * error + Ki * integral
```

Where:
- `error = reference - measured`
- `integral += error * dt` (accumulated over time)

#### Anti-Windup (Back-Calculation)

When the output saturates (hits its min/max limit), the integrator is back-calculated to prevent windup:

```
if output is clamped to 'clamped_value':
    integral = (clamped_value - Kp * error) / Ki
```

This prevents the integrator from accumulating when the actuator is saturated, ensuring fast recovery when the operating point returns to the linear region.

#### Controller Limits

| Controller | Output | Min | Max |
|------------|--------|-----|-----|
| d-axis PI | Vd (voltage) | -Vmax | +Vmax |
| q-axis PI | Vq (voltage) | -Vmax | +Vmax |
| Speed PI | iq_ref (current) | -Imax | +Imax |

---

### 5.5 Maximum Torque Per Ampere (MTPA)

For **IPMSM** motors where Ld ≠ Lq, the MTPA strategy minimizes stator current for a given torque by utilizing the reluctance torque component.

#### MTPA id Reference Calculation

Given a q-axis current reference `iq_ref`, the optimal d-axis current is:

```
id_ref = psi_f / (4 * (Lq - Ld)) - sqrt( [psi_f / (4 * (Lq - Ld))]^2 + iq_ref^2 / 2 )
```

This formula is derived by minimizing the stator current magnitude `Is = sqrt(id^2 + iq^2)` subject to the torque equation constraint.

#### When to Use MTPA

- **SPMSM (Ld = Lq):** MTPA reduces to `id = 0` since there is no reluctance torque. The `id = 0` strategy should be used.
- **IPMSM (Ld ≠ Lq):** MTPA produces a negative id (demagnetizing current) that generates additional reluctance torque, improving torque-per-ampere efficiency.

---

### 5.6 Space Vector PWM (SVPWM)

SVPWM converts the desired voltage vector from the alpha-beta frame into three-phase PWM duty cycles for the inverter.

#### Sector Determination

The alpha-beta voltage plane is divided into 6 sectors (60 degrees each). The sector is determined by the signs of three auxiliary variables:

```
v1 = v_beta
v2 = (sqrt(3) * v_alpha - v_beta) / 2
v3 = (-sqrt(3) * v_alpha - v_beta) / 2
```

#### Switching Time Calculation

For each sector, two active switching times T1 and T2 are computed:

```
k = (sqrt(3) * Ts) / Vdc
```

Where `Ts` is the switching period and `Vdc` is the DC bus voltage.

The switching times are sector-dependent and determine how long each active voltage vector is applied.

#### Overmodulation Handling

If `T1 + T2 > Ts`, the switching times are scaled proportionally:

```
scale = Ts / (T1 + T2)
T1 = T1 * scale
T2 = T2 * scale
```

#### Zero Vector Time

```
T0 = (Ts - T1 - T2) / 2
```

The zero vector time is split equally between the two zero states for symmetric PWM.

#### Duty Cycle Computation

Duty cycles (da, db, dc) are computed per sector using combinations of T0, T1, and T2:

| Sector | da | db | dc |
|--------|----|----|-----|
| 1 | T1+T2+T0 | T2+T0 | T0 |
| 2 | T1+T0 | T1+T2+T0 | T0 |
| 3 | T0 | T1+T2+T0 | T2+T0 |
| 4 | T0 | T1+T0 | T1+T2+T0 |
| 5 | T2+T0 | T0 | T1+T2+T0 |
| 6 | T1+T2+T0 | T0 | T1+T0 |

---

### 5.7 Numerical Integration (RK4)

The motor dynamics ODE system is integrated using the **4th-order Runge-Kutta (RK4)** method, which provides a good balance between accuracy and computational cost.

#### RK4 Algorithm

Given the ODE system `dy/dt = f(t, y)`, one integration step with timestep `h`:

```
k1 = f(t,       y)
k2 = f(t + h/2, y + h/2 * k1)
k3 = f(t + h/2, y + h/2 * k2)
k4 = f(t + h,   y + h * k3)

y(t + h) = y(t) + (h/6) * (k1 + 2*k2 + 2*k3 + k4)
```

#### Integration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Timestep (h) | 10 us | Plant integration step |
| Control divider | 10 | FOC runs every 10th plant step |
| Effective control rate | 10 kHz | FOC update frequency |
| Data decimation | 10 | Every 10th sample sent to UI |

The 10 us timestep is chosen to be small enough to accurately capture the fast electrical dynamics (current loops) while remaining computationally feasible for real-time browser execution.

---

## 6. Motor Presets

The simulator includes four built-in motor presets:

### Small SPMSM (100W)

| Parameter | Value |
|-----------|-------|
| Rs | 2.875 Ohm |
| Ld = Lq | 8.5 mH |
| psi_f | 0.175 Wb |
| Pole pairs | 4 |
| J | 0.0008 kg*m^2 |
| B | 0.001 N*m*s/rad |
| Strategy | id = 0 |

### Medium SPMSM (1kW)

| Parameter | Value |
|-----------|-------|
| Rs | 0.958 Ohm |
| Ld = Lq | 5.25 mH |
| psi_f | 0.1827 Wb |
| Pole pairs | 3 |
| J | 0.003 kg*m^2 |
| B | 0.001 N*m*s/rad |
| Strategy | id = 0 |

### Industrial IPMSM (5kW)

| Parameter | Value |
|-----------|-------|
| Rs | 0.35 Ohm |
| Ld | 4 mH |
| Lq | 8 mH |
| psi_f | 0.32 Wb |
| Pole pairs | 4 |
| J | 0.01 kg*m^2 |
| B | 0.002 N*m*s/rad |
| Strategy | MTPA |

### EV Traction IPMSM (50kW)

| Parameter | Value |
|-----------|-------|
| Rs | 0.015 Ohm |
| Ld | 0.3 mH |
| Lq | 0.7 mH |
| psi_f | 0.08 Wb |
| Pole pairs | 4 |
| J | 0.05 kg*m^2 |
| B | 0.005 N*m*s/rad |
| Strategy | MTPA |

---

## 7. Glossary of Symbols

| Symbol | Description | Unit |
|--------|-------------|------|
| Rs | Stator resistance | Ohm |
| Ld | d-axis inductance | H |
| Lq | q-axis inductance | H |
| psi_f | Permanent magnet flux linkage | Wb |
| p | Number of pole pairs | - |
| J | Rotor moment of inertia | kg*m^2 |
| B | Viscous friction coefficient | N*m*s/rad |
| id, iq | d-q axis stator currents | A |
| Vd, Vq | d-q axis stator voltages | V |
| ia, ib, ic | Three-phase stator currents | A |
| omega_m | Mechanical angular velocity | rad/s |
| omega_e | Electrical angular velocity | rad/s |
| theta_e | Electrical angle | rad |
| Te | Electromagnetic torque | N*m |
| TL | Load torque | N*m |
| fe | Electrical frequency of phase currents | Hz |
| I_rms | Phase current RMS value | Arms |
| Kp | Proportional gain | - |
| Ki | Integral gain | - |
| Ts | PWM switching period | s |
| Vdc | DC bus voltage | V |
| SPMSM | Surface Permanent Magnet Synchronous Motor | - |
| IPMSM | Interior Permanent Magnet Synchronous Motor | - |
| FOC | Field Oriented Control | - |
| MTPA | Maximum Torque Per Ampere | - |
| SVPWM | Space Vector Pulse Width Modulation | - |
| RK4 | 4th-order Runge-Kutta | - |
