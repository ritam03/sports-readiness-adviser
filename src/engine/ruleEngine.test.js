import { describe, it, expect } from 'vitest';
import {
  computeBMI, getBMICategory, computeTier0Score,
  computeGate1Score, computeGate2Score, computeGate3Score,
  computeFinalResult, SPORT_DEMANDS,
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
  });
  it('categorizes BMI', () => {
    expect(getBMICategory(17)).toBe('underweight');
    expect(getBMICategory(22)).toBe('normal');
    expect(getBMICategory(27)).toBe('overweight');
    expect(getBMICategory(32)).toBe('obese');
  });
});

// ===== TIER 0 =====
describe('Tier 0 Scoring', () => {
  it('healthy young adult = 0', () => {
    const r = computeTier0Score({ age: '22', heightCm: '170', weightKg: '65', activityLevel: 'regular', sport: 'badminton' });
    expect(r.score).toBe(0);
  });
  it('age 60+ sedentary obese = 7 (max)', () => {
    const r = computeTier0Score({ age: '65', heightCm: '165', weightKg: '100', activityLevel: 'sedentary', sport: 'badminton' });
    expect(r.score).toBe(7);
  });
  it('swimming beginner adds +1 in Tier 0 (v3: ungated)', () => {
    const r = computeTier0Score({ age: '22', heightCm: '170', weightKg: '65', activityLevel: 'regular', sport: 'swimming', waterConfidence: 'beginner' });
    expect(r.score).toBe(1);
  });
  it('swimming confident adds 0', () => {
    const r = computeTier0Score({ age: '22', heightCm: '170', weightKg: '65', activityLevel: 'regular', sport: 'swimming', waterConfidence: 'confident' });
    expect(r.score).toBe(0);
  });
});

// ===== SPORT DEMANDS =====
describe('Sport Demand Profiles', () => {
  it('badminton rec=1.0, comp=1.5', () => {
    expect(SPORT_DEMANDS.badminton.recreational.weight).toBe(1.0);
    expect(SPORT_DEMANDS.badminton.competitive.weight).toBe(1.5);
  });
  it('swimming rec=0.8, comp=1.2', () => {
    expect(SPORT_DEMANDS.swimming.recreational.weight).toBe(0.8);
    expect(SPORT_DEMANDS.swimming.competitive.weight).toBe(1.2);
  });
});

// ===== GATE 1 RED FLAGS =====
describe('Gate 1 — Absolute Red Flags', () => {
  it('chest pain at rest', () => {
    const r = computeGate1Score({ cardiac: { c1: 'frequently', c2: 'no', c3: 'no', c4: 'none' } }, 'badminton', 'recreational');
    expect(r.absoluteFlags.some(f => f.id === 'cardiac_chest_pain_v1')).toBe(true);
  });
  it('cardiac event < 3 months', () => {
    const r = computeGate1Score({ cardiac: { c1: 'never', c2: 'no', c3: 'no', c4: 'under_3mo' } }, 'badminton', 'recreational');
    expect(r.absoluteFlags.some(f => f.id === 'cardiac_event_recent_v1')).toBe(true);
  });
  it('seizure < 6 months', () => {
    const r = computeGate1Score({ neurological: { n1: 'yes', n2: 'under_6mo', n3: 'no' } }, 'badminton', 'recreational');
    expect(r.absoluteFlags.some(f => f.id === 'neuro_seizure_recent_v1')).toBe(true);
  });
  it('seizure 6-12mo + swimming', () => {
    const r = computeGate1Score({ neurological: { n1: 'yes', n2: '6_12mo', n3: 'no' } }, 'swimming', 'recreational');
    expect(r.absoluteFlags.some(f => f.id === 'swim_seizure_6_12mo_v1')).toBe(true);
  });
  it('severe blood sugar episode', () => {
    const r = computeGate1Score({ metabolic: { m1: 'yes', m2: 'oral', m3: 'severe' } }, 'badminton', 'recreational');
    expect(r.absoluteFlags.some(f => f.id === 'meta_severe_episode_v1')).toBe(true);
  });
});

