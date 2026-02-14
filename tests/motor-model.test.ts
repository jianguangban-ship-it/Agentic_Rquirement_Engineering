import { describe, it, expect } from 'vitest';
import { computeTorque, computeLoadTorque } from '../src/simulation/motor-model';
import type { MotorParams } from '../src/types';

const SPMSM_PARAMS: MotorParams = {
  Rs: 2.875,
  Ld: 0.0085,
  Lq: 0.0085,
  psi_f: 0.175,
  p: 4,
  J: 0.0008,
  B: 0.001,
};

const IPMSM_PARAMS: MotorParams = {
  Rs: 0.35,
  Ld: 0.004,
  Lq: 0.008,
  psi_f: 0.32,
  p: 4,
  J: 0.01,
  B: 0.002,
};

describe('Motor Model', () => {
  describe('computeTorque', () => {
    it('should compute SPMSM torque (Te = 1.5 * p * psi_f * iq when Ld=Lq)', () => {
      const iq = 5;
      const id = 2; // id should not affect torque when Ld = Lq
      const Te = computeTorque(SPMSM_PARAMS, id, iq);
      const expected = 1.5 * 4 * 0.175 * iq; // reluctance term = 0
      expect(Te).toBeCloseTo(expected, 10);
    });

    it('should return zero torque when iq=0 for SPMSM', () => {
      const Te = computeTorque(SPMSM_PARAMS, 5, 0);
      expect(Te).toBe(0);
    });

    it('should include reluctance torque for IPMSM (Ld != Lq)', () => {
      const id = -3;
      const iq = 5;
      const Te = computeTorque(IPMSM_PARAMS, id, iq);
      const expected = 1.5 * 4 * (0.32 * iq + (0.004 - 0.008) * id * iq);
      expect(Te).toBeCloseTo(expected, 10);
    });

    it('should produce positive torque for positive iq', () => {
      expect(computeTorque(SPMSM_PARAMS, 0, 1)).toBeGreaterThan(0);
      expect(computeTorque(IPMSM_PARAMS, 0, 1)).toBeGreaterThan(0);
    });

    it('should produce negative torque for negative iq', () => {
      expect(computeTorque(SPMSM_PARAMS, 0, -1)).toBeLessThan(0);
    });
  });

  describe('computeLoadTorque', () => {
    it('should return 0 before apply time', () => {
      expect(computeLoadTorque('step', 5, 1.0, 0, 0.5)).toBe(0);
    });

    it('should return full value for step after apply time', () => {
      expect(computeLoadTorque('step', 5, 1.0, 0, 1.5)).toBe(5);
    });

    it('should return full value for constant at apply time', () => {
      expect(computeLoadTorque('constant', 3, 0, 0, 0.5)).toBe(3);
    });

    it('should ramp linearly for ramp profile', () => {
      // Ramp from t=1 over 2 seconds to value 10
      const midpoint = computeLoadTorque('ramp', 10, 1.0, 2.0, 2.0);
      expect(midpoint).toBeCloseTo(5, 10); // halfway through ramp

      const full = computeLoadTorque('ramp', 10, 1.0, 2.0, 3.0);
      expect(full).toBeCloseTo(10, 10); // ramp complete

      const beyond = computeLoadTorque('ramp', 10, 1.0, 2.0, 5.0);
      expect(beyond).toBeCloseTo(10, 10); // saturated
    });
  });
});
