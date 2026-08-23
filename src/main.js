import './style.css';
import { computeBMI, getBMICategory, computeFinalResult, SPORT_DEMANDS } from './engine/ruleEngine.js';
import { TIER1_CATEGORIES, TIER1_QUESTIONS, SPORT_SPECIFIC_QUESTIONS } from './questionnaire/questions.js';
import { generateResultExplanation } from './ai/gemini.js';

const app = document.getElementById('app');
const state = {
  step: 0, age: '', sex: '', heightCm: '', weightKg: '',
  sport: '', activityLevel: '', intensity: '', gateAnswer: '',
  selectedCategories: [], tier1Answers: {}, freeText: '',
  currentDomainIndex: 0,
};

const STEPS = [
  'landing','basicInfo','sportSelect','activityIntensity',
  'gate','categorySelect','tier1Questions','sportSpecific','result'
];

function totalSteps() {
  let t = 5; // landing thru gate
  if (state.gateAnswer === 'yes') t += 2; // categories + tier1
  if (state.gateAnswer === 'yes' && SPORT_SPECIFIC_QUESTIONS[state.sport]) t += 1;
  return t;
}

function progress() {
  const s = state.step;
  if (s === 0) return 0;
  return Math.min(100, Math.round((s / totalSteps()) * 100));
}

function render() {
  const stepName = STEPS[state.step] || 'result';
  const renderers = {
    landing: renderLanding, basicInfo: renderBasicInfo,
    sportSelect: renderSportSelect, activityIntensity: renderActivityIntensity,
    gate: renderGate, categorySelect: renderCategorySelect,
    tier1Questions: renderTier1, sportSpecific: renderSportSpecific,
    result: renderResult,
  };
  (renderers[stepName] || renderResult)();
}

function header() {
  if (state.step === 0) return '';
  return `<header class="header"><div class="container header-inner">
    <div class="header-logo">SR</div>
    <div><div class="header-title">Sports Readiness Adviser</div>
    <div class="header-subtitle">Pre-Participation Screening</div></div>
  </div></header>
  <div class="container"><div class="progress-wrapper">
    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${progress()}%"></div></div>
    <div class="progress-label"><span>Step ${state.step} of ${totalSteps()}</span><span>${progress()}%</span></div>
  </div></div>`;
}

function nav(backEnabled = true, nextId = 'next-btn', nextLabel = 'Continue', nextDisabled = true) {
  return `<div class="step-actions">
    ${state.step > 1 && backEnabled ? `<button class="btn btn-secondary" id="back-btn">← Back</button>` : '<div></div>'}
    <button class="btn btn-primary" id="${nextId}" ${nextDisabled ? 'disabled' : ''}>${nextLabel} →</button>
  </div>`;
}

function bindBack() {
  document.getElementById('back-btn')?.addEventListener('click', () => { state.step--; render(); });
}

// ===== LANDING =====
function renderLanding() {
  app.innerHTML = `<div class="landing animate-in">
    <div class="landing-badge">✦ Evidence-Based Screening</div>
    <h1 class="landing-title">Are You Ready<br/>for <span class="gradient-text">Your Sport?</span></h1>
    <p class="landing-subtitle">A quick, intelligent screening that assesses your readiness to start a sport — powered by sports-medicine research and AI-generated guidance.</p>
    <div class="landing-features">
      <div class="landing-feature"><div class="landing-feature-icon">⚡</div><div class="landing-feature-label">Under 2 minutes</div></div>
      <div class="landing-feature"><div class="landing-feature-icon">🛡️</div><div class="landing-feature-label">Research-backed</div></div>
      <div class="landing-feature"><div class="landing-feature-icon">🤖</div><div class="landing-feature-label">AI-powered insights</div></div>
    </div>
    <button class="btn btn-primary btn-lg" id="start-btn">Begin Screening →</button>
    <div class="landing-disclaimer">This is a screening tool, not a medical diagnosis. It helps you make an informed decision about starting a sport, using principles from sports medicine bodies worldwide.</div>
  </div>`;
  document.getElementById('start-btn').addEventListener('click', () => { state.step = 1; render(); });
}

