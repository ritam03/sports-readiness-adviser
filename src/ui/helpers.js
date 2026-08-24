/** Shared UI helpers — header, nav, progress, bindings */

let stateRef = null;
let renderRef = null;

export function initHelpers(state, renderFn) { stateRef = state; renderRef = renderFn; }

export function progress() {
  const s = stateRef.step;
  if (s === 0) return 0;
  let total = 6;
  if (stateRef.gate1Answer === 'yes') total += 2;
  if (stateRef.gate2Answer === 'yes') total += 1;
  if (stateRef.gate3Answer === 'yes') total += 1;
  return Math.min(100, Math.round((s / total) * 100));
}

export function header() {
  if (stateRef.step === 0) return '';
  return `<header class="header"><div class="container header-inner">
    <div class="header-logo">SR</div>
    <div><div class="header-title">Sports Readiness Adviser</div>
    <div class="header-subtitle">Pre-Participation Screening</div></div>
  </div></header>
  <div class="container"><div class="progress-wrapper">
    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${progress()}%"></div></div>
    <div class="progress-label"><span>Progress</span><span>${progress()}%</span></div>
  </div></div>`;
}

export function nav(back = true, nextLabel = 'Continue', disabled = true) {
  return `<div class="step-actions">
    ${stateRef.step > 1 && back ? `<button class="btn btn-secondary" id="back-btn">\u2190 Back</button>` : '<div></div>'}
    <button class="btn btn-primary" id="next-btn" ${disabled ? 'disabled' : ''}>${nextLabel} \u2192</button>
  </div>`;
}

export function bindBack() {
  document.getElementById('back-btn')?.addEventListener('click', () => { stateRef.step--; renderRef(); });
}

export function bindGrid(gridId, stateKey, checkFn) {
  document.querySelectorAll(`#${gridId} .option-card`).forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll(`#${gridId} .option-card`).forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      stateRef[stateKey] = c.dataset.val;
      if (checkFn) checkFn();
    });
  });
}
