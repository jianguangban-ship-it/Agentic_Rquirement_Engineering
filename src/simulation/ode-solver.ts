import type { StateVector, DerivativeFunction } from '../types';

/**
 * 4th-order Runge-Kutta integrator for a system of ODEs.
 *
 * Advances the state vector y by one timestep h using the derivative function f.
 */
export function rk4Step(
  f: DerivativeFunction,
  t: number,
  y: StateVector,
  h: number
): StateVector {
  const k1 = f(t, y);
  const k2 = f(t + h / 2, addScaled(y, k1, h / 2));
  const k3 = f(t + h / 2, addScaled(y, k2, h / 2));
  const k4 = f(t + h, addScaled(y, k3, h));

  return [
    y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    y[2] + (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    y[3] + (h / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]),
  ];
}

function addScaled(y: StateVector, k: StateVector, scale: number): StateVector {
  return [
    y[0] + scale * k[0],
    y[1] + scale * k[1],
    y[2] + scale * k[2],
    y[3] + scale * k[3],
  ];
}