// ===== BASIC INFO =====
function renderBasicInfo() {
  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header"><div class="step-badge">Tier 0 · Basics</div>
      <h2 class="step-title">Let's start with the basics</h2>
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
      <div class="bmi-display" id="bmi-display"><span>BMI: </span><span class="bmi-value" id="bmi-val">—</span><span class="bmi-category" id="bmi-cat"></span></div></div>
    ${nav(false, 'next-btn', 'Continue', true)}
  </div></div>`;

  const ageEl = document.getElementById('inp-age');
  const hEl = document.getElementById('inp-height');
  const wEl = document.getElementById('inp-weight');
  const bmiDisp = document.getElementById('bmi-display');
  const bmiVal = document.getElementById('bmi-val');
  const bmiCat = document.getElementById('bmi-cat');
  const nextBtn = document.getElementById('next-btn');

  document.querySelectorAll('#sex-grid .option-card').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('#sex-grid .option-card').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected'); state.sex = c.dataset.val; validate();
    });
  });

  function updateBMI() {
    const bmi = computeBMI(hEl.value, wEl.value);
    if (bmi > 0 && bmi < 100) {
      bmiVal.textContent = bmi.toFixed(1);
      const cat = getBMICategory(bmi);
      bmiCat.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      bmiCat.className = 'bmi-category bmi-' + cat;
      bmiDisp.classList.add('visible');
    } else { bmiDisp.classList.remove('visible'); }
  }

  function validate() {
    const age = parseInt(ageEl.value);
    const ok = age >= 5 && age <= 120 && state.sex && parseFloat(hEl.value) > 0 && parseFloat(wEl.value) > 0;
    nextBtn.disabled = !ok;
  }

  [ageEl, hEl, wEl].forEach(el => el.addEventListener('input', () => { updateBMI(); validate(); }));
  updateBMI(); validate();

  nextBtn.addEventListener('click', () => {
    state.age = ageEl.value; state.heightCm = hEl.value; state.weightKg = wEl.value;
    state.step = 2; render();
  });
}

// ===== SPORT SELECT =====
function renderSportSelect() {
  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header"><div class="step-badge">Tier 0 · Sport</div>
      <h2 class="step-title">Which sport interests you?</h2>
      <p class="step-description">Pick one sport — we'll tailor the screening to its specific demands.</p></div>
    <div class="option-grid cols-2" id="sport-grid">
      ${Object.entries(SPORT_DEMANDS).map(([k,v]) => `
        <div class="option-card sport-card ${state.sport===k?'selected':''}" data-val="${k}">
          <span class="option-card-icon">${v.icon}</span>
          <span class="option-card-title">${v.label}</span>
        </div>`).join('')}
    </div>
    ${nav(true, 'next-btn', 'Continue', !state.sport)}
  </div></div>`;

  document.querySelectorAll('#sport-grid .option-card').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('#sport-grid .option-card').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected'); state.sport = c.dataset.val;
      document.getElementById('next-btn').disabled = false;
    });
  });
  document.getElementById('next-btn').addEventListener('click', () => { state.step = 3; render(); });
  bindBack();
}

// ===== ACTIVITY & INTENSITY =====
function renderActivityIntensity() {
  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header"><div class="step-badge">Tier 0 · Lifestyle</div>
      <h2 class="step-title">Your current lifestyle</h2>
      <p class="step-description">This helps us calibrate the screening to where you are now.</p></div>
    <div class="form-group"><label class="form-label">Current Activity Level</label>
      <div class="option-grid" id="activity-grid">
        <div class="option-card ${state.activityLevel==='regular'?'selected':''}" data-val="regular">
          <span class="option-card-icon">🏃</span><span class="option-card-title">Regular</span>
          <span class="option-card-desc">3 or more times per week</span></div>
        <div class="option-card ${state.activityLevel==='light'?'selected':''}" data-val="light">
          <span class="option-card-icon">🚶</span><span class="option-card-title">Light</span>
          <span class="option-card-desc">1-2 times per week</span></div>
        <div class="option-card ${state.activityLevel==='sedentary'?'selected':''}" data-val="sedentary">
          <span class="option-card-icon">🪑</span><span class="option-card-title">Sedentary</span>
          <span class="option-card-desc">Rarely active</span></div>
      </div></div>
    <div class="form-group"><label class="form-label">Target Intensity</label>
      <div class="option-grid cols-2" id="intensity-grid">
        <div class="option-card ${state.intensity==='recreational'?'selected':''}" data-val="recreational">
          <span class="option-card-icon">😊</span><span class="option-card-title">Recreational</span>
          <span class="option-card-desc">Casual play, fun & fitness</span></div>
        <div class="option-card ${state.intensity==='competitive'?'selected':''}" data-val="competitive">
          <span class="option-card-icon">🏆</span><span class="option-card-title">Competitive</span>
          <span class="option-card-desc">Structured training, matches</span></div>
      </div></div>
    ${nav(true, 'next-btn', 'Continue', !(state.activityLevel && state.intensity))}
  </div></div>`;

  function bindGrid(gridId, stateKey) {
    document.querySelectorAll(`#${gridId} .option-card`).forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll(`#${gridId} .option-card`).forEach(x => x.classList.remove('selected'));
        c.classList.add('selected'); state[stateKey] = c.dataset.val;
        document.getElementById('next-btn').disabled = !(state.activityLevel && state.intensity);
      });
    });
  }
  bindGrid('activity-grid', 'activityLevel');
  bindGrid('intensity-grid', 'intensity');
  document.getElementById('next-btn').addEventListener('click', () => { state.step = 4; render(); });
  bindBack();
}

