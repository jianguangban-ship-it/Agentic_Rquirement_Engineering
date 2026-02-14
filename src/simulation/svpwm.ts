/**
 * Space Vector PWM (SVPWM) module.
 *
 * Converts desired α-β voltages into three-phase duty cycles.
 * Simplified for simulation — computes the duty cycles based on
 * sector determination and switching time calculation.
 */

const SQRT3 = Math.sqrt(3);
export interface SVPWMOutput {
  /** Duty cycles for phases a, b, c (0 to 1) */
  da: number;
  db: number;
  dc: number;
  /** Sector (1-6) */
  sector: number;
}

/**
 * Compute SVPWM duty cycles from α-β voltage reference.
 *
 * @param v_alpha - α-axis voltage reference
 * @param v_beta  - β-axis voltage reference
 * @param Vdc     - DC bus voltage
 */
export function computeSVPWM(v_alpha: number, v_beta: number, Vdc: number): SVPWMOutput {
  // Compute reference vector components in sectors
  const v1 = v_beta;
  const v2 = (SQRT3 * v_alpha - v_beta) / 2;
  const v3 = (-SQRT3 * v_alpha - v_beta) / 2;

  // Determine sector
  let sector: number;
  if (v1 >= 0) {
    if (v2 >= 0) sector = 1;
    else if (v3 >= 0) sector = 6;
    else sector = 2;
  } else {
    if (v2 >= 0) {
      if (v3 >= 0) sector = 4;
      else sector = 3;
    } else {
      sector = 5;
    }
  }

  // Compute switching times T1, T2 based on sector
  const Ts = 1; // Normalized switching period
  const k = (SQRT3 * Ts) / Vdc;
  let T1: number, T2: number;

  switch (sector) {
    case 1:
      T1 = k * (SQRT3 / 2 * v_alpha - 0.5 * v_beta);
      T2 = k * v_beta;
      break;
    case 2:
      T1 = k * (SQRT3 / 2 * v_alpha + 0.5 * v_beta);
      T2 = k * (-SQRT3 / 2 * v_alpha + 0.5 * v_beta);
      break;
    case 3:
      T1 = k * v_beta;
      T2 = k * (-SQRT3 / 2 * v_alpha - 0.5 * v_beta);
      break;
    case 4:
      T1 = k * (-SQRT3 / 2 * v_alpha + 0.5 * v_beta);
      T2 = k * (-v_beta);
      break;
    case 5:
      T1 = k * (-SQRT3 / 2 * v_alpha - 0.5 * v_beta);
      T2 = k * (SQRT3 / 2 * v_alpha - 0.5 * v_beta);
      break;
    case 6:
      T1 = k * (-v_beta);
      T2 = k * (SQRT3 / 2 * v_alpha + 0.5 * v_beta);
      break;
    default:
      T1 = 0;
      T2 = 0;
  }

  // Clamp overmodulation
  const sum = T1 + T2;
  if (sum > Ts) {
    const scale = Ts / sum;
    T1 *= scale;
    T2 *= scale;
  }

  const T0 = (Ts - T1 - T2) / 2;

  // Compute duty cycles per sector
  let da: number, db: number, dc: number;
  switch (sector) {
    case 1: da = T1 + T2 + T0; db = T2 + T0; dc = T0; break;
    case 2: da = T1 + T0; db = T1 + T2 + T0; dc = T0; break;
    case 3: da = T0; db = T1 + T2 + T0; dc = T2 + T0; break;
    case 4: da = T0; db = T1 + T0; dc = T1 + T2 + T0; break;
    case 5: da = T2 + T0; db = T0; dc = T1 + T2 + T0; break;
    case 6: da = T1 + T2 + T0; db = T0; dc = T1 + T0; break;
    default: da = 0.5; db = 0.5; dc = 0.5;
  }

  return { da, db, dc, sector };
}

/**
 * Convert duty cycles back to phase voltages.
 */
export function dutyToVoltages(da: number, db: number, dc: number, Vdc: number): { va: number; vb: number; vc: number } {
  return {
    va: (2 * da - db - dc) * Vdc / 3,
    vb: (2 * db - da - dc) * Vdc / 3,
    vc: (2 * dc - da - db) * Vdc / 3,
  };
}
