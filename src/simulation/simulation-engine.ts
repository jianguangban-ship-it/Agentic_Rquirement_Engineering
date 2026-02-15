import type { MotorParams, ControllerParams, LoadProfile, SimulationState, StateVector } from '../types';
import { rk4Step } from './ode-solver';
import { createMotorDerivatives, computeTorque, computeLoadTorque } from './motor-model';
import {
  focStep,
  createFOCState,
  resetFOCState,
  type FOCState,
} from './foc-controller';

export interface SimulationEngine {
  step(): SimulationState;
  reset(): void;
  setMotorParams(params: MotorParams): void;
  setControllerParams(params: ControllerParams): void;
  setLoadProfile(profile: LoadProfile): void;
  setSpeedRef(ref: number): void;
  getTime(): number;
}

const DEFAULT_DT = 1e-5; // 10 μs timestep — suitable for motor simulation

export function createSimulationEngine(
  motorParams: MotorParams,
  controllerParams: ControllerParams,
  loadProfile: LoadProfile,
  speedRef: number,
  dt: number = DEFAULT_DT
): SimulationEngine {
  let mp = { ...motorParams };
  let cp = { ...controllerParams };
  let lp = { ...loadProfile };
  let wRef = speedRef;

  // State vector: [id, iq, omega_m, theta_e]
  let state: StateVector = [0, 0, 0, 0];
  let t = 0;

  // FOC controller state
  let focState: FOCState = createFOCState();

  // Voltages from last controller step
  let Vd = 0;
  let Vq = 0;

  // Controller runs at a slower rate than the plant
  const controlDivider = 10; // Control at every 10th plant step
  let stepCount = 0;

  function step(): SimulationState {
    // Compute load torque
    const TL = computeLoadTorque(
      lp.type,
      lp.value,
      lp.applyTime,
      lp.rampDuration ?? 0,
      t
    );

    // Run FOC controller at reduced rate
    if (stepCount % controlDivider === 0) {
      const result = focStep(
        focState,
        cp,
        mp,
        wRef,
        state[0], // id
        state[1], // iq
        state[2], // omega_m
        dt * controlDivider
      );
      Vd = result.Vd;
      Vq = result.Vq;
    }
    stepCount++;

    // Create derivative function with current voltages and load
    const derivatives = createMotorDerivatives(mp, Vd, Vq, TL);

    // Integrate one step
    state = rk4Step(derivatives, t, state, dt);

    // Wrap theta_e to [0, 2π]
    state[3] = state[3] % (2 * Math.PI);
    if (state[3] < 0) state[3] += 2 * Math.PI;

    t += dt;

    // Compute phase currents from d-q using inverse Park transform
    const theta_e = state[3];
    const i_alpha = state[0] * Math.cos(theta_e) - state[1] * Math.sin(theta_e);
    const i_beta = state[0] * Math.sin(theta_e) + state[1] * Math.cos(theta_e);
    const ia = i_alpha;
    const ib = (-i_alpha + Math.sqrt(3) * i_beta) / 2;
    const ic = (-i_alpha - Math.sqrt(3) * i_beta) / 2;

    const Te = computeTorque(mp, state[0], state[1]);

    // Electrical frequency of phase currents: fe = p * omega_m / (2 * pi)
    const fe = Math.abs(mp.p * state[2]) / (2 * Math.PI);

    // Phase current RMS: I_rms = sqrt(id^2 + iq^2) / sqrt(2)
    const I_rms = Math.sqrt(state[0] * state[0] + state[1] * state[1]) / Math.SQRT2;

    // Mechanical power: P_mech = Te * omega_m
    const P_mech = Te * state[2];

    return {
      t,
      id: state[0],
      iq: state[1],
      omega_m: state[2],
      theta_e: state[3],
      Vd,
      Vq,
      Te,
      TL,
      ia,
      ib,
      ic,
      fe,
      I_rms,
      P_mech,
    };
  }

  function reset(): void {
    state = [0, 0, 0, 0];
    t = 0;
    Vd = 0;
    Vq = 0;
    stepCount = 0;
    resetFOCState(focState);
  }

  return {
    step,
    reset,
    setMotorParams(params: MotorParams) { mp = { ...params }; },
    setControllerParams(params: ControllerParams) { cp = { ...params }; },
    setLoadProfile(profile: LoadProfile) { lp = { ...profile }; },
    setSpeedRef(ref: number) { wRef = ref; },
    getTime() { return t; },
  };
}
