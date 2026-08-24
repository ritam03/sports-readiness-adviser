/** Result page renderer */
import { computeFinalResult, SPORT_DEMANDS } from '../engine/ruleEngine.js';
import { generateResultExplanation } from '../ai/gemini.js';

export async function renderResult(app, state, render) {
  app.innerHTML = `<div class="loading-overlay"><div class="loading-spinner"></div>
    <div class="loading-text">Analyzing your screening...</div>
    <div class="loading-subtext">Our AI is generating a personalized explanation</div></div>`;

  const result = computeFinalResult(state);
  let explanation;
  try { explanation = await generateResultExplanation(result); } catch { explanation = null; }

  const bc = { green: { icon: '\u2705', label: 'Cleared', title: "You're good to go!", cls: 'band-green' },
    yellow: { icon: '\u26a0\ufe0f', label: 'Modified Start', title: 'Start with some adjustments', cls: 'band-yellow' },
    red: { icon: '\ud83d\udd34', label: 'Doctor Review Required', title: "We recommend a doctor's review", cls: 'band-red' },
  }[result.band];
  const sportLabel = SPORT_DEMANDS[result.sport].label;

  const doctorBanner = result.band === 'red' ? `<div class="doctor-banner">
    <div class="doctor-banner-icon">\ud83d\udc68\u200d\u2695\ufe0f</div>
    <div class="doctor-banner-title">Doctor Review Required</div>
    <div class="doctor-banner-text">Based on your screening, we recommend a sports physician reviews your case before you begin ${result.intensity} ${sportLabel.toLowerCase()}. This is a standard precaution \u2014 not a diagnosis. A qualified doctor would typically review your screening package and respond within 24 hours.</div>
  </div>` : '';

  const rulesHtml = result.rulesFired.filter(r => r.pts > 0).map(r =>
    `<li>${r.desc} <span style="color:var(--text-muted);font-family:var(--font-mono)">(+${r.pts})</span></li>`
  ).join('');

  app.innerHTML = `<div class="container"><div class="result-page animate-in">
    <div class="result-band-card ${bc.cls}">
      <div class="result-band-icon">${bc.icon}</div>
      <div class="result-band-label">${bc.label}</div>
      <div class="result-band-title">${bc.title}</div>
      <div class="result-sport-info">${SPORT_DEMANDS[result.sport].icon} ${sportLabel} \u00b7 ${result.intensity.charAt(0).toUpperCase() + result.intensity.slice(1)}</div>
    </div>
    ${doctorBanner}
    <div class="result-section">
      <div class="result-section-title">Your Personalized Assessment</div>
      <div class="result-explanation">${(explanation || '').split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('')}</div>
    </div>
    <div class="result-section">
      <div class="result-section-title">Screening Scores</div>
      <div class="result-score-grid">
        <div class="result-score-item"><div class="result-score-value">${result.baseRiskScore !== null ? result.baseRiskScore : '\u2014'}</div><div class="result-score-label">Base Risk Score</div></div>
        <div class="result-score-item"><div class="result-score-value">${result.sportDemandWeight !== null ? '\u00d7' + result.sportDemandWeight : '\u2014'}</div><div class="result-score-label">Sport Demand</div></div>
        <div class="result-score-item"><div class="result-score-value" style="color:var(--accent-${result.band === 'green' ? 'green' : result.band === 'yellow' ? 'yellow' : 'red'})">${result.riskIndex !== null ? result.riskIndex : 'FLAG'}</div><div class="result-score-label">Risk Index</div></div>
      </div>
    </div>
    ${rulesHtml ? `<div class="result-section"><div class="result-section-title">Factors Considered</div><ul class="result-rules">${rulesHtml}</ul></div>` : ''}
    ${result.reviewByDate ? `<div class="result-section"><div class="result-section-title">Re-check Date</div><p style="font-size:15px;color:var(--text-secondary)">\ud83d\udcc5 ${new Date(result.reviewByDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>` : ''}
    <div class="result-disclaimer">\u2695\ufe0f This is a screening tool, not a medical diagnosis. It's designed to help you make an informed decision about starting a sport, using the same principles used by sports medicine bodies worldwide. If you have ongoing symptoms or concerns, please consult a doctor directly.</div>
    <div class="step-actions" style="justify-content:center"><button class="btn btn-primary btn-lg" id="restart-btn">Start New Screening</button></div>
  </div></div>`;

  document.getElementById('restart-btn').addEventListener('click', () => {
    Object.assign(state, { step:0, age:'', sex:'', heightCm:'', weightKg:'', sport:'', activityLevel:'', intensity:'', waterConfidence:'',
      gate1Answer:'', gate2Answer:'', gate3Answer:'', gate1Categories:[], gate1Answers:{}, gate2Answers:{}, gate3Answers:{}, freeText:'', currentDomainIndex:0 });
    render();
  });
}
