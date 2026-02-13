import type { MotorParams, StateVector, DerivativeFunction } from '../types';

/**
 * Creates the derivative function for the PMSM d-q axis model.
 *
 * State vector: [id, iq, omega_m, theta_e]
 *
 * Equations:
 *   did/dt = (Vd - Rs*id + omega_e*Lq*iq) / Ld
 *   diq/dt = (Vq - Rs*iq - omega_e*(Ld*id + psi_f)) / Lq
 *   domega_m/dt = (Te - TL - B*omega_m) / J
 *   dtheta_e/dt = omega_e = p * omega_m
 */
export function createMotorDerivatives(
  params: MotorParams,
  Vd: number,
  Vq: number,
  TL: number
): DerivativeFunction {
  const { Rs, Ld, Lq, psi_f, p, J, B } = params;

  return (_t: number, y: StateVector): StateVector => {
    const [id, iq, omega_m, _theta_e] = y;
    const omega_e = p * omega_m;

    // Voltage equations rearranged for di/dt
    const did_dt = (Vd - Rs * id + omega_e * Lq * iq) / Ld;
    const diq_dt = (Vq - Rs * iq - omega_e * (Ld * id + psi_f)) / Lq;

    // Electromagnetic torque
    const Te = computeTorque(params, id, iq);

    // Mechanical dynamics
    const domega_m_dt = (Te - TL - B * omega_m) / J;
    const dtheta_e_dt = omega_e;

    return [did_dt, diq_dt, domega_m_dt, dtheta_e_dt];
  };
}

/**
 * Compute electromagnetic torque.
 * Te = 1.5 * p * [psi_f * iq + (Ld - Lq) * id * iq]
 */
export function computeTorque(params: MotorParams, id: number, iq: number): number {
  const { psi_f, p, Ld, Lq } = params;
  return 1.5 * p * (psi_f * iq + (Ld - Lq) * id * iq);
}

/**
 * Compute load torque based on profile.
 */
export function computeLoadTorque(
  profileType: string,
  value: number,
  applyTime: number,
  rampDuration: number,
  t: number
): number {
  if (t < applyTime) return 0;

  switch (profileType) {
    case 'constant':
      return value;
    case 'step':
      return value;
    case 'ramp': {
      const elapsed = t - applyTime;
      if (elapsed >= rampDuration) return value;
      return value * (elapsed / rampDuration);
    }
    default:
      return 0;
  }
}
