/**
 * Gemini AI Integration — Cascading Multi-Model
 * Model 1 (gemini-2.0-flash): Adaptive micro-copy & free-text triage
 * Model 2 (gemini-2.5-flash): Rich output explanation grounded in rules
 */

const API_KEY = 'AIzaSyBPJg9IWYZ1h3DP7lRhN43Fzm7RM1-xH3U';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGemini(model, prompt, maxTokens = 1024) {
  try {
    const res = await fetch(`${API_BASE}/${model}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    console.error('Gemini API call failed:', err);
    return null;
  }
}

/**
 * Model 1: gemini-2.0-flash — Generate empathetic transition text between steps
 */
export async function generateStepTransition(stepContext) {
  const prompt = `You are a warm, professional sports health screening assistant. Generate a single SHORT encouraging sentence (max 20 words) to transition the user to the next step of their screening questionnaire.

Context: ${stepContext}

Rules:
- Be warm and conversational, not clinical
- Never diagnose or give medical advice
- Never mention any brand name
- Keep it to ONE sentence, under 20 words
- Don't use exclamation marks excessively`;

  return await callGemini('gemini-2.0-flash', prompt, 100);
}

/**
 * Model 1: gemini-2.0-flash — Tag free-text answers for triage
 */
export async function tagFreeText(freeText) {
  const prompt = `You are a medical triage tagging system. Analyze this free-text health disclosure and return ONLY a JSON object with:
- "urgency": "low" | "medium" | "high" | "emergency"
- "categories": array of relevant medical categories from ["cardiac","respiratory","metabolic","musculoskeletal","neurological","pregnancy","other"]
- "summary": one-sentence clinical summary (max 15 words)

User's text: "${freeText}"

Return ONLY valid JSON, nothing else.`;

  const result = await callGemini('gemini-2.0-flash', prompt, 200);
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { urgency: 'medium', categories: ['other'], summary: 'Free-text response requires manual review' };
  }
}

/**
 * Model 2: gemini-2.5-flash — Generate rich, grounded result explanation
 */
export async function generateResultExplanation(result) {
  const sportLabels = { badminton: 'Badminton', swimming: 'Swimming' };
  const bandDescriptions = {
    green: 'CLEARED to start at the requested intensity',
    yellow: 'Can start with MODIFICATIONS, re-check recommended',
    red: 'DOCTOR REVIEW REQUIRED before starting',
  };

  const rulesDescription = result.rulesFired
    .map(r => `- ${r.desc} (${r.pts !== undefined ? '+' + r.pts + ' pts' : 'flag'})`)
    .join('\n');

  const prompt = `You are a sports readiness screening advisor generating a result explanation. The screening uses evidence-based rules derived from PAR-Q+ and ACSM pre-participation frameworks. Your role is ONLY to explain — you do NOT decide the band.

SCREENING RESULT:
- Band: ${result.band.toUpperCase()} — ${bandDescriptions[result.band]}
- Sport: ${sportLabels[result.sport]}
- Intensity: ${result.intensity}
- Risk Index: ${result.riskIndex !== null ? result.riskIndex : 'N/A (absolute flag triggered)'}
- Base Risk Score: ${result.baseRiskScore !== null ? result.baseRiskScore : 'N/A'}
- Sport Demand Weight: ${result.sportDemandWeight || 'N/A'}
${result.absoluteFlagId ? `- Absolute Flag: ${result.absoluteFlags.map(f => f.desc).join('; ')}` : ''}
${result.reviewByDate ? `- Re-check Date: ${result.reviewByDate}` : ''}

RULES THAT FIRED:
${rulesDescription || 'No specific risk factors identified'}

BMI: ${result.bmi ? result.bmi.toFixed(1) : 'N/A'}

INSTRUCTIONS:
1. Write a warm, conversational explanation in 2-3 short paragraphs
2. Reference the SPECIFIC factors from the rules above — never invent factors
3. For GREEN: encourage them, mention any advisory notes naturally
4. For YELLOW: explain what modifications to consider, mention the re-check timeline
5. For RED: reassure them this is a precaution, explain that a doctor review is the next step, never alarm them
6. Use plain language a non-medical person would understand
7. Never name any brand or platform
8. Never use the word "diagnosis" — this is screening, not diagnosis
9. End with one practical, actionable suggestion specific to their sport
10. Do NOT use markdown headers or bullet points — write in flowing paragraphs
11. Keep total response under 180 words`;

  const explanation = await callGemini('gemini-2.5-flash', prompt, 500);

  if (!explanation) {
    return getFallbackExplanation(result);
  }
  return explanation;
}

function getFallbackExplanation(result) {
  const sportLabel = result.sport === 'badminton' ? 'badminton' : 'swimming';
  if (result.band === 'green') {
    return `Great news — based on everything you've shared, you're clear to start ${result.intensity} ${sportLabel}. Your screening didn't flag any concerns that would require modifications or a doctor's review at this stage.\n\nWe'd suggest starting with 2-3 sessions a week and building up gradually over the first few weeks. No follow-up is needed from our end unless something changes — we'll prompt you to re-check in 12 months.`;
  } else if (result.band === 'yellow') {
    return `You can get started with ${result.intensity} ${sportLabel}, but we'd recommend a gradual approach based on the factors your screening picked up. Start at a lower intensity for the first few weeks and build up as you feel comfortable.\n\nWe'll ask you to re-check in about 4 weeks so we can see how things are going. If anything feels off before then — unusual pain, breathlessness, or discomfort — take a break and consider speaking with a doctor.`;
  } else {
    return `Based on what you've shared, we'd like a doctor to review your screening before you begin ${result.intensity} ${sportLabel}. This isn't a diagnosis or a judgment on your fitness — it's a precaution that sports medicine guidelines recommend for your particular combination of factors.\n\nA sports physician can review your case and provide specific guidance. In the meantime, lighter activities or a different sport may still be an option for you.`;
  }
}
