import type { MotorParams, ControllerParams, InverterParams, LoadProfile, SimulationState, StateVector } from '../types';
import { rk4Step } from './ode-solver';
import { createMotorDerivatives, computeTorque, computeLoadTorque } from './motor-model';
import {
  focStep,
  createFOCState,
  resetFOCState,
  inverseParkTransform,
  clarkeTransform,
  parkTransform,
  type FOCState,
} from './foc-controller';
import { computeSVPWM, dutyToVoltages } from './svpwm';

export interface SimulationEngine {
  step(): SimulationState;
  reset(): void;
  setMotorParams(params: MotorParams): void;
  setControllerParams(params: ControllerParams): void;
  setInverterParams(params: InverterParams): void;
  setLoadProfile(profile: LoadProfile): void;
  setSpeedRef(ref: number): void;
  getTime(): number;
}

const DEFAULT_DT = 1e-5; // 10 μs timestep — suitable for motor simulation

export function createSimulationEngine(
  motorParams: MotorParams,
  controllerParams: ControllerParams,
  inverterParams: InverterParams,
  loadProfile: LoadProfile,
  speedRef: number,
  dt: number = DEFAULT_DT
): SimulationEngine {
  let mp = { ...motorParams };
  let cp = { ...controllerParams };
  let ip = { ...inverterParams };
  let lp = { ...loadProfile };
  let wRef = speedRef;

  // State vector: [id, iq, omega_m, theta_e]
  let state: StateVector = [0, 0, 0, 0];
  let t = 0;

  // Derive FOC voltage limit from Vdc: max phase voltage in linear region
  const vMaxFromVdc = () => ip.Vdc / Math.sqrt(3);

  // FOC controller state — limits derived from inverter params
  let focState: FOCState = createFOCState(vMaxFromVdc(), ip.Idc_max);

  // Voltages from last controller step (after SVPWM clamping)
  let Vd = 0;
  let Vq = 0;

  // Modulation index from last controller step
  let currentModIndex = 0;

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

      // Convert FOC dq output through SVPWM inverter model
      const { v_alpha, v_beta } = inverseParkTransform(result.Vd, result.Vq, state[3]);

      // Compute modulation index: m = V_ref / (Vdc / sqrt(3))
      const V_ref = Math.sqrt(v_alpha * v_alpha + v_beta * v_beta);
      currentModIndex = ip.Vdc > 0 ? V_ref / (ip.Vdc / Math.sqrt(3)) : 0;

      // SVPWM: compute duty cycles and reconstruct actual phase voltages
      const svpwm = computeSVPWM(v_alpha, v_beta, ip.Vdc);
      const { va, vb, vc } = dutyToVoltages(svpwm.da, svpwm.db, svpwm.dc, ip.Vdc);

      // Convert actual phase voltages back to dq frame for motor model
      const { i_alpha: v_alpha_actual, i_beta: v_beta_actual } = clarkeTransform(va, vb, vc);
      const { id: vd_actual, iq: vq_actual } = parkTransform(v_alpha_actual, v_beta_actual, state[3]);
      Vd = vd_actual;
      Vq = vq_actual;
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

    // Back-EMF: EMF = |p * omega_m * psi_f| (peak voltage)
    const EMF = Math.abs(mp.p * state[2] * mp.psi_f);

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
      EMF,
      modulation_index: currentModIndex,
    };
  }

  function reset(): void {
    state = [0, 0, 0, 0];
    t = 0;
    Vd = 0;
    Vq = 0;
    currentModIndex = 0;
    stepCount = 0;
    focState = createFOCState(vMaxFromVdc(), ip.Idc_max);
    resetFOCState(focState);
  }

  return {
    step,
    reset,
    setMotorParams(params: MotorParams) { mp = { ...params }; },
    setControllerParams(params: ControllerParams) { cp = { ...params }; },
    setInverterParams(params: InverterParams) {
      ip = { ...params };
      const vMax = vMaxFromVdc();
      focState.piId.outputMin = -vMax;
      focState.piId.outputMax = vMax;
      focState.piIq.outputMin = -vMax;
      focState.piIq.outputMax = vMax;
      focState.piSpeed.outputMin = -ip.Idc_max;
      focState.piSpeed.outputMax = ip.Idc_max;
    },
    setLoadProfile(profile: LoadProfile) { lp = { ...profile }; },
    setSpeedRef(ref: number) { wRef = ref; },
    getTime() { return t; },
  };
}
