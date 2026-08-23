import { describe, it, expect } from 'vitest';
import {
  computeBMI, getBMICategory, computeTier0Score,
  computeTier1Score, computeSportSpecificScore, computeFinalResult,
  SPORT_DEMANDS,
} from './ruleEngine.js';

// ===== BMI =====
describe('BMI Calculation', () => {
  it('computes BMI correctly', () => {
    expect(computeBMI(175, 78)).toBeCloseTo(25.47, 1);
    expect(computeBMI(170, 65)).toBeCloseTo(22.49, 1);
  });
  it('handles invalid inputs', () => {
    expect(computeBMI(0, 70)).toBe(0);
    expect(computeBMI(170, 0)).toBe(0);
    expect(computeBMI('', '')).toBe(0);
  });
  it('categorizes BMI correctly', () => {
    expect(getBMICategory(17)).toBe('underweight');
    expect(getBMICategory(22)).toBe('normal');
    expect(getBMICategory(27)).toBe('overweight');
    expect(getBMICategory(32)).toBe('obese');
  });
});

// ===== TIER 0 =====
describe('Tier 0 Scoring', () => {
  it('scores healthy young adult as 0', () => {
    const r = computeTier0Score({ age: '22', heightCm: '170', weightKg: '65', activityLevel: 'regular' });
    expect(r.score).toBe(0);
  });
  it('scores age 30-45 as +1', () => {
    const r = computeTier0Score({ age: '42', heightCm: '175', weightKg: '72', activityLevel: 'regular' });
    expect(r.score).toBe(1); // age +1 only
  });
  it('scores age 60+ sedentary obese as 7 (max)', () => {
    const r = computeTier0Score({ age: '65', heightCm: '165', weightKg: '100', activityLevel: 'sedentary' });
    expect(r.score).toBe(7); // age +3, obese +2, sedentary +2
  });
  it('scores light activity as +1', () => {
    const r = computeTier0Score({ age: '22', heightCm: '170', weightKg: '65', activityLevel: 'light' });
    expect(r.score).toBe(1);
  });
  it('scores overweight BMI as +1', () => {
    const r = computeTier0Score({ age: '22', heightCm: '170', weightKg: '85', activityLevel: 'regular' });
    expect(r.score).toBe(1);
  });
});

// ===== SPORT DEMAND WEIGHTS =====
describe('Sport Demand Profiles', () => {
  it('badminton recreational weight is 1.0', () => {
    expect(SPORT_DEMANDS.badminton.recreational.weight).toBe(1.0);
  });
  it('badminton competitive weight is 1.5', () => {
    expect(SPORT_DEMANDS.badminton.competitive.weight).toBe(1.5);
  });
  it('swimming recreational weight is 0.8', () => {
    expect(SPORT_DEMANDS.swimming.recreational.weight).toBe(0.8);
  });
  it('swimming competitive weight is 1.2', () => {
    expect(SPORT_DEMANDS.swimming.competitive.weight).toBe(1.2);
  });
});

// ===== TIER 1 — ABSOLUTE RED FLAGS =====
describe('Tier 1 Absolute Red Flags', () => {
  it('chest pain at rest triggers absolute red flag', () => {
    const r = computeTier1Score({ cardiac: { c1: 'frequently', c2: 'no', c3: 'no', c4: 'none' } }, 'badminton', 'recreational');
    expect(r.absoluteFlags.length).toBeGreaterThan(0);
    expect(r.absoluteFlags[0].id).toBe('cardiac_chest_pain_v1');
  });
  it('cardiac event under 3 months triggers red flag', () => {
    const r = computeTier1Score({ cardiac: { c1: 'never', c2: 'no', c3: 'no', c4: 'under_3mo' } }, 'badminton', 'recreational');
    expect(r.absoluteFlags.some(f => f.id === 'cardiac_event_recent_v1')).toBe(true);
  });
  it('recurrent fainting triggers red flag', () => {
    const r = computeTier1Score({ cardiac: { c1: 'never', c2: 'no', c3: 'recurrent', c4: 'none' } }, 'swimming', 'recreational');
    expect(r.absoluteFlags.some(f => f.id === 'cardiac_fainting_recurrent_v1')).toBe(true);
  });
  it('seizure under 6 months triggers red flag', () => {
    const r = computeTier1Score({ neurological: { n1: 'yes', n2: 'under_6mo', n3: 'no' } }, 'badminton', 'recreational');
    expect(r.absoluteFlags.some(f => f.id === 'neuro_seizure_recent_v1')).toBe(true);
  });
  it('seizure 6-12 months + swimming triggers sport-specific red flag', () => {
    const r = computeTier1Score({ neurological: { n1: 'yes', n2: '6_12mo', n3: 'no' } }, 'swimming', 'recreational');
    expect(r.absoluteFlags.some(f => f.id === 'swim_seizure_6_12mo_v1')).toBe(true);
  });
  it('severe blood sugar episode triggers red flag', () => {
    const r = computeTier1Score({ metabolic: { m1: 'yes', m2: 'oral', m3: 'severe' } }, 'badminton', 'recreational');
    expect(r.absoluteFlags.some(f => f.id === 'meta_severe_episode_v1')).toBe(true);
  });
  it('pregnancy complications trigger red flag', () => {
    const r = computeTier1Score({ pregnancy: { pg1: 'second', pg2: 'complications' } }, 'swimming', 'recreational');
    expect(r.absoluteFlags.some(f => f.id === 'pregnancy_complications_v1')).toBe(true);
  });
});