// ===== GATE QUESTION =====
function renderGate() {
  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="gate-card">
      <div class="gate-icon">🩺</div>
      <h2 class="gate-title">In the last 12 months, have you been diagnosed with any heart, lung, metabolic, bone/joint, or neurological condition — or are you on any regular medication?</h2>
      <p class="gate-description">If you answer No, we'll take you straight to your result. If Yes, we'll ask a few more targeted questions — only about the areas that apply to you.</p>
      <div class="gate-buttons">
        <button class="btn btn-outline-green btn-lg" id="gate-no">No, none of these</button>
        <button class="btn btn-outline-red btn-lg" id="gate-yes">Yes, I have a condition</button>
      </div>
    </div>
    <div class="step-actions"><button class="btn btn-secondary" id="back-btn">← Back</button><div></div></div>
  </div></div>`;

  document.getElementById('gate-no').addEventListener('click', () => {
    state.gateAnswer = 'no'; state.step = STEPS.indexOf('result'); render();
  });
  document.getElementById('gate-yes').addEventListener('click', () => {
    state.gateAnswer = 'yes'; state.step = 5; render();
  });
  bindBack();
}

// ===== CATEGORY SELECT =====
function renderCategorySelect() {
  const showPregnancy = state.sex === 'female' && parseInt(state.age) >= 12 && parseInt(state.age) <= 55;
  const cats = TIER1_CATEGORIES.filter(c => !c.conditional || (c.id === 'pregnancy' && showPregnancy));

  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header"><div class="step-badge">Tier 1 · Categories</div>
      <h2 class="step-title">Which areas apply to you?</h2>
      <p class="step-description">Select all that are relevant. You'll only see follow-up questions for the areas you pick.</p></div>
    <div class="consent-text" style="margin-bottom:20px;font-size:12px;color:var(--text-muted);padding:12px;border:1px solid var(--border-glass);border-radius:var(--radius-md);">
      <strong style="color:var(--text-secondary)">🔒 Privacy note:</strong> Your medical information is used solely for this screening and is not stored or shared. By continuing, you consent to providing this information for screening purposes only.
    </div>
    <div class="category-grid" id="cat-grid">
      ${cats.map(c => `<div class="category-chip ${state.selectedCategories.includes(c.id)?'selected':''}" data-val="${c.id}">
        <span class="category-chip-icon">${c.icon}</span>${c.label}
      </div>`).join('')}
    </div>
    ${nav(true, 'next-btn', 'Continue', state.selectedCategories.length === 0)}
  </div></div>`;

  document.querySelectorAll('#cat-grid .category-chip').forEach(c => {
    c.addEventListener('click', () => {
      const v = c.dataset.val;
      if (state.selectedCategories.includes(v)) {
        state.selectedCategories = state.selectedCategories.filter(x => x !== v);
        c.classList.remove('selected');
      } else {
        state.selectedCategories.push(v);
        c.classList.add('selected');
      }
      document.getElementById('next-btn').disabled = state.selectedCategories.length === 0;
    });
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    state.currentDomainIndex = 0; state.step = 6; render();
  });
  bindBack();
}

