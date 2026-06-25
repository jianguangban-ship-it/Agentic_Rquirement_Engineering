import { initRouter } from './ui/router';
import { initDashboard } from './ui/dashboard';

document.addEventListener('DOMContentLoaded', () => {
  // Wire the worker, parameter panel, and control bar eagerly so the
  // configuration (now on its own page) is ready before Start, regardless of
  // which route the user lands on. Charts mount lazily on first show.
  const dash = initDashboard();
  initRouter([
    { id: 'simulation', onFirstShow: dash.mountCharts },
    { id: 'parameter-configuration' },
  ]);
});
