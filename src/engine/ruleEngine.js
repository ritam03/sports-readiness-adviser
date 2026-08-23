/**
 * Sports Readiness Adviser — Deterministic Rule Engine
 * All scoring logic lives here. No LLM involvement in band decisions.
 * Based on PAR-Q+/ACSM-derived screening logic.
 */

// ===== SPORT DEMAND PROFILES =====
export const SPORT_DEMANDS = {
  badminton: {
    label: 'Badminton',
    icon: '🏸',
    recreational: { cardio: 'Moderate', impact: 'Moderate', collision: 'Low', thermal: 'Moderate', weight: 1.0 },
    competitive:  { cardio: 'High',     impact: 'High',     collision: 'Low', thermal: 'High',     weight: 1.5 },
  },
  swimming: {
    label: 'Swimming',
    icon: '🏊',
    recreational: { cardio: 'Moderate', impact: 'Low', collision: 'Low', thermal: 'Low', weight: 0.8 },
    competitive:  { cardio: 'High',     impact: 'Low-Moderate', collision: 'Low', thermal: 'Low', weight: 1.2 },
  },
};

// ===== TIER 0 SCORING =====
export function computeTier0Score(data) {
  let score = 0;
  const rules = [];

  // Age
  const age = parseInt(data.age);
  if (age >= 60)       { score += 3; rules.push({ id: 'age_60plus_v1',  desc: 'Age 60+',   pts: 3 }); }
  else if (age >= 46)  { score += 2; rules.push({ id: 'age_46_60_v1',   desc: 'Age 46-60',  pts: 2 }); }
  else if (age >= 30)  { score += 1; rules.push({ id: 'age_30_45_v1',   desc: 'Age 30-45',  pts: 1 }); }
  else                 { rules.push({ id: 'age_under30_v1', desc: 'Age under 30', pts: 0 }); }

  // BMI
  const bmi = computeBMI(data.heightCm, data.weightKg);
  if (bmi >= 30)                          { score += 2; rules.push({ id: 'bmi_obese_v1',      desc: 'BMI obese (30+)',                pts: 2 }); }
  else if (bmi < 18.5 || bmi >= 25)       { score += 1; rules.push({ id: 'bmi_abnormal_v1',   desc: 'BMI under/overweight',           pts: 1 }); }
  else                                    { rules.push({ id: 'bmi_normal_v1',    desc: 'BMI normal (18.5-24.9)',         pts: 0 }); }

  // Activity level
  if (data.activityLevel === 'sedentary')      { score += 2; rules.push({ id: 'activity_sedentary_v1', desc: 'Sedentary lifestyle', pts: 2 }); }
  else if (data.activityLevel === 'light')     { score += 1; rules.push({ id: 'activity_light_v1',     desc: 'Light activity (1-2x/week)', pts: 1 }); }
  else                                         { rules.push({ id: 'activity_regular_v1',  desc: 'Regular activity (3+/week)', pts: 0 }); }

  return { score, rules, bmi };
}

export function computeBMI(heightCm, weightKg) {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return 0;
  return w / ((h / 100) ** 2);
}

export function getBMICategory(bmi) {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25)   return 'normal';
  if (bmi < 30)   return 'overweight';
  return 'obese';
}

