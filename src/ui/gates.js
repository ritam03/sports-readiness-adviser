/** Three independent gates (v3) + Gate 1 category/domain questions + Gate 2/3 questions */
import { TIER1_QUESTIONS, SPORT_SPECIFIC_QUESTIONS } from '../questionnaire/questions.js';
import { SPORT_DEMANDS } from '../engine/ruleEngine.js';
import { header, nav, bindBack } from './helpers.js';

const GATE1_CATS = [
  { id: 'cardiac', label: 'Heart & Blood Pressure', icon: '\u2764\ufe0f' },
  { id: 'respiratory', label: 'Lungs & Breathing', icon: '\ud83e\udec1' },
  { id: 'metabolic', label: 'Diabetes & Metabolism', icon: '\ud83e\uddec' },
  { id: 'neurological', label: 'Neurological', icon: '\ud83e\udde0' },
];

export function renderGates(app, state, render) {
  const showGate3 = state.sex === 'female' && parseInt(state.age) >= 12 && parseInt(state.age) <= 55;
  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header"><div class="step-badge">Health Background</div>
      <h2 class="step-title">A few health questions</h2>
      <p class="step-description">These help us tailor the screening. Each question is independent \u2014 answer each one honestly.</p></div>

    <div class="question-card">
      <div class="question-card-label">\ud83c\udfe5 In the last 12 months, have you been diagnosed with any heart, lung, metabolic, or neurological condition, or are you on any regular medication for one?</div>
      <div class="option-grid cols-2" data-gate="gate1">
        <div class="option-card ${state.gate1Answer==='no'?'selected':''}" data-gate="gate1" data-val="no"><span class="option-card-title">No</span></div>
        <div class="option-card ${state.gate1Answer==='yes'?'selected':''}" data-gate="gate1" data-val="yes"><span class="option-card-title">Yes</span></div>
      </div>
    </div>

    <div class="question-card">
      <div class="question-card-label">\ud83e\ude79 In the last 12 months, have you had any joint or muscle pain, an injury or surgery, or an ear or skin infection \u2014 even if it was never formally diagnosed?</div>
      <div class="option-grid cols-2" data-gate="gate2">
        <div class="option-card ${state.gate2Answer==='no'?'selected':''}" data-gate="gate2" data-val="no"><span class="option-card-title">No</span></div>
        <div class="option-card ${state.gate2Answer==='yes'?'selected':''}" data-gate="gate2" data-val="yes"><span class="option-card-title">Yes</span></div>
      </div>
    </div>

    ${showGate3 ? `<div class="question-card">
      <div class="question-card-label">\ud83e\udd30 Are you currently pregnant?</div>
      <div class="option-grid cols-2" data-gate="gate3">
        <div class="option-card ${state.gate3Answer==='no'?'selected':''}" data-gate="gate3" data-val="no"><span class="option-card-title">No</span></div>
        <div class="option-card ${state.gate3Answer==='yes'?'selected':''}" data-gate="gate3" data-val="yes"><span class="option-card-title">Yes</span></div>
      </div>
    </div>` : ''}

    ${nav(true, 'Continue', true)}
  </div></div>`;

  // Bind gate selections
  document.querySelectorAll('.option-card[data-gate]').forEach(c => {
    c.addEventListener('click', () => {
      const gate = c.dataset.gate;
      document.querySelectorAll(`.option-card[data-gate="${gate}"]`).forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      state[gate + 'Answer'] = c.dataset.val;
      checkGates();
    });
  });

  function checkGates() {
    const g1ok = !!state.gate1Answer, g2ok = !!state.gate2Answer;
    const g3ok = !showGate3 || !!state.gate3Answer;
    document.getElementById('next-btn').disabled = !(g1ok && g2ok && g3ok);
  }
  checkGates();

  document.getElementById('next-btn').addEventListener('click', () => {
    // Determine next step
    if (state.gate1Answer === 'yes') { state.step = 5; }
    else if (state.gate2Answer === 'yes') { state.step = 7; }
    else if (state.gate3Answer === 'yes') { state.step = 8; }
    else { state.step = 9; } // straight to result
    render();
  });
  bindBack();
}

export function renderGate1Categories(app, state, render) {
  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header"><div class="step-badge">Medical History</div>
      <h2 class="step-title">Which areas apply to you?</h2>
      <p class="step-description">Select all relevant categories. You\u2019ll only see follow-up questions for the areas you pick.</p></div>
    <div class="consent-text" style="margin-bottom:20px;font-size:12px;color:var(--text-muted);padding:12px;border:1px solid var(--border-glass);border-radius:var(--radius-md);">
      <strong style="color:var(--text-secondary)">\ud83d\udd12 Privacy note:</strong> Your medical information is used solely for this screening and is not stored or shared.
    </div>
    <div class="category-grid" id="cat-grid">
      ${GATE1_CATS.map(c => `<div class="category-chip ${state.gate1Categories.includes(c.id)?'selected':''}" data-val="${c.id}">
        <span class="category-chip-icon">${c.icon}</span>${c.label}
      </div>`).join('')}
    </div>
    ${nav(true, 'Continue', state.gate1Categories.length === 0)}
  </div></div>`;

  document.querySelectorAll('#cat-grid .category-chip').forEach(c => {
    c.addEventListener('click', () => {
      const v = c.dataset.val;
      if (state.gate1Categories.includes(v)) {
        state.gate1Categories = state.gate1Categories.filter(x => x !== v);
        c.classList.remove('selected');
      } else { state.gate1Categories.push(v); c.classList.add('selected'); }
      document.getElementById('next-btn').disabled = state.gate1Categories.length === 0;
    });
  });
  document.getElementById('next-btn').addEventListener('click', () => { state.currentDomainIndex = 0; state.step = 6; render(); });
  document.getElementById('back-btn')?.addEventListener('click', () => { state.step = 4; render(); });
}

