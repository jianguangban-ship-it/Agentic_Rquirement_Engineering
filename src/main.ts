import { initRouter } from './ui/router';
import { initDashboard } from './ui/dashboard';

document.addEventListener('DOMContentLoaded', () => {
  initRouter([
    { id: 'simulation', onFirstShow: initDashboard },
    { id: 'parameter-configuration' },
  ]);
});