// ===== TIER 1 SCORING =====
export function computeTier1Score(answers, sport, intensity) {
  let score = 0;
  const rules = [];
  const absoluteFlags = [];

  // Cardiovascular domain (cap: 8)
  if (answers.cardiac) {
    let cardiacScore = 0;
    const c = answers.cardiac;
    // C1: chest pain
    if (c.c1 === 'frequently') { absoluteFlags.push({ id: 'cardiac_chest_pain_v1', desc: 'Chest pain at rest or minimal exertion', trigger: 'C1' }); }
    else if (c.c1 === 'occasionally') { cardiacScore += 2; rules.push({ id: 'cardiac_occasional_pain_v1', desc: 'Occasional chest pain during activity', pts: 2 }); }
    // C2: medication
    if (c.c2 === 'poorly_controlled') { cardiacScore += 3; rules.push({ id: 'cardiac_med_uncontrolled_v1', desc: 'BP/cardiac medication, poorly controlled', pts: 3 }); }
    else if (c.c2 === 'well_controlled') { cardiacScore += 2; rules.push({ id: 'cardiac_med_controlled_v1', desc: 'BP/cardiac medication, well controlled', pts: 2 }); }
    // C3: fainting
    if (c.c3 === 'recurrent') { absoluteFlags.push({ id: 'cardiac_fainting_recurrent_v1', desc: 'Recurrent or unexplained fainting during exertion', trigger: 'C3' }); }
    else if (c.c3 === 'isolated') { cardiacScore += 2; rules.push({ id: 'cardiac_fainting_isolated_v1', desc: 'Isolated fainting episode, cleared', pts: 2 }); }
    // C4: cardiac event
    if (c.c4 === 'under_3mo') { absoluteFlags.push({ id: 'cardiac_event_recent_v1', desc: 'Cardiac event/procedure under 3 months ago', trigger: 'C4' }); }
    else if (c.c4 === '3_12mo') { cardiacScore += 4; rules.push({ id: 'cardiac_event_3_12mo_v1', desc: 'Cardiac event 3-12 months ago', pts: 4 }); }
    else if (c.c4 === 'over_12mo') { cardiacScore += 2; rules.push({ id: 'cardiac_event_12mo_v1', desc: 'Cardiac event 12+ months ago, cleared', pts: 2 }); }

    score += Math.min(cardiacScore, 8);
  }

  // Respiratory domain (cap: 6)
  if (answers.respiratory && answers.respiratory.r1 === 'yes') {
    let respScore = 0;
    const r = answers.respiratory;
    if (r.r2 === 'frequent') { respScore += 3; rules.push({ id: 'resp_frequent_flare_v1', desc: 'Frequent respiratory flares despite inhaler', pts: 3 }); }
    else if (r.r2 === 'occasional') { respScore += 1; rules.push({ id: 'resp_occasional_flare_v1', desc: 'Occasional respiratory flares, inhaler-controlled', pts: 1 }); }
    if (r.r3 === 'daily') { respScore += 2; rules.push({ id: 'resp_inhaler_daily_v1', desc: 'Inhaler used daily or frequently', pts: 2 }); }
    else if (r.r3 === 'rarely') { respScore += 1; rules.push({ id: 'resp_inhaler_rarely_v1', desc: 'Inhaler carried but rarely used', pts: 1 }); }
    if (r.r4 === 'yes') {
      if (intensity === 'competitive') {
        absoluteFlags.push({ id: 'resp_hospitalization_competitive_v1', desc: 'Respiratory hospitalization in past 12 months (competitive intensity)', trigger: 'R4' });
      } else {
        respScore += 4; rules.push({ id: 'resp_hospitalization_v1', desc: 'Respiratory hospitalization in past 12 months', pts: 4 });
      }
    }
    score += Math.min(respScore, 6);
  }

  // Metabolic domain (cap: 6)
  if (answers.metabolic && answers.metabolic.m1 === 'yes') {
    let metaScore = 0;
    const m = answers.metabolic;
    if (m.m2 === 'insulin') { metaScore += 3; rules.push({ id: 'meta_insulin_v1', desc: 'Insulin-dependent diabetes', pts: 3 }); }
    else if (m.m2 === 'oral') { metaScore += 2; rules.push({ id: 'meta_oral_med_v1', desc: 'Diabetes managed with oral medication', pts: 2 }); }
    else if (m.m2 === 'diet') { metaScore += 1; rules.push({ id: 'meta_diet_v1', desc: 'Diabetes managed with diet/lifestyle', pts: 1 }); }
    if (m.m3 === 'severe') { absoluteFlags.push({ id: 'meta_severe_episode_v1', desc: 'Severe blood sugar episode requiring assistance', trigger: 'M3' }); }
    else if (m.m3 === 'occasional') { metaScore += 2; rules.push({ id: 'meta_occasional_episode_v1', desc: 'Occasional blood sugar episodes, self-managed', pts: 2 }); }
    score += Math.min(metaScore, 6);
  }
  if (answers.metabolic && answers.metabolic.m4 === 'yes') {
    score += 1; rules.push({ id: 'meta_other_condition_v1', desc: 'Other managed metabolic/endocrine condition', pts: 1 });
  }

  // Musculoskeletal domain (cap: 6)
  if (answers.musculoskeletal) {
    let msScore = 0;
    const ms = answers.musculoskeletal;
    if (ms.ms1 === 'under_3mo') {
      if (sport === 'badminton') { absoluteFlags.push({ id: 'ms_surgery_recent_badminton_v1', desc: 'Surgery under 3 months ago + badminton (high-impact)', trigger: 'MS1' }); }
      else { msScore += 4; rules.push({ id: 'ms_surgery_recent_v1', desc: 'Surgery under 3 months ago (low-impact sport)', pts: 4 }); }
    } else if (ms.ms1 === '3_6mo') { msScore += 3; rules.push({ id: 'ms_surgery_3_6mo_v1', desc: 'Surgery 3-6 months ago', pts: 3 }); }
    else if (ms.ms1 === 'over_6mo') { msScore += 1; rules.push({ id: 'ms_surgery_6mo_v1', desc: 'Surgery 6+ months ago, rehabbed and cleared', pts: 1 }); }
    if (ms.ms2 === 'persistent') { msScore += 4; rules.push({ id: 'ms_joint_persistent_v1', desc: 'Persistent or significant joint pain/swelling', pts: 4 }); }
    else if (ms.ms2 === 'mild') { msScore += 2; rules.push({ id: 'ms_joint_mild_v1', desc: 'Mild, intermittent joint pain', pts: 2 }); }
    if (ms.ms3 === 'recent') { msScore += 3; rules.push({ id: 'ms_ligament_recent_v1', desc: 'Ligament reconstruction <12 months or not cleared', pts: 3 }); }
    else if (ms.ms3 === 'old') { msScore += 1; rules.push({ id: 'ms_ligament_old_v1', desc: 'Ligament reconstruction 12+ months, cleared', pts: 1 }); }
    score += Math.min(msScore, 6);
  }

  // Neurological domain (cap: 6)
  if (answers.neurological && answers.neurological.n1 === 'yes') {
    let neuroScore = 0;
    const n = answers.neurological;
    if (n.n2 === 'under_6mo') { absoluteFlags.push({ id: 'neuro_seizure_recent_v1', desc: 'Seizure within last 6 months', trigger: 'N2' }); }
    else if (n.n2 === '6_12mo') {
      neuroScore += 4;
      rules.push({ id: 'neuro_seizure_6_12mo_v1', desc: 'Last seizure 6-12 months ago', pts: 4 });
      if (sport === 'swimming') { absoluteFlags.push({ id: 'swim_seizure_6_12mo_v1', desc: 'Seizure 6-12 months ago + swimming (drowning risk)', trigger: 'N2+Sport' }); }
    }
    else if (n.n2 === 'over_12mo') {
      if (sport === 'swimming') { neuroScore += 2; rules.push({ id: 'swim_seizure_12mo_cleared_v1', desc: 'Seizure 12+ months ago, cleared for water activity', pts: 2 }); }
      else { neuroScore += 1; rules.push({ id: 'neuro_seizure_cleared_v1', desc: 'Seizure 12+ months ago, doctor-cleared', pts: 1 }); }
    }
    if (n.n3 === 'significant') { neuroScore += 4; rules.push({ id: 'neuro_balance_significant_v1', desc: 'Significant balance/coordination issues', pts: 4 }); }
    else if (n.n3 === 'mild') { neuroScore += 2; rules.push({ id: 'neuro_balance_mild_v1', desc: 'Mild balance/coordination issues', pts: 2 }); }
    score += Math.min(neuroScore, 6);
  }

  // Pregnancy domain
  if (answers.pregnancy) {
    const pg = answers.pregnancy;
    if (pg.pg2 === 'complications') { absoluteFlags.push({ id: 'pregnancy_complications_v1', desc: 'Pregnancy with complications flagged by doctor', trigger: 'PG2' }); }
    else if (pg.pg2 === 'cleared') { score += 1; rules.push({ id: 'pregnancy_cleared_v1', desc: 'Pregnancy, doctor-cleared for exercise', pts: 1 }); }
  }

  return { score, rules, absoluteFlags };
}

