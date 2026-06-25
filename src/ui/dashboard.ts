import { initParameterPanel } from './parameter-panel';
import { initControlBar } from './control-bar';
import { initCharts } from './charts';
import type { SimulationState, WorkerCommand, WorkerMessage, LoadProfile } from '../types';

let worker: Worker | null = null;
let isRunning = false;

function createWorker(): Worker {
  const w = new Worker(new URL('../simulation/simulation.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;
    if (msg.type === 'data') {
      updateCharts(msg.batch);
      if (msg.batch.length > 0) {
        updateStatusBar(msg.batch[msg.batch.length - 1]);
      }
    } else if (msg.type === 'status') {
      isRunning = msg.status === 'running';
      updateControlState(msg.status);
    }
  };
  return w;
}

function sendCommand(cmd: WorkerCommand): void {
  if (!worker) {
    worker = createWorker();
  }
  worker.postMessage(cmd);
}

let updateCharts: (batch: SimulationState[]) => void = () => {};
let updateControlState: (status: 'running' | 'paused' | 'stopped') => void = () => {};

function updateStatusBar(state: SimulationState): void {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  const statusClass = isRunning ? 'status-running' : '';
  const statusText = isRunning ? 'Running' : 'Idle';
  bar.innerHTML =
    `<span class="${statusClass}">Status: ${statusText}</span>` +
    `<span>t = ${state.t.toFixed(4)} s</span>` +
    `<span>\u03C9m = ${state.omega_m.toFixed(2)} rad/s</span>` +
    `<span>Te = ${state.Te.toFixed(3)} N\u00B7m</span>` +
    `<span>id = ${state.id.toFixed(3)} A</span>` +
    `<span>iq = ${state.iq.toFixed(3)} A</span>` +
    `<span>fe = ${state.fe.toFixed(2)} Hz</span>` +
    `<span>Irms = ${state.I_rms.toFixed(3)} Arms</span>` +
    `<span>Pmech = ${state.P_mech.toFixed(2)} W</span>` +
    `<span>EMF = ${state.EMF.toFixed(2)} V</span>` +
    `<span>m = ${state.modulation_index.toFixed(3)}</span>`;
}

export function initDashboard(): { mountCharts: () => void } {
  const { getMotorParams, getControllerParams, getInverterParams } = initParameterPanel((preset) => {
    sendCommand({ type: 'updateMotorParams', motorParams: preset.params });
    sendCommand({ type: 'updateControllerParams', controllerParams: preset.controllerParams });
    sendCommand({ type: 'updateInverterParams', inverterParams: preset.inverterParams });
  });
  const { getLoadProfile, getSpeedRef } = initControlBar({
    onStart: () => {
      sendCommand({
        type: 'start',
        motorParams: getMotorParams(),
        controllerParams: getControllerParams(),
        inverterParams: getInverterParams(),
        loadProfile: getLoadProfile(),
        speedRef: getSpeedRef(),
      });
    },
    onPause: () => sendCommand({ type: 'pause' }),
    onResume: () => sendCommand({ type: 'resume' }),
    onStop: () => sendCommand({ type: 'stop' }),
    onSpeedChange: (speed: number) => sendCommand({ type: 'setSimSpeed', speed }),
    onSpeedRefChange: (ref: number) => sendCommand({ type: 'updateSpeedRef', speedRef: ref }),
    onLoadProfileChange: (lp: LoadProfile) => sendCommand({ type: 'updateLoadProfile', loadProfile: lp }),
  });

  updateControlState = (status) => {
    const bar = document.getElementById('status-bar');
    if (bar && status === 'stopped') {
      bar.innerHTML = '<span>Status: Idle</span>';
    }
  };

  // Charts mount lazily on the simulation view's first show, so uPlot reads a
  // sized (visible) container. Everything above is wired eagerly.
  return {
    mountCharts: () => {
      const charts = initCharts();
      updateCharts = charts.pushBatch;
    },
  };
}
