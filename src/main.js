import './style.css';
import { initHelpers } from './ui/helpers.js';
import { renderLanding, renderBasicInfo, renderSportSelect, renderActivityIntensity } from './ui/steps.js';
import { renderGates, renderGate1Categories, renderGate1Questions, renderGate2Questions, renderGate3Questions } from './ui/gates.js';
import { renderResult } from './ui/result.js';

const app = document.getElementById('app');
const state = {
  step: 0, age: '', sex: '', heightCm: '', weightKg: '',
  sport: '', activityLevel: '', intensity: '', waterConfidence: '',
  gate1Answer: '', gate2Answer: '', gate3Answer: '',
  gate1Categories: [], gate1Answers: {}, gate2Answers: {},
  gate3Answers: {}, freeText: '', currentDomainIndex: 0,
};

const RENDERERS = [
  renderLanding, renderBasicInfo, renderSportSelect, renderActivityIntensity,
  renderGates, renderGate1Categories, renderGate1Questions,
  renderGate2Questions, renderGate3Questions, renderResult,
];

function render() { (RENDERERS[state.step] || renderResult)(app, state, render); }
initHelpers(state, render);
render();
