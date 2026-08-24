/** Landing page + Basic Info step */
import { computeBMI, getBMICategory, SPORT_DEMANDS } from '../engine/ruleEngine.js';
import { header, nav, bindBack, bindGrid } from './helpers.js';

export function renderLanding(app, state, render) {
  app.innerHTML = `<div class="landing animate-in">
    <div class="landing-badge">\u2726 Evidence-Based Screening</div>
    <h1 class="landing-title">Are You Ready<br/>for <span class="gradient-text">Your Sport?</span></h1>
    <p class="landing-subtitle">A quick, intelligent screening that assesses your readiness to start a sport \u2014 powered by sports-medicine research and AI-generated guidance.</p>
    <div class="landing-features">
      <div class="landing-feature"><div class="landing-feature-icon">\u26a1</div><div class="landing-feature-label">Under 2 minutes</div></div>
      <div class="landing-feature"><div class="landing-feature-icon">\ud83d\udee1\ufe0f</div><div class="landing-feature-label">Research-backed</div></div>
      <div class="landing-feature"><div class="landing-feature-icon">\ud83e\udd16</div><div class="landing-feature-label">AI-powered insights</div></div>
    </div>
    <button class="btn btn-primary btn-lg" id="start-btn">Begin Screening \u2192</button>
    <div class="landing-disclaimer">This is a screening tool, not a medical diagnosis. It helps you make an informed decision about starting a sport, using principles from sports medicine bodies worldwide.</div>
  </div>`;
  document.getElementById('start-btn').addEventListener('click', () => { state.step = 1; render(); });
}

export function renderBasicInfo(app, state, render) {
  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header"><div class="step-badge">About You</div>
      <h2 class="step-title">Let\u2019s start with the basics</h2>
      <p class="step-description">This helps us understand your baseline profile. All fields are required.</p></div>
    <div class="form-group"><label class="form-label">Age</label>
      <input type="number" class="form-input" id="inp-age" placeholder="e.g. 28" min="5" max="120" value="${state.age}"></div>
    <div class="form-group"><label class="form-label">Biological Sex</label>
      <p class="form-hint">Used for physiological risk calculation only</p>
      <div class="option-grid cols-2" id="sex-grid">
        <div class="option-card ${state.sex==='male'?'selected':''}" data-val="male"><span class="option-card-title">Male</span></div>
        <div class="option-card ${state.sex==='female'?'selected':''}" data-val="female"><span class="option-card-title">Female</span></div>
      </div></div>
    <div class="form-group"><label class="form-label">Height & Weight</label>
      <div class="input-row">
        <input type="number" class="form-input" id="inp-height" placeholder="Height (cm)" min="50" max="250" value="${state.heightCm}">
        <input type="number" class="form-input" id="inp-weight" placeholder="Weight (kg)" min="10" max="300" value="${state.weightKg}">
      </div>
      <div class="bmi-display" id="bmi-display"><span>BMI: </span><span class="bmi-value" id="bmi-val">\u2014</span><span class="bmi-category" id="bmi-cat"></span></div></div>
    ${nav(false, 'Continue', true)}
  </div></div>`;

  const ageEl = document.getElementById('inp-age'), hEl = document.getElementById('inp-height'), wEl = document.getElementById('inp-weight');
  const bmiDisp = document.getElementById('bmi-display'), bmiVal = document.getElementById('bmi-val'), bmiCat = document.getElementById('bmi-cat');

  bindGrid('sex-grid', 'sex', validate);

  function updateBMI() {
    const bmi = computeBMI(hEl.value, wEl.value);
    if (bmi > 0 && bmi < 100) {
      bmiVal.textContent = bmi.toFixed(1);
      const cat = getBMICategory(bmi);
      bmiCat.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      bmiCat.className = 'bmi-category bmi-' + cat;
      bmiDisp.classList.add('visible');
    } else bmiDisp.classList.remove('visible');
  }
  function validate() {
    const ok = parseInt(ageEl.value) >= 5 && parseInt(ageEl.value) <= 120 && state.sex && parseFloat(hEl.value) > 0 && parseFloat(wEl.value) > 0;
    document.getElementById('next-btn').disabled = !ok;
  }
  [ageEl, hEl, wEl].forEach(el => el.addEventListener('input', () => { updateBMI(); validate(); }));
  updateBMI(); validate();
  document.getElementById('next-btn').addEventListener('click', () => {
    state.age = ageEl.value; state.heightCm = hEl.value; state.weightKg = wEl.value;
    state.step = 2; render();
  });
}

export function renderSportSelect(app, state, render) {
  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header"><div class="step-badge">Sport Selection</div>
      <h2 class="step-title">Which sport interests you?</h2>
      <p class="step-description">Pick one sport \u2014 we\u2019ll tailor the screening to its specific demands.</p></div>
    <div class="option-grid cols-2" id="sport-grid">
      ${Object.entries(SPORT_DEMANDS).map(([k,v]) => `
        <div class="option-card sport-card ${state.sport===k?'selected':''}" data-val="${k}">
          <span class="option-card-icon">${v.icon}</span><span class="option-card-title">${v.label}</span>
        </div>`).join('')}
    </div>
    ${nav(true, 'Continue', !state.sport)}
  </div></div>`;
  bindGrid('sport-grid', 'sport', () => { document.getElementById('next-btn').disabled = false; });
  document.getElementById('next-btn').addEventListener('click', () => { state.step = 3; render(); });
  bindBack();
}

