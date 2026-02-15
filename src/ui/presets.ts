import type { MotorPreset } from '../types';

export const MOTOR_PRESETS: MotorPreset[] = [
  {
    name: 'Small SPMSM (100W)',
    motorType: 'SPMSM',
    params: {
      Rs: 2.875,
      Ld: 0.0085,
      Lq: 0.0085,
      psi_f: 0.175,
      p: 4,
      J: 0.0008,
      B: 0.001,
    },
    controllerParams: {
      dAxis: { Kp: 20, Ki: 1000 },
      qAxis: { Kp: 20, Ki: 1000 },
      speed: { Kp: 0.5, Ki: 5 },
      strategy: 'id_zero',
    },
    inverterParams: { Vdc: 48, Idc_max: 10 },
  },
  {
    name: 'Medium SPMSM (1kW)',
    motorType: 'SPMSM',
    params: {
      Rs: 0.958,
      Ld: 0.00525,
      Lq: 0.00525,
      psi_f: 0.1827,
      p: 3,
      J: 0.003,
      B: 0.001,
    },
    controllerParams: {
      dAxis: { Kp: 15, Ki: 800 },
      qAxis: { Kp: 15, Ki: 800 },
      speed: { Kp: 1.0, Ki: 10 },
      strategy: 'id_zero',
    },
    inverterParams: { Vdc: 200, Idc_max: 15 },
  },
  {
    name: 'Industrial IPMSM (5kW)',
    motorType: 'IPMSM',
    params: {
      Rs: 0.35,
      Ld: 0.004,
      Lq: 0.008,
      psi_f: 0.32,
      p: 4,
      J: 0.01,
      B: 0.002,
    },
    controllerParams: {
      dAxis: { Kp: 10, Ki: 500 },
      qAxis: { Kp: 10, Ki: 500 },
      speed: { Kp: 2.0, Ki: 20 },
      strategy: 'mtpa',
    },
    inverterParams: { Vdc: 400, Idc_max: 25 },
  },
  {
    name: 'EV Traction IPMSM (50kW)',
    motorType: 'IPMSM',
    params: {
      Rs: 0.015,
      Ld: 0.0003,
      Lq: 0.0007,
      psi_f: 0.08,
      p: 4,
      J: 0.05,
      B: 0.005,
    },
    controllerParams: {
      dAxis: { Kp: 5, Ki: 200 },
      qAxis: { Kp: 5, Ki: 200 },
      speed: { Kp: 5.0, Ki: 50 },
      strategy: 'mtpa',
    },
    inverterParams: { Vdc: 600, Idc_max: 150 },
  },
];

export function initPresets(onSelect: (preset: MotorPreset) => void): void {
  const select = document.getElementById('preset-select') as HTMLSelectElement;
  if (!select) return;

  // Populate options
  MOTOR_PRESETS.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = preset.name;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const idx = parseInt(select.value, 10);
    if (!isNaN(idx) && MOTOR_PRESETS[idx]) {
      onSelect(MOTOR_PRESETS[idx]);
      // Update the parameter panel inputs
      document.dispatchEvent(new CustomEvent('preset-applied', { detail: MOTOR_PRESETS[idx] }));
    }
  });
}