// ===== GATE 1 SCORING =====
describe('Gate 1 — Point Scoring', () => {
  it('controlled BP = +2', () => {
    const r = computeGate1Score({ cardiac: { c1: 'never', c2: 'well_controlled', c3: 'no', c4: 'none' } }, 'badminton', 'recreational');
    expect(r.score).toBe(2);
  });
  it('cardiovascular capped at 8', () => {
    const r = computeGate1Score({ cardiac: { c1: 'occasionally', c2: 'poorly_controlled', c3: 'isolated', c4: '3_12mo' } }, 'badminton', 'recreational');
    expect(r.score).toBeLessThanOrEqual(8);
  });
  it('mild asthma = +1-2', () => {
    const r = computeGate1Score({ respiratory: { r1: 'yes', r2: 'occasional', r3: 'rarely', r4: 'no' } }, 'swimming', 'recreational');
    expect(r.score).toBe(2);
  });
});

// ===== GATE 2 =====
describe('Gate 2 — Injuries/Symptoms', () => {
  it('badminton ACL recent + competitive = absolute flag', () => {
    const r = computeGate2Score({ badminton: { b1: 'no', b2: 'recent', b3: 'no', b4: 'no' } }, 'badminton', 'competitive');
    expect(r.absoluteFlags.some(f => f.id === 'bad_acl_competitive_v1')).toBe(true);
  });
  it('badminton ACL recent + recreational = +3', () => {
    const r = computeGate2Score({ badminton: { b1: 'no', b2: 'recent', b3: 'no', b4: 'no' } }, 'badminton', 'recreational');
    expect(r.absoluteFlags.length).toBe(0);
    expect(r.score).toBe(3);
  });
  it('swimming ear infection active = yellow flag', () => {
    const r = computeGate2Score({ swimming: { s1: 'active', s2: 'no', s3: 'no' } }, 'swimming', 'recreational');
    expect(r.absoluteFlags.some(f => f.forceYellow)).toBe(true);
  });
  it('swimming ear recent = +2', () => {
    const r = computeGate2Score({ swimming: { s1: 'recent', s2: 'no', s3: 'no' } }, 'swimming', 'recreational');
    expect(r.score).toBe(2);
  });
});

// ===== GATE 3 =====
describe('Gate 3 — Pregnancy', () => {
  it('complications = absolute flag', () => {
    const r = computeGate3Score({ pregnancy: { pg1: 'second', pg2: 'complications' } });
    expect(r.absoluteFlags.some(f => f.id === 'pregnancy_complications_v1')).toBe(true);
  });
  it('cleared = +1', () => {
    const r = computeGate3Score({ pregnancy: { pg1: 'second', pg2: 'cleared' } });
    expect(r.score).toBe(1);
  });
});

