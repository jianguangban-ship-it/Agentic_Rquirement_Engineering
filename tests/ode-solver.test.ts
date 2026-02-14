import { describe, it, expect } from 'vitest';
import { rk4Step } from '../src/simulation/ode-solver';
import type { StateVector, DerivativeFunction } from '../src/types';

describe('RK4 ODE Solver', () => {
  it('should solve dx/dt = -x (exponential decay) accurately', () => {
    // Analytical solution: x(t) = x0 * exp(-t)
    const f: DerivativeFunction = (_t, y) => [-y[0], 0, 0, 0];
    const x0 = 1.0;
    let state: StateVector = [x0, 0, 0, 0];
    const dt = 0.01;
    const steps = 100; // t = 1.0

    for (let i = 0; i < steps; i++) {
      state = rk4Step(f, i * dt, state, dt);
    }

    const expected = x0 * Math.exp(-1.0);
    expect(state[0]).toBeCloseTo(expected, 8);
  });

  it('should solve dx/dt = x (exponential growth) accurately', () => {
    const f: DerivativeFunction = (_t, y) => [y[0], 0, 0, 0];
    let state: StateVector = [1.0, 0, 0, 0];
    const dt = 0.001;
    const steps = 1000; // t = 1.0

    for (let i = 0; i < steps; i++) {
      state = rk4Step(f, i * dt, state, dt);
    }

    expect(state[0]).toBeCloseTo(Math.E, 6);
  });

  it('should solve a simple harmonic oscillator', () => {
    // x'' + x = 0 → state = [x, v, 0, 0], dx/dt = v, dv/dt = -x
    const f: DerivativeFunction = (_t, y) => [y[1], -y[0], 0, 0];
    let state: StateVector = [1.0, 0, 0, 0]; // x(0)=1, v(0)=0 → x(t)=cos(t)
    const dt = 0.001;
    const steps = Math.round(Math.PI / dt); // t = π

    for (let i = 0; i < steps; i++) {
      state = rk4Step(f, i * dt, state, dt);
    }

    // x(π) = cos(π) = -1
    expect(state[0]).toBeCloseTo(-1.0, 5);
    // v(π) = -sin(π) ≈ 0
    expect(state[1]).toBeCloseTo(0, 3);
  });

  it('should preserve state vector length', () => {
    const f: DerivativeFunction = (_t, y) => [y[0], y[1], y[2], y[3]];
    const state: StateVector = [1, 2, 3, 4];
    const result = rk4Step(f, 0, state, 0.01);
    expect(result).toHaveLength(4);
  });
});
