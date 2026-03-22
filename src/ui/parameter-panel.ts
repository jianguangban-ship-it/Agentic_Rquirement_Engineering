import type { MotorParams, ControllerParams, InverterParams, ControlStrategy, MotorPreset, MotorType } from '../types';
import { MOTOR_PRESETS } from './presets';

interface ParamField {
  key: string;
  label: string;
  unit: string;
  defaultValue: number;
  step?: string;
}

const MOTOR_FIELDS: ParamField[] = [
  { key: 'Rs', label: 'Rs', unit: '\u03A9', defaultValue: 2.875, step: '0.001' },
  { key: 'Ld', label: 'Ld', unit: 'H', defaultValue: 0.0085, step: '0.0001' },
  { key: 'Lq', label: 'Lq', unit: 'H', defaultValue: 0.0085, step: '0.0001' },
  { key: 'psi_f', label: '\u03C8f', unit: 'Wb', defaultValue: 0.175, step: '0.001' },
  { key: 'p', label: 'p', unit: '', defaultValue: 4, step: '1' },
  { key: 'J', label: 'J', unit: 'kg\u00B7m\u00B2', defaultValue: 0.0008, step: '0.0001' },
  { key: 'B', label: 'B', unit: 'N\u00B7m\u00B7s', defaultValue: 0.001, step: '0.0001' },
];

const CONTROLLER_FIELDS: { group: string; fields: ParamField[] }[] = [
  {
    group: 'd-axis current',
    fields: [
      { key: 'dAxis.Kp', label: 'Kp_d', unit: '', defaultValue: 20, step: '0.1' },
      { key: 'dAxis.Ki', label: 'Ki_d', unit: '', defaultValue: 1000, step: '1' },
    ],
  },
  {
    group: 'q-axis current',
    fields: [
      { key: 'qAxis.Kp', label: 'Kp_q', unit: '', defaultValue: 20, step: '0.1' },
      { key: 'qAxis.Ki', label: 'Ki_q', unit: '', defaultValue: 1000, step: '1' },
    ],
  },
  {
    group: 'Speed loop',
    fields: [
      { key: 'speed.Kp', label: 'Kp_s', unit: '', defaultValue: 0.5, step: '0.01' },
      { key: 'speed.Ki', label: 'Ki_s', unit: '', defaultValue: 5, step: '0.1' },
    ],
  },
];

function createParamRow(field: ParamField): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'param-row';

  const label = document.createElement('label');
  label.textContent = field.label;
  label.htmlFor = `param-${field.key}`;

  const input = document.createElement('input');
  input.type = 'number';
  input.id = `param-${field.key}`;
  input.value = String(field.defaultValue);
  input.step = field.step ?? 'any';

  const unit = document.createElement('span');
  unit.className = 'unit';
  unit.textContent = field.unit;

  row.appendChild(label);
  row.appendChild(input);
  row.appendChild(unit);
  return row;
}

function getInputValue(key: string): number {
  const input = document.getElementById(`param-${key}`) as HTMLInputElement;
  return input ? parseFloat(input.value) || 0 : 0;
}

function setInputValue(key: string, value: number): void {
  const input = document.getElementById(`param-${key}`) as HTMLInputElement;
  if (input) input.value = String(value);
}

const INVERTER_FIELDS: ParamField[] = [
  { key: 'Vdc', label: 'Vdc', unit: 'V', defaultValue: 200, step: '1' },
  { key: 'Idc_max', label: 'Idc', unit: 'A', defaultValue: 50, step: '1' },
];

