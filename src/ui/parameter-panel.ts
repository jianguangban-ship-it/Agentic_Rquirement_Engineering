import type { MotorParams, ControllerParams, ControlStrategy, MotorPreset } from '../types';

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

export function initParameterPanel(): {
  getMotorParams: () => MotorParams;
  getControllerParams: () => ControllerParams;
} {
  const panel = document.getElementById('parameter-panel');
  if (!panel) throw new Error('Parameter panel element not found');

  // Motor parameters section
  const motorTitle = document.createElement('h2');
  motorTitle.textContent = 'Motor Parameters';
  panel.appendChild(motorTitle);

  // Motor type selector
  const typeRow = document.createElement('div');
  typeRow.className = 'param-row';
  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Type';
  const typeSelect = document.createElement('select');
  typeSelect.id = 'param-motorType';
  ['SPMSM', 'IPMSM'].forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });
  typeRow.appendChild(typeLabel);
  typeRow.appendChild(typeSelect);
  typeRow.appendChild(document.createElement('span')); // empty unit
  panel.appendChild(typeRow);

  const motorGroup = document.createElement('div');
  motorGroup.className = 'param-group';
  MOTOR_FIELDS.forEach((field) => {
    motorGroup.appendChild(createParamRow(field));
  });
  panel.appendChild(motorGroup);

  // Controller parameters section
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

  // Strategy selector
  const stratTitle = document.createElement('h2');
  stratTitle.textContent = 'Control Strategy';
  panel.appendChild(stratTitle);

  const stratRow = document.createElement('div');
  stratRow.className = 'param-row';
  const stratLabel = document.createElement('label');
  stratLabel.textContent = 'Mode';
  const stratSelect = document.createElement('select');
  stratSelect.id = 'param-strategy';
  [
    { value: 'id_zero', text: 'id = 0' },
    { value: 'mtpa', text: 'MTPA' },
  ].forEach(({ value, text }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    stratSelect.appendChild(opt);
  });
  stratRow.appendChild(stratLabel);
  stratRow.appendChild(stratSelect);
  stratRow.appendChild(document.createElement('span'));
  panel.appendChild(stratRow);

  // Listen for preset application
  document.addEventListener('preset-applied', ((e: CustomEvent<MotorPreset>) => {
    const preset = e.detail;
    const mp = preset.params;
    MOTOR_FIELDS.forEach((field) => {
      setInputValue(field.key, (mp as unknown as Record<string, number>)[field.key]);
    });
    const cp = preset.controllerParams;
    setInputValue('dAxis.Kp', cp.dAxis.Kp);
    setInputValue('dAxis.Ki', cp.dAxis.Ki);
    setInputValue('qAxis.Kp', cp.qAxis.Kp);
    setInputValue('qAxis.Ki', cp.qAxis.Ki);
    setInputValue('speed.Kp', cp.speed.Kp);
    setInputValue('speed.Ki', cp.speed.Ki);
    stratSelect.value = cp.strategy;
    typeSelect.value = preset.motorType;
  }) as EventListener);

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
  };
}
