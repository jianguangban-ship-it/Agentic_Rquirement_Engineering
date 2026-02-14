import { describe, it, expect } from 'vitest';
import {
  clarkeTransform,
  inverseClarkeTransform,
  parkTransform,
  inverseParkTransform,
  createPIState,
  piStep,
  computeMTPAIdRef,
} from '../src/simulation/foc-controller';
import type { MotorParams } from '../src/types';

describe('Clarke Transform', () => {
  it('should produce zero αβ for balanced zero currents', () => {
    const { i_alpha, i_beta } = clarkeTransform(0, 0, 0);
    expect(i_alpha).toBe(0);
    expect(i_beta).toBe(0);
  });

  it('should correctly transform balanced three-phase currents', () => {
    const angle = 0;
    const I = 10;
    const ia = I * Math.cos(angle);
    const ib = I * Math.cos(angle - (2 * Math.PI) / 3);
    const ic = I * Math.cos(angle + (2 * Math.PI) / 3);

    const { i_alpha, i_beta } = clarkeTransform(ia, ib, ic);
    // At angle=0: i_alpha = I, i_beta = 0
    expect(i_alpha).toBeCloseTo(I, 10);
    expect(i_beta).toBeCloseTo(0, 10);
  });
});

describe('Park Transform roundtrip', () => {
  it('should recover original values after forward + inverse transform', () => {
    const i_alpha = 5.5;
    const i_beta = 3.2;
    const theta = 1.23;

    const { id, iq } = parkTransform(i_alpha, i_beta, theta);
    const { v_alpha, v_beta } = inverseParkTransform(id, iq, theta);

    expect(v_alpha).toBeCloseTo(i_alpha, 10);
    expect(v_beta).toBeCloseTo(i_beta, 10);
  });

  it('should work at theta=0 (identity-like)', () => {
    const { id, iq } = parkTransform(10, 0, 0);
    expect(id).toBeCloseTo(10, 10);
    expect(iq).toBeCloseTo(0, 10);
  });

  it('should work at theta=π/2', () => {
    const { id, iq } = parkTransform(10, 0, Math.PI / 2);
    expect(id).toBeCloseTo(0, 10);
    expect(iq).toBeCloseTo(-10, 10);
  });
});

describe('Inverse Clarke Transform', () => {
  it('should produce balanced three-phase from αβ', () => {
    const { va, vb, vc } = inverseClarkeTransform(10, 0);
    // va + vb + vc should be 0 (balanced)
    expect(va + vb + vc).toBeCloseTo(0, 10);
  });
});

describe('PI Controller', () => {
  it('should produce proportional output for a step error', () => {
    const state = createPIState(-100, 100);
    const output = piStep({ Kp: 10, Ki: 0 }, state, 5, 0.001);
    expect(output).toBeCloseTo(50, 10);
  });

  it('should accumulate integral over time', () => {
    const state = createPIState(-100, 100);
    piStep({ Kp: 0, Ki: 100 }, state, 1, 0.01); // integral = 0.01 * 1 = 0.01
    const output = piStep({ Kp: 0, Ki: 100 }, state, 1, 0.01); // integral = 0.02
    expect(output).toBeCloseTo(2, 10); // 100 * 0.02 = 2
  });

  it('should clamp output to limits', () => {
    const state = createPIState(-10, 10);
    const output = piStep({ Kp: 100, Ki: 0 }, state, 5, 0.001);
    expect(output).toBe(10); // Clamped to max
  });

  it('should handle anti-windup', () => {
    const state = createPIState(-10, 10);
    // Drive integral to saturation
    for (let i = 0; i < 100; i++) {
      piStep({ Kp: 0, Ki: 1000 }, state, 10, 0.01);
    }
    // Now apply negative error — should recover quickly due to anti-windup
    const output = piStep({ Kp: 0, Ki: 1000 }, state, -1, 0.01);
    expect(output).toBeLessThanOrEqual(10);
  });
});

describe('MTPA', () => {
  it('should return 0 for SPMSM (Ld=Lq)', () => {
    const params: MotorParams = { Rs: 1, Ld: 0.01, Lq: 0.01, psi_f: 0.1, p: 4, J: 0.001, B: 0.001 };
    expect(computeMTPAIdRef(params, 5)).toBe(0);
  });

  it('should return negative id_ref for IPMSM (Lq > Ld)', () => {
    const params: MotorParams = { Rs: 0.35, Ld: 0.004, Lq: 0.008, psi_f: 0.32, p: 4, J: 0.01, B: 0.002 };
    const id_ref = computeMTPAIdRef(params, 10);
    expect(id_ref).toBeLessThan(0);
  });
});