export function initParameterPanel(onPresetSelect: (preset: MotorPreset) => void): {
  getMotorParams: () => MotorParams;
  getControllerParams: () => ControllerParams;
  getInverterParams: () => InverterParams;
} {
  const panel = document.getElementById('parameter-panel');
  if (!panel) throw new Error('Parameter panel element not found');

  // Current motor type — drives strategy constraints and Ld/Lq sync
  let currentMotorType: MotorType = 'SPMSM';

  // ── Motor Parameters section ──
  const motorTitle = document.createElement('h2');
  motorTitle.textContent = 'Motor Parameters';
  panel.appendChild(motorTitle);

  // Preset selector (replaces old Type dropdown)
  const presetRow = document.createElement('div');
  presetRow.className = 'param-row';
  const presetLabel = document.createElement('label');
  presetLabel.textContent = 'Type';
  const presetSelect = document.createElement('select');
  presetSelect.id = 'param-preset';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Import Motor Parameters';
  presetSelect.appendChild(defaultOpt);
  MOTOR_PRESETS.forEach((preset, index) => {
    const opt = document.createElement('option');
    opt.value = String(index);
    opt.textContent = preset.name;
    presetSelect.appendChild(opt);
  });
  presetRow.appendChild(presetLabel);
  presetRow.appendChild(presetSelect);
  presetRow.appendChild(document.createElement('span')); // empty unit
  panel.appendChild(presetRow);

  const motorGroup = document.createElement('div');
  motorGroup.className = 'param-group';
  MOTOR_FIELDS.forEach((field) => {
    motorGroup.appendChild(createParamRow(field));
  });
  panel.appendChild(motorGroup);

  // ── Ld/Lq sync for SPMSM ──
  const ldInput = document.getElementById('param-Ld') as HTMLInputElement;
  const lqInput = document.getElementById('param-Lq') as HTMLInputElement;

  ldInput.addEventListener('input', () => {
    if (currentMotorType === 'SPMSM') {
      lqInput.value = ldInput.value;
    }
  });
  lqInput.addEventListener('input', () => {
    if (currentMotorType === 'SPMSM') {
      ldInput.value = lqInput.value;
    }
  });

  // ── Controller Gains section ──
  const ctrlTitle = document.createElement('h2');
  ctrlTitle.textContent = 'Controller Gains';
  panel.appendChild(ctrlTitle);

  CONTROLLER_FIELDS.forEach(({ fields }) => {
    const group = document.createElement('div');
    group.className = 'param-group';
    fields.forEach((field) => {
      group.appendChild(createParamRow(field));
    });
    panel.appendChild(group);
  });

  // ── Control Strategy section ──
  const stratTitle = document.createElement('h2');
  stratTitle.textContent = 'Control Strategy';
  panel.appendChild(stratTitle);

  const stratRow = document.createElement('div');
  stratRow.className = 'param-row';
  const stratLabel = document.createElement('label');
  stratLabel.textContent = 'Mode';
  const stratSelect = document.createElement('select');
  stratSelect.id = 'param-strategy';
  const idZeroOpt = document.createElement('option');
  idZeroOpt.value = 'id_zero';
  idZeroOpt.textContent = 'id = 0';
  const mtpaOpt = document.createElement('option');
  mtpaOpt.value = 'mtpa';
  mtpaOpt.textContent = 'MTPA';
  stratSelect.appendChild(idZeroOpt);
  stratSelect.appendChild(mtpaOpt);
  stratRow.appendChild(stratLabel);
  stratRow.appendChild(stratSelect);
  stratRow.appendChild(document.createElement('span'));
  panel.appendChild(stratRow);

  // Motor type hint label (shown below strategy selector)
  const typeHint = document.createElement('div');
  typeHint.className = 'type-hint';
  typeHint.textContent = 'Import a preset to set motor type constraints';
  panel.appendChild(typeHint);

  // ── DC Bus section ──
  const dcTitle = document.createElement('h2');
  dcTitle.textContent = 'DC Bus';
  panel.appendChild(dcTitle);

  const dcGroup = document.createElement('div');
  dcGroup.className = 'param-group';
  INVERTER_FIELDS.forEach((field) => {
    dcGroup.appendChild(createParamRow(field));
  });
  panel.appendChild(dcGroup);

  // ── Motor type constraint logic ──
  function applyMotorTypeConstraints(motorType: MotorType): void {
    currentMotorType = motorType;
    if (motorType === 'SPMSM') {
      // SPMSM: Ld must equal Lq, only id=0 strategy
      mtpaOpt.disabled = true;
      stratSelect.value = 'id_zero';
      typeHint.textContent = 'SPMSM: id = 0 only (Ld = Lq)';
      // Sync Lq to Ld
      lqInput.value = ldInput.value;
    } else {
      // IPMSM: both strategies available, Ld ≠ Lq allowed
      mtpaOpt.disabled = false;
      typeHint.textContent = 'IPMSM: MTPA available (Ld ≠ Lq)';
    }
  }

  // No constraints applied initially — both strategies available until a preset is selected

  // ── Preset selection handler ──
  presetSelect.addEventListener('change', () => {
    const idx = parseInt(presetSelect.value, 10);
    if (isNaN(idx) || !MOTOR_PRESETS[idx]) return;

    const preset = MOTOR_PRESETS[idx];

    // Update motor parameter inputs
    const mp = preset.params;
    MOTOR_FIELDS.forEach((field) => {
      setInputValue(field.key, (mp as unknown as Record<string, number>)[field.key]);
    });

    // Update controller gain inputs
    const cp = preset.controllerParams;
    setInputValue('dAxis.Kp', cp.dAxis.Kp);
    setInputValue('dAxis.Ki', cp.dAxis.Ki);
    setInputValue('qAxis.Kp', cp.qAxis.Kp);
    setInputValue('qAxis.Ki', cp.qAxis.Ki);
    setInputValue('speed.Kp', cp.speed.Kp);
    setInputValue('speed.Ki', cp.speed.Ki);

    // Update inverter inputs
    if (preset.inverterParams) {
      setInputValue('Vdc', preset.inverterParams.Vdc);
      setInputValue('Idc_max', preset.inverterParams.Idc_max);
    }

    // Apply motor type constraints (this also sets strategy for SPMSM)
    applyMotorTypeConstraints(preset.motorType);

    // Set strategy from preset (for IPMSM, preset may specify mtpa)
    if (preset.motorType === 'IPMSM') {
      stratSelect.value = cp.strategy;
    }

    // Notify dashboard to send params to simulation worker
    onPresetSelect(preset);
  });

  return {
    getMotorParams: (): MotorParams => ({
      Rs: getInputValue('Rs'),
      Ld: getInputValue('Ld'),
      Lq: getInputValue('Lq'),
      psi_f: getInputValue('psi_f'),
      p: getInputValue('p'),
      J: getInputValue('J'),
      B: getInputValue('B'),
    }),
    getControllerParams: (): ControllerParams => ({
      dAxis: { Kp: getInputValue('dAxis.Kp'), Ki: getInputValue('dAxis.Ki') },
      qAxis: { Kp: getInputValue('qAxis.Kp'), Ki: getInputValue('qAxis.Ki') },
      speed: { Kp: getInputValue('speed.Kp'), Ki: getInputValue('speed.Ki') },
      strategy: stratSelect.value as ControlStrategy,
    }),
    getInverterParams: (): InverterParams => ({
      Vdc: getInputValue('Vdc'),
      Idc_max: getInputValue('Idc_max'),
    }),
  };
}
