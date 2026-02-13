import type { PIGains, PIState, ControllerParams, MotorParams } from '../types';

// ── Clarke Transform (abc → αβ) ──

export function clarkeTransform(ia: number, ib: number, _ic: number): { i_alpha: number; i_beta: number } {
  const i_alpha = ia;
  const i_beta = (ia + 2 * ib) / Math.sqrt(3);
  return { i_alpha, i_beta };
}

// ── Inverse Clarke Transform (αβ → abc) ──

export function inverseClarkeTransform(v_alpha: number, v_beta: number): { va: number; vb: number; vc: number } {
  const va = v_alpha;
  const vb = (-v_alpha + Math.sqrt(3) * v_beta) / 2;
  const vc = (-v_alpha - Math.sqrt(3) * v_beta) / 2;
  return { va, vb, vc };
}

// ── Park Transform (αβ → dq) ──

export function parkTransform(i_alpha: number, i_beta: number, theta_e: number): { id: number; iq: number } {
  const cosTheta = Math.cos(theta_e);
  const sinTheta = Math.sin(theta_e);
  const id = i_alpha * cosTheta + i_beta * sinTheta;
  const iq = -i_alpha * sinTheta + i_beta * cosTheta;
  return { id, iq };
}

// ── Inverse Park Transform (dq → αβ) ──

export function inverseParkTransform(vd: number, vq: number, theta_e: number): { v_alpha: number; v_beta: number } {
  const cosTheta = Math.cos(theta_e);
  const sinTheta = Math.sin(theta_e);
  const v_alpha = vd * cosTheta - vq * sinTheta;
  const v_beta = vd * sinTheta + vq * cosTheta;
  return { v_alpha, v_beta };
}

// ── PI Controller ──

export function createPIState(outputMin: number, outputMax: number): PIState {
  return { integral: 0, outputMin, outputMax };
}

export function piStep(gains: PIGains, state: PIState, error: number, dt: number): number {
  // Anti-windup: clamp integral
  state.integral += error * dt;

  const output = gains.Kp * error + gains.Ki * state.integral;

  // Clamp output
  const clamped = Math.max(state.outputMin, Math.min(state.outputMax, output));

  // Back-calculate integral to prevent windup
  if (clamped !== output) {
    state.integral = (clamped - gains.Kp * error) / (gains.Ki || 1);
  }

  return clamped;
}

export function resetPIState(state: PIState): void {
  state.integral = 0;
}

// ── FOC Controller ──

export interface FOCState {
  piId: PIState;
  piIq: PIState;
  piSpeed: PIState;
}

export function createFOCState(vMax: number = 200, iMax: number = 50): FOCState {
  return {
    piId: createPIState(-vMax, vMax),
    piIq: createPIState(-vMax, vMax),
    piSpeed: createPIState(-iMax, iMax),
  };
}

export function resetFOCState(state: FOCState): void {
  resetPIState(state.piId);
  resetPIState(state.piIq);
  resetPIState(state.piSpeed);
}

/**
 * Compute MTPA id reference for IPMSM.
 * id_ref = psi_f/(4*(Lq-Ld)) - sqrt((psi_f/(4*(Lq-Ld)))^2 + iq_ref^2/2)
 */
export function computeMTPAIdRef(motorParams: MotorParams, iq_ref: number): number {
  const { psi_f, Ld, Lq } = motorParams;
  const dL = Lq - Ld;
  if (Math.abs(dL) < 1e-12) return 0; // SPMSM: no reluctance torque
  const term = psi_f / (4 * dL);
  return term - Math.sqrt(term * term + (iq_ref * iq_ref) / 2);
}

/**
 * Run one FOC control step.
 * Returns the d-q voltages to apply.
 */
export function focStep(
  focState: FOCState,
  controllerParams: ControllerParams,
  motorParams: MotorParams,
  speedRef: number,
  id_meas: number,
  iq_meas: number,
  omega_m: number,
  dt: number
): { Vd: number; Vq: number } {
  // Speed loop → iq reference
  const speedError = speedRef - omega_m;
  const iq_ref = piStep(controllerParams.speed, focState.piSpeed, speedError, dt);

  // id reference depends on strategy
  let id_ref: number;
  if (controllerParams.strategy === 'mtpa') {
    id_ref = computeMTPAIdRef(motorParams, iq_ref);
  } else {
    id_ref = 0; // id = 0 strategy
  }

  // Current loops
  const id_error = id_ref - id_meas;
  const iq_error = iq_ref - iq_meas;

  const Vd = piStep(controllerParams.dAxis, focState.piId, id_error, dt);
  const Vq = piStep(controllerParams.qAxis, focState.piIq, iq_error, dt);

  return { Vd, Vq };
}