export function renderGate1Questions(app, state, render) {
  const domains = state.gate1Categories;
  if (state.currentDomainIndex >= domains.length) {
    if (state.gate2Answer === 'yes') { state.step = 7; }
    else if (state.gate3Answer === 'yes') { state.step = 8; }
    else { state.step = 9; }
    render(); return;
  }
  const domainId = domains[state.currentDomainIndex];
  const domainInfo = GATE1_CATS.find(c => c.id === domainId);
  const questions = TIER1_QUESTIONS[domainId] || [];
  if (!state.gate1Answers[domainId]) state.gate1Answers[domainId] = {};
  const answers = state.gate1Answers[domainId];

  const visibleQs = questions.filter(q => {
    if (!q.dependsOn) return true;
    return answers[q.dependsOn.questionId] === q.dependsOn.value;
  });
  const allAnswered = visibleQs.every(q => answers[q.id] !== undefined);
  const isLast = state.currentDomainIndex >= domains.length - 1;
  let nextLabel = isLast ? (state.gate2Answer === 'yes' ? 'Continue' : (state.gate3Answer === 'yes' ? 'Continue' : 'See Results')) : 'Next Category';

  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header">
      <div class="step-badge">${domainInfo.icon} ${domainInfo.label}</div>
      <h2 class="step-title">${domainInfo.label}</h2>
      <p class="step-description">Category ${state.currentDomainIndex + 1} of ${domains.length}</p>
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
    ${nav(true, nextLabel, !allAnswered)}
  </div></div>`;

  document.querySelectorAll('#questions-container .option-card').forEach(c => {
    c.addEventListener('click', () => {
      const qid = c.dataset.qid;
      document.querySelectorAll(`[data-qid="${qid}"].option-card`).forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      answers[qid] = c.dataset.val;
      const qDef = questions.find(q => q.id === qid);
      if (qDef && qDef.gate) { renderGate1Questions(app, state, render); return; }
      const vis = questions.filter(q => !q.dependsOn || answers[q.dependsOn.questionId] === q.dependsOn.value);
      document.getElementById('next-btn').disabled = !vis.every(q => answers[q.id] !== undefined);
    });
  });
  document.getElementById('next-btn').addEventListener('click', () => { state.currentDomainIndex++; renderGate1Questions(app, state, render); });
  document.getElementById('back-btn')?.addEventListener('click', () => {
    if (state.currentDomainIndex > 0) { state.currentDomainIndex--; renderGate1Questions(app, state, render); }
    else { state.step = 5; render(); }
  });
}

export function renderGate2Questions(app, state, render) {
  const msQuestions = TIER1_QUESTIONS.musculoskeletal || [];
  const sportQuestions = SPORT_SPECIFIC_QUESTIONS[state.sport] || [];
  const allQuestions = [...msQuestions, ...sportQuestions];
  const sportInfo = SPORT_DEMANDS[state.sport];

  if (!state.gate2Answers.musculoskeletal) state.gate2Answers.musculoskeletal = {};
  if (!state.gate2Answers[state.sport]) state.gate2Answers[state.sport] = {};

  const msAns = state.gate2Answers.musculoskeletal;
  const sportAns = state.gate2Answers[state.sport];

  const msAnswered = msQuestions.every(q => msAns[q.id] !== undefined);
  const sportAnswered = sportQuestions.every(q => sportAns[q.id] !== undefined);
  const allAnswered = msAnswered && sportAnswered;
  let nextLabel = state.gate3Answer === 'yes' ? 'Continue' : 'See Results';

  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header">
      <div class="step-badge">\ud83e\uddb4 Injuries, Symptoms & ${sportInfo.icon} ${sportInfo.label}</div>
      <h2 class="step-title">Physical health & ${sportInfo.label.toLowerCase()}-specific checks</h2>
      <p class="step-description">These cover recent injuries, current symptoms, and factors specific to ${sportInfo.label.toLowerCase()}.</p>
    </div>
    <div id="g2-questions">
      ${msQuestions.length > 0 ? `<h3 style="font-size:14px;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">General Physical Health</h3>` : ''}
      ${msQuestions.map(q => `<div class="question-card"><div class="question-card-label">${q.label}</div>
        <div class="option-grid" data-qid="${q.id}" data-domain="musculoskeletal">
          ${q.options.map(o => `<div class="option-card ${msAns[q.id]===o.value?'selected':''}" data-qid="${q.id}" data-val="${o.value}" data-domain="musculoskeletal">
            <span class="option-card-title">${o.label}</span></div>`).join('')}
        </div></div>`).join('')}
      ${sportQuestions.length > 0 ? `<h3 style="font-size:14px;color:var(--text-muted);margin:20px 0 12px;text-transform:uppercase;letter-spacing:1px">${sportInfo.icon} ${sportInfo.label}-Specific</h3>` : ''}
      ${sportQuestions.map(q => `<div class="question-card"><div class="question-card-label">${q.label}</div>
        <div class="option-grid" data-qid="${q.id}" data-domain="${state.sport}">
          ${q.options.map(o => `<div class="option-card ${sportAns[q.id]===o.value?'selected':''}" data-qid="${q.id}" data-val="${o.value}" data-domain="${state.sport}">
            <span class="option-card-title">${o.label}</span></div>`).join('')}
        </div></div>`).join('')}
    </div>
    ${nav(true, nextLabel, !allAnswered)}
  </div></div>`;

  document.querySelectorAll('#g2-questions .option-card').forEach(c => {
    c.addEventListener('click', () => {
      const qid = c.dataset.qid, domain = c.dataset.domain;
      document.querySelectorAll(`[data-qid="${qid}"][data-domain="${domain}"].option-card`).forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      if (domain === 'musculoskeletal') msAns[qid] = c.dataset.val;
      else sportAns[qid] = c.dataset.val;
      const ms2 = msQuestions.every(q => msAns[q.id] !== undefined);
      const sp2 = sportQuestions.every(q => sportAns[q.id] !== undefined);
      document.getElementById('next-btn').disabled = !(ms2 && sp2);
    });
  });
  document.getElementById('next-btn').addEventListener('click', () => {
    state.step = state.gate3Answer === 'yes' ? 8 : 9; render();
  });
  document.getElementById('back-btn')?.addEventListener('click', () => {
    if (state.gate1Answer === 'yes') { state.currentDomainIndex = state.gate1Categories.length - 1; state.step = 6; }
    else { state.step = 4; }
    render();
  });
}

