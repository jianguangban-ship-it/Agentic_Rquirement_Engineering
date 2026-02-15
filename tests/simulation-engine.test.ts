import { describe, it, expect } from 'vitest';
import { createSimulationEngine } from '../src/simulation/simulation-engine';
import type { MotorParams, ControllerParams, InverterParams, LoadProfile } from '../src/types';

const MOTOR_PARAMS: MotorParams = {
  Rs: 2.875,
  Ld: 0.0085,
  Lq: 0.0085,
  psi_f: 0.175,
  p: 4,
  J: 0.0008,
  B: 0.001,
};

const CONTROLLER_PARAMS: ControllerParams = {
  dAxis: { Kp: 20, Ki: 1000 },
  qAxis: { Kp: 20, Ki: 1000 },
  speed: { Kp: 0.5, Ki: 5 },
  strategy: 'id_zero',
};

const INVERTER_PARAMS: InverterParams = {
  Vdc: 200,
  Idc_max: 50,
};

const LOAD_PROFILE: LoadProfile = {
  type: 'constant',
  value: 0,
  applyTime: 0,
};

describe('Simulation Engine', () => {
  it('should initialize at t=0 with zero state', () => {
    const engine = createSimulationEngine(MOTOR_PARAMS, CONTROLLER_PARAMS, INVERTER_PARAMS, LOAD_PROFILE, 100);
    expect(engine.getTime()).toBe(0);
  });

  it('should advance time on each step', () => {
    const engine = createSimulationEngine(MOTOR_PARAMS, CONTROLLER_PARAMS, INVERTER_PARAMS, LOAD_PROFILE, 100);
    const s1 = engine.step();
    expect(s1.t).toBeGreaterThan(0);
    const s2 = engine.step();
    expect(s2.t).toBeGreaterThan(s1.t);
  });

  it('should return valid simulation state fields', () => {
    const engine = createSimulationEngine(MOTOR_PARAMS, CONTROLLER_PARAMS, INVERTER_PARAMS, LOAD_PROFILE, 100);
    const state = engine.step();

    expect(typeof state.t).toBe('number');
    expect(typeof state.id).toBe('number');
    expect(typeof state.iq).toBe('number');
    expect(typeof state.omega_m).toBe('number');
    expect(typeof state.theta_e).toBe('number');
    expect(typeof state.Vd).toBe('number');
    expect(typeof state.Vq).toBe('number');
    expect(typeof state.Te).toBe('number');
    expect(typeof state.TL).toBe('number');
    expect(typeof state.ia).toBe('number');
    expect(typeof state.ib).toBe('number');
    expect(typeof state.ic).toBe('number');
    expect(typeof state.EMF).toBe('number');
    expect(typeof state.modulation_index).toBe('number');
  });

  it('should accelerate toward speed reference (no load)', () => {
    const speedRef = 50; // rad/s
    const engine = createSimulationEngine(MOTOR_PARAMS, CONTROLLER_PARAMS, INVERTER_PARAMS, LOAD_PROFILE, speedRef);

    let state;
    // Run 50,000 steps (0.5 seconds at dt=10μs)
    for (let i = 0; i < 50000; i++) {
      state = engine.step();
    }

    // Speed should be moving toward the reference
    expect(state!.omega_m).toBeGreaterThan(0);
  });

  it('should reset to initial state', () => {
    const engine = createSimulationEngine(MOTOR_PARAMS, CONTROLLER_PARAMS, INVERTER_PARAMS, LOAD_PROFILE, 100);

    // Advance a few steps
    for (let i = 0; i < 100; i++) engine.step();
    expect(engine.getTime()).toBeGreaterThan(0);

    engine.reset();
    expect(engine.getTime()).toBe(0);
  });

  it('should balance phase currents (ia + ib + ic ≈ 0)', () => {
    const engine = createSimulationEngine(MOTOR_PARAMS, CONTROLLER_PARAMS, INVERTER_PARAMS, LOAD_PROFILE, 100);

    // Run some steps to get non-zero currents
    let state;
    for (let i = 0; i < 1000; i++) {
      state = engine.step();
    }

    // Balanced three-phase: ia + ib + ic should be approximately 0
    const sum = state!.ia + state!.ib + state!.ic;
    expect(Math.abs(sum)).toBeLessThan(0.01);
  });

  it('should return EMF and modulation_index as numbers', () => {
    const engine = createSimulationEngine(MOTOR_PARAMS, CONTROLLER_PARAMS, INVERTER_PARAMS, LOAD_PROFILE, 100);

    let state;
    for (let i = 0; i < 10000; i++) {
      state = engine.step();
    }

    expect(state!.EMF).toBeGreaterThanOrEqual(0);
    expect(typeof state!.modulation_index).toBe('number');
  });

  it('should clamp voltages based on Vdc', () => {
    const lowVdc: InverterParams = { Vdc: 24, Idc_max: 10 };
    const engine = createSimulationEngine(MOTOR_PARAMS, CONTROLLER_PARAMS, lowVdc, LOAD_PROFILE, 100);

    let state;
    for (let i = 0; i < 1000; i++) {
      state = engine.step();
    }

    // With Vdc=24, phase voltage cannot exceed Vdc
    const Vmag = Math.sqrt(state!.Vd * state!.Vd + state!.Vq * state!.Vq);
    expect(Vmag).toBeLessThanOrEqual(lowVdc.Vdc);
  });
});
