export const APP_VERSION = '1.5.0';

export const DEFAULT_CATEGORIES = [
  'General',
  '3D/WebGL',
  'Games',
  'Dashboards',
  'Visualization',
  'UI Components',
  'Single-file Apps',
  'Creative/Art',
  'Forms & Inputs',
  'Simulation',
];

export const DEFAULT_COLLECTIONS = [
  { name: 'General HTML Benchmark', description: 'Standard benchmark suite for general web page generation.' },
  { name: '3D / WebGL & Canvas', description: 'Tests for complex WebGL, Three.js, shaders, and 2D canvas.' },
  { name: 'Interactive Games', description: 'Standalone interactive games (Pong, Breakout, Roguelike, Physics).' },
  { name: 'Data Visualization & Dashboards', description: 'High-density charts, dashboards, and metrics interfaces.' },
  { name: 'UI Components & Design Systems', description: 'Polished design components, navigation, modals, and design patterns.' },
  { name: 'Single-File Applications', description: 'Full utility applications contained in a single HTML document.' },
];

export const VIEWPORT_PRESETS = [
  { name: 'Responsive (Fit)', width: '100%', height: '100%', isFluid: true },
  { name: '1920 × 1080 (FHD)', width: '1920px', height: '1080px', isFluid: false },
  { name: '1440 × 900 (Laptop)', width: '1440px', height: '900px', isFluid: false },
  { name: '1280 × 720 (HD)', width: '1280px', height: '720px', isFluid: false },
  { name: '1024 × 768 (Tablet Landscape)', width: '1024px', height: '768px', isFluid: false },
  { name: '768 × 1024 (Tablet Portrait)', width: '768px', height: '1024px', isFluid: false },
  { name: '390 × 844 (Mobile Phone)', width: '390px', height: '844px', isFluid: false },
];