export function renderGate3Questions(app, state, render) {
  const questions = TIER1_QUESTIONS.pregnancy || [];
  if (!state.gate3Answers.pregnancy) state.gate3Answers.pregnancy = {};
  const answers = state.gate3Answers.pregnancy;
  const allAnswered = questions.every(q => answers[q.id] !== undefined);

  app.innerHTML = `${header()}<div class="container"><div class="step-content animate-in">
    <div class="step-header">
      <div class="step-badge">\ud83e\udd30 Pregnancy</div>
      <h2 class="step-title">Pregnancy information</h2>
      <p class="step-description">This helps us ensure the screening accounts for your current stage.</p>
    </div>
    <div id="pg-questions">
      ${questions.map(q => `<div class="question-card"><div class="question-card-label">${q.label}</div>
        <div class="option-grid" data-qid="${q.id}">
          ${q.options.map(o => `<div class="option-card ${answers[q.id]===o.value?'selected':''}" data-qid="${q.id}" data-val="${o.value}">
            <span class="option-card-title">${o.label}</span></div>`).join('')}
        </div></div>`).join('')}
    </div>
    ${nav(true, 'See Results', !allAnswered)}
  </div></div>`;

  document.querySelectorAll('#pg-questions .option-card').forEach(c => {
    c.addEventListener('click', () => {
      const qid = c.dataset.qid;
      document.querySelectorAll(`#pg-questions [data-qid="${qid}"].option-card`).forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      answers[qid] = c.dataset.val;
      document.getElementById('next-btn').disabled = !questions.every(q => answers[q.id] !== undefined);
    });
  });
  document.getElementById('next-btn').addEventListener('click', () => { state.step = 9; render(); });
  document.getElementById('back-btn')?.addEventListener('click', () => {
    if (state.gate2Answer === 'yes') state.step = 7;
    else if (state.gate1Answer === 'yes') { state.currentDomainIndex = state.gate1Categories.length - 1; state.step = 6; }
    else state.step = 4;
    render();
  });
}