// ===== TIER 1 — POINT SCORING =====
describe('Tier 1 Point Scoring', () => {
  it('controlled BP on medication scores +2', () => {
    const r = computeTier1Score({ cardiac: { c1: 'never', c2: 'well_controlled', c3: 'no', c4: 'none' } }, 'badminton', 'recreational');
    expect(r.score).toBe(2);
  });
  it('cardiovascular domain capped at 8', () => {
    const r = computeTier1Score({ cardiac: { c1: 'occasionally', c2: 'poorly_controlled', c3: 'isolated', c4: '3_12mo' } }, 'badminton', 'recreational');
    expect(r.score).toBeLessThanOrEqual(8);
  });
  it('mild asthma scores +1-2', () => {
    const r = computeTier1Score({ respiratory: { r1: 'yes', r2: 'occasional', r3: 'rarely', r4: 'no' } }, 'swimming', 'recreational');
    expect(r.score).toBe(2); // +1 + +1
  });
  it('respiratory skipped when r1 = no', () => {
    const r = computeTier1Score({ respiratory: { r1: 'no' } }, 'swimming', 'recreational');
    expect(r.score).toBe(0);
  });
  it('insulin-dependent diabetes scores +3', () => {
    const r = computeTier1Score({ metabolic: { m1: 'yes', m2: 'insulin', m3: 'none' } }, 'swimming', 'recreational');
    expect(r.score).toBe(3);
  });
});

// ===== SPORT-SPECIFIC EXTENSIONS =====
describe('Sport-Specific Scoring', () => {
  it('badminton ACL recent + competitive triggers absolute red flag', () => {
    const r = computeSportSpecificScore({ badminton: { b1: 'no', b2: 'recent', b3: 'no', b4: 'no' } }, 'badminton', 'competitive');
    expect(r.absoluteFlags.some(f => f.id === 'bad_acl_competitive_v1')).toBe(true);
  });
  it('badminton ACL recent + recreational scores +3 (no flag)', () => {
    const r = computeSportSpecificScore({ badminton: { b1: 'no', b2: 'recent', b3: 'no', b4: 'no' } }, 'badminton', 'recreational');
    expect(r.absoluteFlags.length).toBe(0);
    expect(r.score).toBe(3);
  });
  it('swimming active ear infection forces yellow flag', () => {
    const r = computeSportSpecificScore({ swimming: { s1: 'active', s2: 'no', s3: 'no', s5: 'confident' } }, 'swimming', 'recreational');
    expect(r.absoluteFlags.some(f => f.forceYellow)).toBe(true);
  });
  it('swimming beginner adds +1 advisory', () => {
    const r = computeSportSpecificScore({ swimming: { s1: 'no', s2: 'no', s3: 'no', s5: 'beginner' } }, 'swimming', 'recreational');
    expect(r.score).toBe(1);
  });
});