// ===== TIER 1 QUESTIONS =====
function renderTier1() {
  const domains = state.selectedCategories;
  if (state.currentDomainIndex >= domains.length) {
    // Move to sport-specific or result
    if (SPORT_SPECIFIC_QUESTIONS[state.sport]) { state.step = 7; }
    else { state.step = STEPS.indexOf('result'); }
    render(); return;
  }

  const domainId = domains[state.currentDomainIndex];
  const domainInfo = TIER1_CATEGORIES.find(c => c.id === domainId);
  const questions = TIER1_QUESTIONS[domainId] || [];
  if (!state.tier1Answers[domainId]) state.tier1Answers[domainId] = {};
  const answers = state.tier1Answers[domainId];

  // Filter questions based on gate dependencies
  const visibleQs = questions.filter(q => {
    if (!q.dependsOn) return true;
    return answers[q.dependsOn.questionId] === q.dependsOn.value;
  });

  const allAnswered = visibleQs.every(q => answers[q.id] !== undefined);

  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header">
      <div class="step-badge">${domainInfo.icon} ${domainInfo.label}</div>
      <h2 class="step-title">${domainInfo.label}</h2>
      <p class="step-description">Category ${state.currentDomainIndex + 1} of ${domains.length} — answer each question below.</p>
    </div>
    <div id="questions-container">
      ${visibleQs.map(q => `<div class="question-card">
        <div class="question-card-label">${q.label}</div>
        <div class="option-grid" data-qid="${q.id}">
          ${q.options.map(o => `<div class="option-card ${answers[q.id]===o.value?'selected':''}" data-qid="${q.id}" data-val="${o.value}">
            <span class="option-card-title">${o.label}</span>
          </div>`).join('')}
        </div>
      </div>`).join('')}
    </div>
    ${nav(true, 'next-btn', state.currentDomainIndex < domains.length - 1 ? 'Next Category' : (SPORT_SPECIFIC_QUESTIONS[state.sport] ? 'Sport-Specific Questions' : 'See Results'), !allAnswered)}
  </div></div>`;

  document.querySelectorAll('#questions-container .option-card').forEach(c => {
    c.addEventListener('click', () => {
      const qid = c.dataset.qid;
      // Deselect siblings
      document.querySelectorAll(`[data-qid="${qid}"].option-card`).forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      answers[qid] = c.dataset.val;

      // Re-render if this is a gate question (to show/hide dependent questions)
      const qDef = questions.find(q => q.id === qid);
      if (qDef && qDef.gate) { renderTier1(); return; }

      // Check if all visible are answered
      const visQ = questions.filter(q => {
        if (!q.dependsOn) return true;
        return answers[q.dependsOn.questionId] === q.dependsOn.value;
      });
      document.getElementById('next-btn').disabled = !visQ.every(q => answers[q.id] !== undefined);
    });
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    state.currentDomainIndex++; renderTier1();
  });
  bindBack();
}

// ===== SPORT-SPECIFIC =====
function renderSportSpecific() {
  const questions = SPORT_SPECIFIC_QUESTIONS[state.sport] || [];
  if (questions.length === 0) { state.step = STEPS.indexOf('result'); render(); return; }

  if (!state.tier1Answers[state.sport]) state.tier1Answers[state.sport] = {};
  const answers = state.tier1Answers[state.sport];
  const allAnswered = questions.every(q => answers[q.id] !== undefined);
  const sportInfo = SPORT_DEMANDS[state.sport];

  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header">
      <div class="step-badge">${sportInfo.icon} ${sportInfo.label}-Specific</div>
      <h2 class="step-title">${sportInfo.label} — sport-specific checks</h2>
      <p class="step-description">These questions are tailored to the specific physical demands of ${sportInfo.label.toLowerCase()}.</p>
    </div>
    <div id="sport-questions">
      ${questions.map(q => `<div class="question-card">
        <div class="question-card-label">${q.label}</div>
        <div class="option-grid" data-qid="${q.id}">
          ${q.options.map(o => `<div class="option-card ${answers[q.id]===o.value?'selected':''}" data-qid="${q.id}" data-val="${o.value}">
            <span class="option-card-title">${o.label}</span>
          </div>`).join('')}
        </div>
      </div>`).join('')}
    </div>
    ${nav(true, 'next-btn', 'See Your Results', !allAnswered)}
  </div></div>`;

  document.querySelectorAll('#sport-questions .option-card').forEach(c => {
    c.addEventListener('click', () => {
      const qid = c.dataset.qid;
      document.querySelectorAll(`#sport-questions [data-qid="${qid}"].option-card`).forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      answers[qid] = c.dataset.val;
      document.getElementById('next-btn').disabled = !questions.every(q => answers[q.id] !== undefined);
    });
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    state.step = STEPS.indexOf('result'); render();
  });
  bindBack();
}

