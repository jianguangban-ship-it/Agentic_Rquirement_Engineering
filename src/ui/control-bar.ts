import type { LoadProfile, LoadProfileType } from '../types';

export interface ControlBarCallbacks {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onSpeedRefChange: (ref: number) => void;
  onLoadProfileChange: (lp: LoadProfile) => void;
}

export function initControlBar(callbacks: ControlBarCallbacks): {
  getLoadProfile: () => LoadProfile;
  getSpeedRef: () => number;
} {
  const bar = document.getElementById('control-bar');
  if (!bar) throw new Error('Control bar element not found');

  let isPaused = false;

  // ── Start button ──
  const startBtn = document.createElement('button');
  startBtn.className = 'btn btn--start';
  startBtn.textContent = 'Start';

  // ── Pause button ──
  const pauseBtn = document.createElement('button');
  pauseBtn.className = 'btn';
  pauseBtn.textContent = 'Pause';
  pauseBtn.disabled = true;

  // ── Reset button ──
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn';
  resetBtn.textContent = 'Reset';
  resetBtn.disabled = true;

  startBtn.addEventListener('click', () => {
    callbacks.onStart();
    isPaused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
  });

  pauseBtn.addEventListener('click', () => {
    if (isPaused) {
      callbacks.onResume();
      pauseBtn.textContent = 'Pause';
      isPaused = false;
    } else {
      callbacks.onPause();
      pauseBtn.textContent = 'Resume';
      isPaused = true;
    }
  });

  resetBtn.addEventListener('click', () => {
    callbacks.onStop();
    isPaused = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = true;
    pauseBtn.textContent = 'Pause';
  });

  // ── Separator ──
  const sep1 = document.createElement('div');
  sep1.className = 'separator';

  // ── Simulation speed ──
  const speedGroup = document.createElement('div');
  speedGroup.className = 'control-group';
  const speedLabel = document.createElement('label');
  speedLabel.textContent = 'Sim Speed:';
  const speedSelect = document.createElement('select');
  speedSelect.id = 'sim-speed';
  [
    { value: '0.1', text: '0.1x' },
    { value: '0.5', text: '0.5x' },
    { value: '1', text: '1x' },
    { value: '2', text: '2x' },
    { value: '5', text: '5x' },
    { value: '10', text: '10x' },
  ].forEach(({ value, text }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    if (value === '1') opt.selected = true;
    speedSelect.appendChild(opt);
  });
  speedSelect.addEventListener('change', () => {
    callbacks.onSpeedChange(parseFloat(speedSelect.value));
  });
  speedGroup.appendChild(speedLabel);
  speedGroup.appendChild(speedSelect);

  // ── Separator ──
  const sep2 = document.createElement('div');
  sep2.className = 'separator';

  // ── Speed reference ──
  const refGroup = document.createElement('div');
  refGroup.className = 'control-group';
  const refLabel = document.createElement('label');
  refLabel.textContent = 'Speed Ref (rad/s):';
  const refInput = document.createElement('input');
  refInput.type = 'number';
  refInput.id = 'speed-ref';
  refInput.value = '100';
  refInput.step = '10';
  refInput.style.width = '80px';
  refInput.addEventListener('change', () => {
    callbacks.onSpeedRefChange(parseFloat(refInput.value) || 0);
  });
  refGroup.appendChild(refLabel);
  refGroup.appendChild(refInput);

  // ── Separator ──
  const sep3 = document.createElement('div');
  sep3.className = 'separator';

  // ── Load torque profile ──
  const loadGroup = document.createElement('div');
  loadGroup.className = 'control-group';
  const loadLabel = document.createElement('label');
  loadLabel.textContent = 'Load:';
  const loadTypeSelect = document.createElement('select');
  loadTypeSelect.id = 'load-type';
  ['constant', 'step', 'ramp'].forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    loadTypeSelect.appendChild(opt);
  });

  const loadValueInput = document.createElement('input');
  loadValueInput.type = 'number';
  loadValueInput.id = 'load-value';
  loadValueInput.value = '0.5';
  loadValueInput.step = '0.1';
  loadValueInput.style.width = '60px';
  loadValueInput.title = 'Load torque (N\u00B7m)';

  const loadTimeLabel = document.createElement('label');
  loadTimeLabel.textContent = 'at:';
  const loadTimeInput = document.createElement('input');
  loadTimeInput.type = 'number';
  loadTimeInput.id = 'load-time';
  loadTimeInput.value = '0.5';
  loadTimeInput.step = '0.1';
  loadTimeInput.style.width = '60px';
  loadTimeInput.title = 'Apply time (s)';
  const loadTimeUnit = document.createElement('label');
  loadTimeUnit.textContent = 's';

  const emitLoadChange = () => {
    callbacks.onLoadProfileChange(getLoadProfile());
  };
  loadTypeSelect.addEventListener('change', emitLoadChange);
  loadValueInput.addEventListener('change', emitLoadChange);
  loadTimeInput.addEventListener('change', emitLoadChange);

  loadGroup.appendChild(loadLabel);
  loadGroup.appendChild(loadTypeSelect);
  loadGroup.appendChild(loadValueInput);
  loadGroup.appendChild(loadTimeLabel);
  loadGroup.appendChild(loadTimeInput);
  loadGroup.appendChild(loadTimeUnit);

  // ── Assemble ──
  bar.appendChild(startBtn);
  bar.appendChild(pauseBtn);
  bar.appendChild(resetBtn);
  bar.appendChild(sep1);
  bar.appendChild(speedGroup);
  bar.appendChild(sep2);
  bar.appendChild(refGroup);
  bar.appendChild(sep3);
  bar.appendChild(loadGroup);

  function getLoadProfile(): LoadProfile {
    return {
      type: loadTypeSelect.value as LoadProfileType,
      value: parseFloat(loadValueInput.value) || 0,
      applyTime: parseFloat(loadTimeInput.value) || 0,
      rampDuration: 0.5,
    };
  }

  function getSpeedRef(): number {
    return parseFloat(refInput.value) || 0;
  }

  return { getLoadProfile, getSpeedRef };
}