// ===== WORKED EXAMPLES FROM DESIGN DOCS =====
describe('Worked Examples (Design Doc Validation)', () => {
  it('8.1: Healthy 22yo, recreational badminton → Green (risk index 0)', () => {
    const r = computeFinalResult({
      age: '22', heightCm: '170', weightKg: '65', sex: 'male',
      sport: 'badminton', intensity: 'recreational', activityLevel: 'regular',
      gateAnswer: 'no',
    });
    expect(r.band).toBe('green');
    expect(r.riskIndex).toBe(0);
  });

  it('8.2: 42yo controlled hypertension, recreational badminton → Yellow (risk index 4.0)', () => {
    const r = computeFinalResult({
      age: '42', heightCm: '175', weightKg: '72', sex: 'male',
      sport: 'badminton', intensity: 'recreational', activityLevel: 'light',
      gateAnswer: 'yes',
      tier1Answers: { cardiac: { c1: 'never', c2: 'well_controlled', c3: 'no', c4: 'none' } },
    });
    expect(r.band).toBe('yellow');
    expect(r.riskIndex).toBe(4.0);
    expect(r.baseRiskScore).toBe(4);
  });

  it('8.2: Same user, competitive badminton → Red (risk index 6.0)', () => {
    const r = computeFinalResult({
      age: '42', heightCm: '175', weightKg: '72', sex: 'male',
      sport: 'badminton', intensity: 'competitive', activityLevel: 'light',
      gateAnswer: 'yes',
      tier1Answers: { cardiac: { c1: 'never', c2: 'well_controlled', c3: 'no', c4: 'none' } },
    });
    expect(r.band).toBe('red');
    expect(r.riskIndex).toBe(6.0);
  });

  it('8.3: 16yo mild asthma, recreational swimming → Green (risk index 0.8)', () => {
    const r = computeFinalResult({
      age: '16', heightCm: '168', weightKg: '55', sex: 'male',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'regular',
      gateAnswer: 'yes',
      tier1Answers: { respiratory: { r1: 'yes', r2: 'occasional', r3: 'no', r4: 'no' } },
    });
    expect(r.band).toBe('green');
    expect(r.riskIndex).toBe(0.8);
  });

  it('8.3: Same user, competitive swimming → Green (risk index 1.2)', () => {
    const r = computeFinalResult({
      age: '16', heightCm: '168', weightKg: '55', sex: 'male',
      sport: 'swimming', intensity: 'competitive', activityLevel: 'regular',
      gateAnswer: 'yes',
      tier1Answers: { respiratory: { r1: 'yes', r2: 'occasional', r3: 'no', r4: 'no' } },
    });
    expect(r.band).toBe('green');
    expect(r.riskIndex).toBe(1.2);
  });

  it('8.4: 35yo Type 2 diabetes, recreational swimming → Green (risk index 2.4)', () => {
    const r = computeFinalResult({
      age: '35', heightCm: '170', weightKg: '72', sex: 'male',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'regular',
      gateAnswer: 'yes',
      tier1Answers: { metabolic: { m1: 'yes', m2: 'oral', m3: 'none' } },
    });
    expect(r.band).toBe('green');
    expect(r.riskIndex).toBe(2.4);
    expect(r.baseRiskScore).toBe(3);
  });

  it('8.5: 19yo ACL 8mo, competitive badminton → Red (absolute flag)', () => {
    const r = computeFinalResult({
      age: '19', heightCm: '175', weightKg: '70', sex: 'male',
      sport: 'badminton', intensity: 'competitive', activityLevel: 'light',
      gateAnswer: 'yes',
      tier1Answers: { badminton: { b1: 'no', b2: 'recent', b3: 'no', b4: 'no' } },
    });
    expect(r.band).toBe('red');
    expect(r.absoluteFlagId).toBe('bad_acl_competitive_v1');
    expect(r.doctorReviewRequired).toBe(true);
  });

  it('8.6: 60yo sedentary obese, competitive badminton → Red (risk index 10.5)', () => {
    const r = computeFinalResult({
      age: '65', heightCm: '165', weightKg: '100', sex: 'male',
      sport: 'badminton', intensity: 'competitive', activityLevel: 'sedentary',
      gateAnswer: 'no',
    });
    expect(r.band).toBe('red');
    expect(r.riskIndex).toBe(10.5);
  });

  it('8.7: Seizure 4 months ago + swimming → Red (absolute flag)', () => {
    const r = computeFinalResult({
      age: '25', heightCm: '170', weightKg: '68', sex: 'male',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'regular',
      gateAnswer: 'yes',
      tier1Answers: { neurological: { n1: 'yes', n2: 'under_6mo', n3: 'no' } },
    });
    expect(r.band).toBe('red');
    expect(r.doctorReviewRequired).toBe(true);
  });

  it('8.9: Pregnancy second trimester, cleared, recreational swimming → Green (risk index 2.4)', () => {
    const r = computeFinalResult({
      age: '32', heightCm: '165', weightKg: '62', sex: 'female',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'light',
      gateAnswer: 'yes',
      tier1Answers: { pregnancy: { pg1: 'second', pg2: 'cleared' } },
    });
    expect(r.band).toBe('green');
    expect(r.riskIndex).toBe(2.4);
  });
});

// ===== BAND THRESHOLDS =====
describe('Band Thresholds', () => {
  it('risk index < 3 → Green', () => {
    const r = computeFinalResult({
      age: '25', heightCm: '175', weightKg: '70', sex: 'male',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'regular',
      gateAnswer: 'no',
    });
    expect(r.band).toBe('green');
    expect(r.riskIndex).toBeLessThan(3);
  });

  it('risk index exactly 3 → Yellow', () => {
    // base=3, weight=1.0 → index=3.0
    const r = computeFinalResult({
      age: '42', heightCm: '170', weightKg: '65', sex: 'male',
      sport: 'badminton', intensity: 'recreational', activityLevel: 'sedentary',
      gateAnswer: 'no',
    });
    // age 30-45 (+1) + normal BMI (+0) + sedentary (+2) = 3, ×1.0 = 3.0
    expect(r.band).toBe('yellow');
    expect(r.riskIndex).toBe(3.0);
  });

  it('doctor review required for red band', () => {
    const r = computeFinalResult({
      age: '65', heightCm: '165', weightKg: '100', sex: 'male',
      sport: 'badminton', intensity: 'competitive', activityLevel: 'sedentary',
      gateAnswer: 'no',
    });
    expect(r.band).toBe('red');
    expect(r.doctorReviewRequired).toBe(true);
  });

  it('green band gets 12-month review date', () => {
    const r = computeFinalResult({
      age: '22', heightCm: '170', weightKg: '65', sex: 'male',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'regular',
      gateAnswer: 'no',
    });
    expect(r.reviewByDate).toBeTruthy();
  });
});
