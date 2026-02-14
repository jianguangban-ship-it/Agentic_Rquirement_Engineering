// ── Motor Parameters ──

export interface MotorParams {
  /** Stator resistance (Ohm) */
  Rs: number;
  /** d-axis inductance (H) */
  Ld: number;
  /** q-axis inductance (H) */
  Lq: number;
  /** Permanent magnet flux linkage (Wb) */
  psi_f: number;
  /** Number of pole pairs */
  p: number;
  /** Rotor inertia (kg·m²) */
  J: number;
  /** Viscous friction coefficient (N·m·s/rad) */
  B: number;
}

// ── Controller Parameters ──

export interface PIGains {
  Kp: number;
  Ki: number;
}

export interface ControllerParams {
  /** d-axis current loop gains */
  dAxis: PIGains;
  /** q-axis current loop gains */
  qAxis: PIGains;
  /** Speed loop gains */
  speed: PIGains;
  /** Control strategy */
  strategy: ControlStrategy;
}

export type ControlStrategy = 'id_zero' | 'mtpa';

export type MotorType = 'SPMSM' | 'IPMSM';

// ── Load Torque ──

export type LoadProfileType = 'step' | 'ramp' | 'constant';

export interface LoadProfile {
  type: LoadProfileType;
  /** Load torque value (N·m) */
  value: number;
  /** Time at which load is applied (s) — for step/ramp */
  applyTime: number;
  /** Ramp duration (s) — for ramp type only */
  rampDuration?: number;
}

// ── Simulation State ──

export interface SimulationState {
  /** Simulation time (s) */
  t: number;
  /** d-axis current (A) */
  id: number;
  /** q-axis current (A) */
  iq: number;
  /** Mechanical angular velocity (rad/s) */
  omega_m: number;
  /** Electrical angle (rad) */
  theta_e: number;
  /** d-axis voltage (V) */
  Vd: number;
  /** q-axis voltage (V) */
  Vq: number;
  /** Electromagnetic torque (N·m) */
  Te: number;
  /** Load torque (N·m) */
  TL: number;
  /** Phase currents (A) */
  ia: number;
  ib: number;
  ic: number;
  /** Electrical frequency of phase currents (Hz) */
  fe: number;
}

// ── ODE Solver ──

/** State vector for the ODE system: [id, iq, omega_m, theta_e] */
export type StateVector = [number, number, number, number];

/** Derivative function: (t, y) => dy/dt */
export type DerivativeFunction = (t: number, y: StateVector) => StateVector;

// ── PI Controller State ──

export interface PIState {
  integral: number;
  outputMin: number;
  outputMax: number;
}

// ── Web Worker Messages ──

export type WorkerCommand =
  | { type: 'start'; motorParams: MotorParams; controllerParams: ControllerParams; loadProfile: LoadProfile; speedRef: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }
  | { type: 'updateMotorParams'; motorParams: MotorParams }
  | { type: 'updateControllerParams'; controllerParams: ControllerParams }
  | { type: 'updateLoadProfile'; loadProfile: LoadProfile }
  | { type: 'updateSpeedRef'; speedRef: number }
  | { type: 'setSimSpeed'; speed: number };

export interface WorkerDataMessage {
  type: 'data';
  batch: SimulationState[];
}

export interface WorkerStatusMessage {
  type: 'status';
  status: 'running' | 'paused' | 'stopped';
}

export type WorkerMessage = WorkerDataMessage | WorkerStatusMessage;

// ── Preset ──

export interface MotorPreset {
  name: string;
  motorType: MotorType;
  params: MotorParams;
  controllerParams: ControllerParams;
}