// ===== SPORT-SPECIFIC EXTENSIONS =====
export function computeSportSpecificScore(answers, sport, intensity) {
  let score = 0;
  const rules = [];
  const absoluteFlags = [];

  if (sport === 'badminton' && answers.badminton) {
    const b = answers.badminton;
    if (b.b1 === 'moderate_severe') { score += 3; rules.push({ id: 'bad_knee_severe_v1', desc: 'Moderate-severe knee/ankle pain with lunging/jumping', pts: 3 }); }
    else if (b.b1 === 'mild') { score += 1; rules.push({ id: 'bad_knee_mild_v1', desc: 'Mild knee/ankle pain with lunging/jumping', pts: 1 }); }
    if (b.b2 === 'recent') {
      if (intensity === 'competitive') { absoluteFlags.push({ id: 'bad_acl_competitive_v1', desc: 'ACL/ankle injury <12 months + competitive badminton', trigger: 'B2' }); }
      else { score += 3; rules.push({ id: 'bad_acl_recent_v1', desc: 'ACL/ankle injury <12 months (recreational)', pts: 3 }); }
    } else if (b.b2 === 'old') { score += 1; rules.push({ id: 'bad_acl_old_v1', desc: 'ACL/ankle injury 12+ months ago, rehabbed', pts: 1 }); }
    if (b.b3 === 'moderate_severe') { score += 2; rules.push({ id: 'bad_shoulder_severe_v1', desc: 'Moderate-severe shoulder/overhead pain', pts: 2 }); }
    else if (b.b3 === 'mild') { score += 1; rules.push({ id: 'bad_shoulder_mild_v1', desc: 'Mild shoulder/overhead pain', pts: 1 }); }
    if (b.b4 === 'flares') { score += 2; rules.push({ id: 'bad_back_flares_v1', desc: 'Lower-back pain flares with twisting/lunging', pts: 2 }); }
    else if (b.b4 === 'managed') { score += 1; rules.push({ id: 'bad_back_managed_v1', desc: 'Managed lower-back pain, no flares', pts: 1 }); }
  }

  if (sport === 'swimming' && answers.swimming) {
    const s = answers.swimming;
    if (s.s1 === 'active') { rules.push({ id: 'swim_ear_active_v1', desc: 'Active ear infection/perforation — resolve before swimming', pts: 0 }); absoluteFlags.push({ id: 'swim_ear_yellow_v1', desc: 'Active ear infection — time-gated, resolve first', trigger: 'S1', forceYellow: true }); }
    else if (s.s1 === 'recent') { score += 2; rules.push({ id: 'swim_ear_recent_v1', desc: 'Ear infection resolved <2 weeks ago', pts: 2 }); }
    if (s.s2 === 'active') { rules.push({ id: 'swim_skin_active_v1', desc: 'Active skin infection/wound — resolve before swimming', pts: 0 }); absoluteFlags.push({ id: 'swim_skin_yellow_v1', desc: 'Active skin condition — time-gated, resolve first', trigger: 'S2', forceYellow: true }); }
    if (s.s3 === 'frequent') { score += 3; rules.push({ id: 'swim_chlorine_resp_frequent_v1', desc: 'Frequent chlorine-triggered respiratory symptoms', pts: 3 }); }
    else if (s.s3 === 'occasional') { score += 1; rules.push({ id: 'swim_chlorine_resp_occasional_v1', desc: 'Occasional chlorine/exercise-triggered symptoms, controlled', pts: 1 }); }
    if (s.s5 === 'beginner') { score += 1; rules.push({ id: 'swim_confidence_beginner_v1', desc: 'Beginner swimmer — recommend beginner class', pts: 1, advisory: true }); }
  }

  return { score: Math.min(score, 8), rules, absoluteFlags };
}

