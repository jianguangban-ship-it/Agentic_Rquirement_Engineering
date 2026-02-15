import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { SimulationState } from '../types';

const MAX_POINTS = 5000; // Ring buffer size

interface ChartInstance {
  plot: uPlot;
  data: uPlot.AlignedData;
}

const COLORS = {
  red: '#e94560',
  green: '#4ecdc4',
  blue: '#5b86e5',
  yellow: '#f7dc6f',
  orange: '#f39c12',
  purple: '#9b59b6',
};

function createRingBuffer(seriesCount: number): uPlot.AlignedData {
  const data: number[][] = [];
  for (let i = 0; i < seriesCount; i++) {
    data.push([]);
  }
  return data as uPlot.AlignedData;
}

function pushToRingBuffer(data: uPlot.AlignedData, values: number[]): void {
  for (let i = 0; i < data.length; i++) {
    (data[i] as number[]).push(values[i]);
    if ((data[i] as number[]).length > MAX_POINTS) {
      (data[i] as number[]).shift();
    }
  }
}

function getChartSize(container: HTMLElement): { width: number; height: number } {
  const rect = container.getBoundingClientRect();
  return { width: Math.max(rect.width, 100), height: Math.max(rect.height, 80) };
}

function baseOpts(
  container: HTMLElement,
  seriesConfig: uPlot.Series[],
  xLabel: string,
  yLabel: string,
  xSeriesLabel: string = 'Time (s)',
): uPlot.Options {
  const size = getChartSize(container);
  return {
    width: size.width,
    height: size.height,
    cursor: { show: true, drag: { x: true, y: true } },
    scales: {
      x: { time: false },
    },
    axes: [
      {
        label: xLabel,
        stroke: '#a0a0b0',
        grid: { stroke: 'rgba(255,255,255,0.06)' },
        ticks: { stroke: 'rgba(255,255,255,0.1)' },
        font: '10px monospace',
        labelFont: '11px monospace',
      },
      {
        label: yLabel,
        stroke: '#a0a0b0',
        grid: { stroke: 'rgba(255,255,255,0.06)' },
        ticks: { stroke: 'rgba(255,255,255,0.1)' },
        font: '10px monospace',
        labelFont: '11px monospace',
      },
    ],
    series: [
      { label: xSeriesLabel },
      ...seriesConfig,
    ],
  };
}

function createChart(
  containerId: string,
  seriesConfig: uPlot.Series[],
  xLabel: string,
  yLabel: string,
  xSeriesLabel: string = 'Time (s)',
): ChartInstance | null {
  const panel = document.getElementById(containerId);
  if (!panel) return null;
  const container = panel.querySelector('.chart-container') as HTMLElement;
  if (!container) return null;

  const data = createRingBuffer(seriesConfig.length + 1); // +1 for time axis
  const opts = baseOpts(container, seriesConfig, xLabel, yLabel, xSeriesLabel);
  const plot = new uPlot(opts, data, container);

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    const size = getChartSize(container);
    plot.setSize(size);
  });
  resizeObserver.observe(container);

  return { plot, data };
}

export function initCharts(): {
  pushBatch: (batch: SimulationState[]) => void;
  reset: () => void;
} {
  const phaseCurrents = createChart('chart-phase-currents', [
    { label: 'ia', stroke: COLORS.red, width: 1.5 },
    { label: 'ib', stroke: COLORS.green, width: 1.5 },
    { label: 'ic', stroke: COLORS.blue, width: 1.5 },
  ], 'Time (s)', 'Current (A)');

  const dqCurrents = createChart('chart-dq-currents', [
    { label: 'id', stroke: COLORS.red, width: 1.5 },
    { label: 'iq', stroke: COLORS.blue, width: 1.5 },
  ], 'Time (s)', 'Current (A)');

  const torque = createChart('chart-torque', [
    { label: 'Te', stroke: COLORS.orange, width: 1.5 },
    { label: 'TL', stroke: COLORS.purple, width: 1.5 },
  ], 'Time (s)', 'Torque (N\u00B7m)');

  const speed = createChart('chart-speed', [
    { label: '\u03C9m', stroke: COLORS.green, width: 1.5 },
  ], 'Time (s)', 'Speed (rad/s)');

  const voltages = createChart('chart-voltages', [
    { label: 'Vd', stroke: COLORS.red, width: 1.5 },
    { label: 'Vq', stroke: COLORS.blue, width: 1.5 },
  ], 'Time (s)', 'Voltage (V)');

  const dqTrajectory = createChart('chart-dq-trajectory', [
    { label: 'iq vs id', stroke: COLORS.yellow, width: 1.5 },
  ], 'id (A)', 'iq (A)', 'id (A)');

  function pushBatch(batch: SimulationState[]): void {
    for (const s of batch) {
      if (phaseCurrents) pushToRingBuffer(phaseCurrents.data, [s.t, s.ia, s.ib, s.ic]);
      if (dqCurrents) pushToRingBuffer(dqCurrents.data, [s.t, s.id, s.iq]);
      if (torque) pushToRingBuffer(torque.data, [s.t, s.Te, s.TL]);
      if (speed) pushToRingBuffer(speed.data, [s.t, s.omega_m]);
      if (voltages) pushToRingBuffer(voltages.data, [s.t, s.Vd, s.Vq]);
      if (dqTrajectory) pushToRingBuffer(dqTrajectory.data, [s.id, s.iq]);
    }

    // Redraw all charts
    phaseCurrents?.plot.setData(phaseCurrents.data);
    dqCurrents?.plot.setData(dqCurrents.data);
    torque?.plot.setData(torque.data);
    speed?.plot.setData(speed.data);
    voltages?.plot.setData(voltages.data);
    dqTrajectory?.plot.setData(dqTrajectory.data);
  }

  function reset(): void {
    [phaseCurrents, dqCurrents, torque, speed, voltages, dqTrajectory].forEach((chart) => {
      if (!chart) return;
      for (let i = 0; i < chart.data.length; i++) {
        (chart.data[i] as number[]).length = 0;
      }
      chart.plot.setData(chart.data);
    });
  }

  return { pushBatch, reset };
}