// ===== RESULT =====
async function renderResult() {
  // Show loading
  app.innerHTML = `<div class="loading-overlay">
    <div class="loading-spinner"></div>
    <div class="loading-text">Analyzing your screening...</div>
    <div class="loading-subtext">Our AI is generating a personalized explanation</div>
  </div>`;

  const result = computeFinalResult(state);
  let explanation;
  try { explanation = await generateResultExplanation(result); }
  catch { explanation = null; }

  const bandConfig = {
    green:  { icon: '✅', label: 'Cleared', title: 'You\'re good to go!', cls: 'band-green' },
    yellow: { icon: '⚠️', label: 'Modified Start', title: 'Start with some adjustments', cls: 'band-yellow' },
    red:    { icon: '🔴', label: 'Doctor Review Required', title: 'We recommend a doctor\'s review', cls: 'band-red' },
  };
  const bc = bandConfig[result.band];
  const sportLabel = SPORT_DEMANDS[result.sport].label;

  const doctorBanner = result.band === 'red' ? `
    <div class="doctor-banner">
      <div class="doctor-banner-icon">👨‍⚕️</div>
      <div class="doctor-banner-title">Doctor Review Required</div>
      <div class="doctor-banner-text">Based on your screening, we recommend a sports physician reviews your case before you begin ${result.intensity} ${sportLabel.toLowerCase()}. This is a standard precaution — not a diagnosis. A qualified doctor would typically review your screening package and respond within 24 hours.</div>
    </div>` : '';

  const rulesHtml = result.rulesFired.filter(r => r.pts > 0 || r.pts === 'RED_FLAG').map(r =>
    `<li>${r.desc}${r.pts !== undefined && r.pts !== 'RED_FLAG' ? ` <span style="color:var(--text-muted);font-family:var(--font-mono)">(+${r.pts})</span>` : ''}</li>`
  ).join('');

  app.innerHTML = `<div class="container"><div class="result-page animate-in">
    <div class="result-band-card ${bc.cls}">
      <div class="result-band-icon">${bc.icon}</div>
      <div class="result-band-label">${bc.label}</div>
      <div class="result-band-title">${bc.title}</div>
      <div class="result-sport-info">${SPORT_DEMANDS[result.sport].icon} ${sportLabel} · ${result.intensity.charAt(0).toUpperCase() + result.intensity.slice(1)}</div>
    </div>
    ${doctorBanner}
    <div class="result-section">
      <div class="result-section-title">Your Personalized Assessment</div>
      <div class="result-explanation">${(explanation || '').split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('')}</div>
    </div>
    <div class="result-section">
      <div class="result-section-title">Screening Scores</div>
      <div class="result-score-grid">
        <div class="result-score-item"><div class="result-score-value">${result.baseRiskScore !== null ? result.baseRiskScore : '—'}</div><div class="result-score-label">Base Risk Score</div></div>
        <div class="result-score-item"><div class="result-score-value">${result.sportDemandWeight !== null ? '×' + result.sportDemandWeight : '—'}</div><div class="result-score-label">Sport Demand</div></div>
        <div class="result-score-item"><div class="result-score-value" style="color:var(--accent-${result.band === 'green' ? 'green' : result.band === 'yellow' ? 'yellow' : 'red'})">${result.riskIndex !== null ? result.riskIndex : 'FLAG'}</div><div class="result-score-label">Risk Index</div></div>
      </div>
    </div>
    ${rulesHtml ? `<div class="result-section"><div class="result-section-title">Factors Considered</div><ul class="result-rules">${rulesHtml}</ul></div>` : ''}
    ${result.reviewByDate ? `<div class="result-section"><div class="result-section-title">Re-check Date</div><p style="font-size:15px;color:var(--text-secondary)">📅 ${new Date(result.reviewByDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>` : ''}
    <div class="result-disclaimer">⚕️ This is a screening tool, not a medical diagnosis. It's designed to help you make an informed decision about starting a sport, using the same principles used by sports medicine bodies worldwide. If you have ongoing symptoms or concerns, please consult a doctor directly.</div>
    <div class="step-actions" style="justify-content:center"><button class="btn btn-primary btn-lg" id="restart-btn">Start New Screening</button></div>
  </div></div>`;

  document.getElementById('restart-btn').addEventListener('click', () => {
    Object.assign(state, { step:0, age:'', sex:'', heightCm:'', weightKg:'', sport:'', activityLevel:'', intensity:'', gateAnswer:'', selectedCategories:[], tier1Answers:{}, freeText:'', currentDomainIndex:0 });
    render();
  });
}

render();
