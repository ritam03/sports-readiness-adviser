/**
 * Questionnaire Data — All question definitions, options, and metadata
 * Organized by tier and domain for the cascading multi-step flow
 */

export const TIER1_CATEGORIES = [
  { id: 'cardiac',         label: 'Heart & Blood Pressure', icon: '❤️' },
  { id: 'respiratory',     label: 'Lungs & Breathing',      icon: '🫁' },
  { id: 'metabolic',       label: 'Diabetes & Metabolism',   icon: '🧬' },
  { id: 'musculoskeletal', label: 'Bones, Joints & Muscles', icon: '🦴' },
  { id: 'neurological',    label: 'Neurological',            icon: '🧠' },
  { id: 'pregnancy',       label: 'Pregnancy',               icon: '🤰', conditional: true },
];

export const TIER1_QUESTIONS = {
  cardiac: [
    {
      id: 'c1', label: 'Have you experienced chest pain, pressure, or unusual breathlessness during physical activity in the past 12 months?',
      options: [
        { value: 'never',        label: 'Never',                                    points: 0 },
        { value: 'occasionally', label: 'Occasionally, resolves with rest',          points: 2 },
        { value: 'frequently',   label: 'Frequently, or at rest/minimal exertion',   points: 'RED_FLAG' },
      ],
    },
    {
      id: 'c2', label: 'Are you currently on blood pressure medication, a blood thinner, or a heart-rhythm medication?',
      options: [
        { value: 'no',               label: 'No',                                        points: 0 },
        { value: 'well_controlled',  label: 'Yes, condition well controlled, no symptoms', points: 2 },
        { value: 'poorly_controlled', label: 'Yes, poorly controlled or recent dose change', points: 3 },
      ],
    },
    {
      id: 'c3', label: 'Have you had any fainting spells or dizziness during or immediately after exertion in the past 12 months?',
      options: [
        { value: 'no',       label: 'No',                                             points: 0 },
        { value: 'isolated', label: 'Yes, isolated incident, medically evaluated',     points: 2 },
        { value: 'recurrent', label: 'Yes, recurrent or unexplained',                  points: 'RED_FLAG' },
      ],
    },
    {
      id: 'c4', label: 'Have you had a cardiac event or procedure (heart attack, stent, bypass surgery)?',
      options: [
        { value: 'none',      label: 'None',                                    points: 0 },
        { value: 'over_12mo', label: 'More than 12 months ago, cardiologist-cleared', points: 2 },
        { value: '3_12mo',    label: '3-12 months ago',                           points: 4 },
        { value: 'under_3mo', label: 'Under 3 months ago',                       points: 'RED_FLAG' },
      ],
    },
  ],
  respiratory: [
    {
      id: 'r1', label: 'Do you have a diagnosed respiratory condition (asthma, COPD, or similar)?',
      options: [
        { value: 'no',  label: 'No' },
        { value: 'yes', label: 'Yes' },
      ],
      gate: true, // if 'no', skip remaining respiratory questions
    },
    {
      id: 'r2', label: 'Does it flare up specifically during or after exercise?',
      options: [
        { value: 'no',         label: 'No flares',                           points: 0 },
        { value: 'occasional', label: 'Occasional, controlled with inhaler', points: 1 },
        { value: 'frequent',   label: 'Frequent flares despite inhaler use', points: 3 },
      ],
      dependsOn: { questionId: 'r1', value: 'yes' },
    },
    {
      id: 'r3', label: 'Are you currently using a rescue or maintenance inhaler?',
      options: [
        { value: 'no',     label: 'No',                          points: 0 },
        { value: 'rarely', label: 'Yes, carried but rarely used', points: 1 },
        { value: 'daily',  label: 'Yes, used daily or frequently', points: 2 },
      ],
      dependsOn: { questionId: 'r1', value: 'yes' },
    },
    {
      id: 'r4', label: 'Any hospitalization for a respiratory condition in the past 12 months?',
      options: [
        { value: 'no',  label: 'No',  points: 0 },
        { value: 'yes', label: 'Yes', points: 4 },
      ],
      dependsOn: { questionId: 'r1', value: 'yes' },
    },
  ],
  metabolic: [
    {
      id: 'm1', label: 'Do you have Type 1 or Type 2 diabetes?',
      options: [
        { value: 'no',  label: 'No' },
        { value: 'yes', label: 'Yes' },
      ],
      gate: true,
    },
    {
      id: 'm2', label: 'How is it currently managed?',
      options: [
        { value: 'diet',    label: 'Diet/lifestyle only, well controlled', points: 1 },
        { value: 'oral',    label: 'Oral medication, well controlled',     points: 2 },
        { value: 'insulin', label: 'Insulin-dependent',                    points: 3 },
      ],
      dependsOn: { questionId: 'm1', value: 'yes' },
    },
    {
      id: 'm3', label: 'Any severe low or high blood-sugar episodes in the past 3 months?',
      options: [
        { value: 'none',       label: 'None',                                    points: 0 },
        { value: 'occasional', label: 'Occasional, self-managed',                 points: 2 },
        { value: 'severe',     label: 'Severe episode requiring assistance',       points: 'RED_FLAG' },
      ],
      dependsOn: { questionId: 'm1', value: 'yes' },
    },
    {
      id: 'm4', label: 'Any other managed metabolic or endocrine condition (e.g. thyroid)?',
      options: [
        { value: 'no',  label: 'No',                           points: 0 },
        { value: 'yes', label: 'Yes, disclosed and controlled', points: 1 },
      ],
    },
  ],
  musculoskeletal: [
    {
      id: 'ms1', label: 'Any surgery or major injury in the last 12 months?',
      options: [
        { value: 'no',        label: 'No',                                          points: 0 },
        { value: 'over_6mo',  label: 'Yes, >6 months ago, fully rehabbed & cleared', points: 1 },
        { value: '3_6mo',     label: 'Yes, 3-6 months ago',                          points: 3 },
        { value: 'under_3mo', label: 'Yes, under 3 months ago',                      points: 'CONDITIONAL' },
      ],
    },
    {
      id: 'ms2', label: 'Any current joint pain or swelling, even at rest?',
      options: [
        { value: 'no',         label: 'No',                        points: 0 },
        { value: 'mild',       label: 'Mild, intermittent',         points: 2 },
        { value: 'persistent', label: 'Persistent or significant',  points: 4 },
      ],
    },
    {
      id: 'ms3', label: 'History of a ligament tear or reconstruction (ACL, ankle, shoulder)?',
      options: [
        { value: 'no',     label: 'No',                                          points: 0 },
        { value: 'old',    label: 'Yes, fully rehabbed, >12 months, cleared',     points: 1 },
        { value: 'recent', label: 'Yes, <12 months or not formally cleared',      points: 3 },
      ],
    },
  ],
  neurological: [
    {
      id: 'n1', label: 'Do you have a diagnosed seizure disorder?',
      options: [
        { value: 'no',  label: 'No' },
        { value: 'yes', label: 'Yes' },
      ],
      gate: true,
    },
    {
      id: 'n2', label: 'How long since your last seizure?',
      options: [
        { value: 'under_6mo', label: 'Under 6 months',                      points: 'RED_FLAG' },
        { value: '6_12mo',    label: '6-12 months',                          points: 4 },
        { value: 'over_12mo', label: 'Over 12 months, doctor-cleared',       points: 1 },
      ],
      dependsOn: { questionId: 'n1', value: 'yes' },
    },
    {
      id: 'n3', label: 'Any balance or coordination issues unrelated to seizures?',
      options: [
        { value: 'no',          label: 'No',                              points: 0 },
        { value: 'mild',        label: 'Mild',                            points: 2 },
        { value: 'significant', label: 'Significant, fall risk',           points: 4 },
      ],
      dependsOn: { questionId: 'n1', value: 'yes' },
    },
  ],
  pregnancy: [
    {
      id: 'pg1', label: 'Which trimester are you currently in?',
      options: [
        { value: 'first',  label: 'First trimester' },
        { value: 'second', label: 'Second trimester' },
        { value: 'third',  label: 'Third trimester' },
      ],
    },
    {
      id: 'pg2', label: 'Has your doctor flagged any complications for this pregnancy?',
      options: [
        { value: 'cleared',       label: 'No, doctor has cleared exercise',  points: 1 },
        { value: 'complications', label: 'Yes, complications flagged',       points: 'RED_FLAG' },
      ],
    },
  ],
};

