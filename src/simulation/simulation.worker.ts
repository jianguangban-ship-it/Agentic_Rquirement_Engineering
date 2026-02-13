import type { WorkerCommand, WorkerMessage, SimulationState, MotorParams, ControllerParams, LoadProfile } from '../types';
import { createSimulationEngine, type SimulationEngine } from './simulation-engine';

let engine: SimulationEngine | null = null;
let running = false;
let animationFrameId: number | null = null;
let simSpeed = 1; // Multiplier: how many sim-seconds per wall-second

// Data decimation: only send every Nth sample to UI
const DECIMATION = 10;

const DT = 1e-5; // 10 μs

function postStatus(status: 'running' | 'paused' | 'stopped'): void {
  const msg: WorkerMessage = { type: 'status', status };
  self.postMessage(msg);
}

function postData(batch: SimulationState[]): void {
  const msg: WorkerMessage = { type: 'data', batch };
  self.postMessage(msg);
}

function runLoop(): void {
  if (!running || !engine) return;

  // Compute how many steps to run per animation frame (~16ms)
  // At DT=10μs, 1 wall-second = 100,000 steps at 1x speed
  const stepsPerFrame = Math.round((simSpeed * 16e-3) / DT);
  const totalSteps = Math.max(1, stepsPerFrame);

  const batch: SimulationState[] = [];
  let sampleCounter = 0;

  for (let i = 0; i < totalSteps; i++) {
    const state = engine.step();
    sampleCounter++;
    if (sampleCounter >= DECIMATION) {
      batch.push(state);
      sampleCounter = 0;
    }
  }

  if (batch.length > 0) {
    postData(batch);
  }

  animationFrameId = self.requestAnimationFrame
    ? self.requestAnimationFrame(runLoop)
    : (setTimeout(runLoop, 16) as unknown as number);
}

function startSimulation(
  motorParams: MotorParams,
  controllerParams: ControllerParams,
  loadProfile: LoadProfile,
  speedRef: number
): void {
  engine = createSimulationEngine(motorParams, controllerParams, loadProfile, speedRef, DT);
  running = true;
  postStatus('running');
  runLoop();
}

function stopSimulation(): void {
  running = false;
  if (animationFrameId !== null) {
    if (self.cancelAnimationFrame) {
      self.cancelAnimationFrame(animationFrameId);
    } else {
      clearTimeout(animationFrameId);
    }
    animationFrameId = null;
  }
  engine?.reset();
  engine = null;
  postStatus('stopped');
}

self.onmessage = (e: MessageEvent<WorkerCommand>) => {
  const cmd = e.data;

  switch (cmd.type) {
    case 'start':
      stopSimulation();
      startSimulation(cmd.motorParams, cmd.controllerParams, cmd.loadProfile, cmd.speedRef);
      break;

    case 'pause':
      running = false;
      postStatus('paused');
      break;

    case 'resume':
      if (engine) {
        running = true;
        postStatus('running');
        runLoop();
      }
      break;

    case 'stop':
      stopSimulation();
      break;

    case 'updateMotorParams':
      engine?.setMotorParams(cmd.motorParams);
      break;

    case 'updateControllerParams':
      engine?.setControllerParams(cmd.controllerParams);
      break;

    case 'updateLoadProfile':
      engine?.setLoadProfile(cmd.loadProfile);
      break;

    case 'updateSpeedRef':
      engine?.setSpeedRef(cmd.speedRef);
      break;

    case 'setSimSpeed':
      simSpeed = cmd.speed;
      break;
  }
};