// ===== V3 WORKED EXAMPLES =====
describe('Worked Examples (v3 Design Doc)', () => {
  it('9.1: Healthy 22yo, all gates No, rec badminton → Green (0)', () => {
    const r = computeFinalResult({
      age: '22', heightCm: '170', weightKg: '65', sex: 'male',
      sport: 'badminton', intensity: 'recreational', activityLevel: 'regular',
      gate1Answer: 'no', gate2Answer: 'no',
    });
    expect(r.band).toBe('green');
    expect(r.riskIndex).toBe(0);
  });

  it('9.2: 42yo controlled BP, Gate1=Yes Gate2=No, rec badminton → Yellow (4.0)', () => {
    const r = computeFinalResult({
      age: '42', heightCm: '175', weightKg: '72', sex: 'male',
      sport: 'badminton', intensity: 'recreational', activityLevel: 'light',
      gate1Answer: 'yes', gate2Answer: 'no',
      gate1Answers: { cardiac: { c1: 'never', c2: 'well_controlled', c3: 'no', c4: 'none' } },
    });
    expect(r.band).toBe('yellow');
    expect(r.riskIndex).toBe(4.0);
  });

  it('9.2: Same user, competitive → Red (6.0)', () => {
    const r = computeFinalResult({
      age: '42', heightCm: '175', weightKg: '72', sex: 'male',
      sport: 'badminton', intensity: 'competitive', activityLevel: 'light',
      gate1Answer: 'yes', gate2Answer: 'no',
      gate1Answers: { cardiac: { c1: 'never', c2: 'well_controlled', c3: 'no', c4: 'none' } },
    });
    expect(r.band).toBe('red');
    expect(r.riskIndex).toBe(6.0);
  });

  it('9.3: 16yo asthma, rec swimming → Green (0.8)', () => {
    const r = computeFinalResult({
      age: '16', heightCm: '168', weightKg: '55', sex: 'male',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'regular',
      gate1Answer: 'yes', gate2Answer: 'no',
      gate1Answers: { respiratory: { r1: 'yes', r2: 'occasional', r3: 'no', r4: 'no' } },
    });
    expect(r.band).toBe('green');
    expect(r.riskIndex).toBe(0.8);
  });

  it('9.4: 35yo Type2 diabetes, rec swimming → Green (2.4)', () => {
    const r = computeFinalResult({
      age: '35', heightCm: '170', weightKg: '72', sex: 'male',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'regular',
      gate1Answer: 'yes', gate2Answer: 'no',
      gate1Answers: { metabolic: { m1: 'yes', m2: 'oral', m3: 'none' } },
    });
    expect(r.band).toBe('green');
    expect(r.riskIndex).toBe(2.4);
  });

  it('9.5: 19yo ACL 8mo, Gate1=No Gate2=Yes, competitive badminton → Red (absolute flag)', () => {
    const r = computeFinalResult({
      age: '19', heightCm: '175', weightKg: '70', sex: 'male',
      sport: 'badminton', intensity: 'competitive', activityLevel: 'light',
      gate1Answer: 'no', gate2Answer: 'yes',
      gate2Answers: { badminton: { b1: 'no', b2: 'recent', b3: 'no', b4: 'no' } },
    });
    expect(r.band).toBe('red');
    expect(r.absoluteFlagId).toBe('bad_acl_competitive_v1');
    expect(r.doctorReviewRequired).toBe(true);
  });

  it('9.6: 60yo sedentary obese, both gates No, competitive badminton → Red (10.5)', () => {
    const r = computeFinalResult({
      age: '65', heightCm: '165', weightKg: '100', sex: 'male',
      sport: 'badminton', intensity: 'competitive', activityLevel: 'sedentary',
      gate1Answer: 'no', gate2Answer: 'no',
    });
    expect(r.band).toBe('red');
    expect(r.riskIndex).toBe(10.5);
  });

  it('9.7: Seizure 4 months + swimming → Red (absolute flag via Gate 1)', () => {
    const r = computeFinalResult({
      age: '25', heightCm: '170', weightKg: '68', sex: 'male',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'regular',
      gate1Answer: 'yes', gate2Answer: 'no',
      gate1Answers: { neurological: { n1: 'yes', n2: 'under_6mo', n3: 'no' } },
    });
    expect(r.band).toBe('red');
    expect(r.doctorReviewRequired).toBe(true);
  });

  it('9.9: Pregnancy cleared, rec swimming → Green (2.4) via Gate 3', () => {
    const r = computeFinalResult({
      age: '32', heightCm: '165', weightKg: '62', sex: 'female',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'light',
      gate1Answer: 'no', gate2Answer: 'no', gate3Answer: 'yes',
      gate3Answers: { pregnancy: { pg1: 'second', pg2: 'cleared' } },
    });
    expect(r.band).toBe('green');
    expect(r.riskIndex).toBe(2.4);
  });

  it('9.10: Swimmer ear tendency via Gate 2 (Gate 1 No) → Green (1.6)', () => {
    const r = computeFinalResult({
      age: '25', heightCm: '170', weightKg: '65', sex: 'male',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'regular',
      gate1Answer: 'no', gate2Answer: 'yes',
      gate2Answers: { swimming: { s1: 'recent', s2: 'no', s3: 'no' } },
    });
    expect(r.band).toBe('green');
    expect(r.riskIndex).toBe(1.6);
  });
});

// ===== THREE-GATE INDEPENDENCE =====
describe('Three-Gate Independence (v3 core fix)', () => {
  it('Gate 2 catches injuries even when Gate 1 is No', () => {
    const r = computeFinalResult({
      age: '19', heightCm: '175', weightKg: '70', sex: 'male',
      sport: 'badminton', intensity: 'competitive', activityLevel: 'light',
      gate1Answer: 'no', gate2Answer: 'yes',
      gate2Answers: { badminton: { b1: 'no', b2: 'recent', b3: 'no', b4: 'no' } },
    });
    expect(r.band).toBe('red');
  });

  it('Gate 3 catches pregnancy independently of Gates 1 and 2', () => {
    const r = computeFinalResult({
      age: '30', heightCm: '160', weightKg: '58', sex: 'female',
      sport: 'swimming', intensity: 'recreational', activityLevel: 'regular',
      gate1Answer: 'no', gate2Answer: 'no', gate3Answer: 'yes',
      gate3Answers: { pregnancy: { pg1: 'first', pg2: 'complications' } },
    });
    expect(r.band).toBe('red');
    expect(r.doctorReviewRequired).toBe(true);
  });
});