// ===== ORCHESTRATOR =====
export function computeFinalResult(userData) {
  const { sport, intensity } = userData;
  const tier0 = computeTier0Score(userData);
  let tier1 = { score: 0, rules: [], absoluteFlags: [] };
  let sportExt = { score: 0, rules: [], absoluteFlags: [] };

  if (userData.gateAnswer === 'yes') {
    tier1 = computeTier1Score(userData.tier1Answers || {}, sport, intensity);
    sportExt = computeSportSpecificScore(userData.tier1Answers || {}, sport, intensity);
  }

  const baseRiskScore = tier0.score + tier1.score + sportExt.score;
  const allAbsoluteFlags = [...tier1.absoluteFlags, ...sportExt.absoluteFlags];
  const allRules = [...tier0.rules, ...tier1.rules, ...sportExt.rules];

  // Check for absolute red flags (non-yellow)
  const redFlags = allAbsoluteFlags.filter(f => !f.forceYellow);
  const yellowFlags = allAbsoluteFlags.filter(f => f.forceYellow);

  // If any absolute red flag → Red, bypass scoring
  if (redFlags.length > 0) {
    return {
      band: 'red',
      riskIndex: null,
      baseRiskScore: null,
      sportDemandWeight: null,
      absoluteFlagId: redFlags[0].id,
      absoluteFlags: redFlags,
      rulesFired: allRules,
      sport,
      intensity,
      bmi: tier0.bmi,
      tier0Score: tier0.score,
      tier1Score: tier1.score,
      sportExtScore: sportExt.score,
      reviewByDate: null,
      doctorReviewRequired: true,
    };
  }

  const demandWeight = SPORT_DEMANDS[sport][intensity].weight;
  const riskIndex = parseFloat((baseRiskScore * demandWeight).toFixed(1));

  let band;
  if (yellowFlags.length > 0) { band = 'yellow'; }
  else if (riskIndex < 3) { band = 'green'; }
  else if (riskIndex < 6) { band = 'yellow'; }
  else { band = 'red'; }

  const reviewByDate = new Date();
  if (band === 'green') { reviewByDate.setMonth(reviewByDate.getMonth() + 12); }
  else if (band === 'yellow') { reviewByDate.setDate(reviewByDate.getDate() + 28); }

  return {
    band,
    riskIndex,
    baseRiskScore,
    sportDemandWeight: demandWeight,
    absoluteFlagId: null,
    absoluteFlags: yellowFlags,
    rulesFired: allRules,
    sport,
    intensity,
    bmi: tier0.bmi,
    tier0Score: tier0.score,
    tier1Score: tier1.score,
    sportExtScore: sportExt.score,
    reviewByDate: band !== 'red' ? reviewByDate.toISOString().split('T')[0] : null,
    doctorReviewRequired: band === 'red',
  };
}