export const SPORT_SPECIFIC_QUESTIONS = {
  badminton: [
    {
      id: 'b1', label: 'Current or recent knee or ankle pain that worsens with lunging or jumping?',
      options: [
        { value: 'no',              label: 'No',                        points: 0 },
        { value: 'mild',            label: "Mild, doesn't limit play",   points: 1 },
        { value: 'moderate_severe', label: 'Moderate-severe, limits play', points: 3 },
      ],
    },
    {
      id: 'b2', label: 'History of an ACL or major ankle ligament injury?',
      options: [
        { value: 'no',     label: 'No',                                      points: 0 },
        { value: 'old',    label: 'Yes, 12+ months ago, fully rehabbed',       points: 1 },
        { value: 'recent', label: 'Yes, <12 months or not formally cleared',   points: 'CONDITIONAL' },
      ],
    },
    {
      id: 'b3', label: 'Shoulder pain, especially overhead or rotator-cuff type?',
      options: [
        { value: 'no',              label: 'No',              points: 0 },
        { value: 'mild',            label: 'Mild',            points: 1 },
        { value: 'moderate_severe', label: 'Moderate-severe', points: 2 },
      ],
    },
    {
      id: 'b4', label: 'Chronic lower-back pain?',
      options: [
        { value: 'no',      label: 'No',                              points: 0 },
        { value: 'managed', label: 'Managed, no flares',               points: 1 },
        { value: 'flares',  label: 'Flares with twisting or lunging',  points: 2 },
      ],
    },
  ],
  swimming: [
    {
      id: 's1', label: 'Current ear infection, perforated eardrum, or grommets/tubes?',
      options: [
        { value: 'no',     label: 'No',                              points: 0 },
        { value: 'recent', label: 'Resolved less than 2 weeks ago',   points: 2 },
        { value: 'active', label: 'Active',                           points: 'YELLOW_FLAG' },
      ],
    },
    {
      id: 's2', label: 'Active skin infection, open wound, or a condition chlorine could aggravate?',
      options: [
        { value: 'no',     label: 'No',     points: 0 },
        { value: 'active', label: 'Active', points: 'YELLOW_FLAG' },
      ],
    },
    {
      id: 's3', label: 'Does exercise or chlorine specifically trigger respiratory symptoms in the water?',
      options: [
        { value: 'no',         label: 'No flares',                            points: 0 },
        { value: 'occasional', label: 'Occasional, inhaler-controlled',        points: 1 },
        { value: 'frequent',   label: 'Frequent despite inhaler',              points: 3 },
      ],
    },
    {
      id: 's5', label: 'How confident are you in deep water?',
      options: [
        { value: 'confident', label: 'Confident swimmer', points: 0 },
        { value: 'beginner',  label: 'Beginner / learning', points: 1 },
      ],
    },
  ],
};