export function renderActivityIntensity(app, state, render) {
  const showWater = state.sport === 'swimming';
  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header"><div class="step-badge">Your Lifestyle</div>
      <h2 class="step-title">Your current lifestyle</h2>
      <p class="step-description">This helps us calibrate the screening to where you are now.</p></div>
    <div class="form-group"><label class="form-label">Current Activity Level</label>
      <div class="option-grid" id="activity-grid">
        <div class="option-card ${state.activityLevel==='regular'?'selected':''}" data-val="regular">
          <span class="option-card-icon">\ud83c\udfc3</span><span class="option-card-title">Regular</span><span class="option-card-desc">3 or more times per week</span></div>
        <div class="option-card ${state.activityLevel==='light'?'selected':''}" data-val="light">
          <span class="option-card-icon">\ud83d\udeb6</span><span class="option-card-title">Light</span><span class="option-card-desc">1-2 times per week</span></div>
        <div class="option-card ${state.activityLevel==='sedentary'?'selected':''}" data-val="sedentary">
          <span class="option-card-icon">\ud83e\ude91</span><span class="option-card-title">Sedentary</span><span class="option-card-desc">Rarely active</span></div>
      </div></div>
    <div class="form-group"><label class="form-label">Target Intensity</label>
      <div class="option-grid cols-2" id="intensity-grid">
        <div class="option-card ${state.intensity==='recreational'?'selected':''}" data-val="recreational">
          <span class="option-card-icon">\ud83d\ude0a</span><span class="option-card-title">Recreational</span><span class="option-card-desc">Casual play, fun & fitness</span></div>
        <div class="option-card ${state.intensity==='competitive'?'selected':''}" data-val="competitive">
          <span class="option-card-icon">\ud83c\udfc6</span><span class="option-card-title">Competitive</span><span class="option-card-desc">Structured training, matches</span></div>
      </div></div>
    ${showWater ? `<div class="form-group"><label class="form-label">Water Confidence</label>
      <div class="option-grid cols-2" id="water-grid">
        <div class="option-card ${state.waterConfidence==='confident'?'selected':''}" data-val="confident">
          <span class="option-card-icon">\ud83c\udfca</span><span class="option-card-title">Confident swimmer</span></div>
        <div class="option-card ${state.waterConfidence==='beginner'?'selected':''}" data-val="beginner">
          <span class="option-card-icon">\ud83d\ude4b</span><span class="option-card-title">Beginner / learning</span></div>
      </div></div>` : ''}
    ${nav(true, 'Continue', !(state.activityLevel && state.intensity && (!showWater || state.waterConfidence)))}
  </div></div>`;

  const check = () => {
    const ok = state.activityLevel && state.intensity && (!showWater || state.waterConfidence);
    document.getElementById('next-btn').disabled = !ok;
  };
  bindGrid('activity-grid', 'activityLevel', check);
  bindGrid('intensity-grid', 'intensity', check);
  if (showWater) bindGrid('water-grid', 'waterConfidence', check);
  document.getElementById('next-btn').addEventListener('click', () => { state.step = 4; render(); });
  bindBack();
}
