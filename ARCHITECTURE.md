# Architecture & Design Document

## System Architecture

The Sports Readiness Adviser is a **client-side-only** application. All computation — rule engine scoring, band assignment, and AI API calls — happens in the browser. There is no backend server.

```
                        ┌──────────────────────────────┐
                        │       USER'S BROWSER          │
                        │                               │
  ┌─────────────┐       │  ┌──────────────────────┐    │
  │  Gemini API │◄──────│──│   AI Layer            │    │
  │  (External) │───────│──│   gemini.js            │    │
  └─────────────┘       │  └──────────┬───────────┘    │
                        │             │                 │
                        │  ┌──────────▼───────────┐    │
                        │  │  Decision Orchestrator │    │
                        │  │  (in ruleEngine.js)    │    │
                        │  └──┬───────────┬────────┘    │
                        │     │           │              │
                        │  ┌──▼────┐  ┌──▼──────────┐  │
                        │  │ Rule  │  │ Sport-Demand │  │
                        │  │Engine │  │ Map          │  │
                        │  └───────┘  └─────────────┘  │
                        │                               │
                        │  ┌──────────────────────┐    │
                        │  │  Multi-Step UI Wizard  │    │
                        │  │  (main.js)             │    │
                        │  └──────────────────────┘    │
                        └──────────────────────────────┘
```

## Data Flow

```
User Input (Tier 0)
       │
       ▼
Gate Question ──No──► computeTier0Score() ──► computeFinalResult()
       │                                              │
      Yes                                             ▼
       │                                        Risk Index + Band
       ▼                                              │
Category Selection                                    ▼
       │                                     generateResultExplanation()
       ▼                                        (Gemini 2.5-flash)
Tier 1 Domain Questions                               │
       │                                              ▼
       ▼                                        Result Page
Sport-Specific Questions
       │
       ▼
computeTier1Score() + computeSportSpecificScore()
       │
       ▼
computeFinalResult() ──► Risk Index + Band
```

## Scoring Pipeline

### Step 1: Base Risk Score
Sum of all Tier 0 points + Tier 1 domain points (each domain capped) + sport-specific extension points.

### Step 2: Sport Demand Weight
Each sport × intensity combination has a clinically-derived demand weight. Swimming recreational (0.8) is lower than badminton competitive (1.5) because joint/impact load differs structurally.

### Step 3: Absolute Red Flags
Checked at every point during Tier 1 and sport-specific scoring. If any flag fires, scoring is bypassed entirely — the case routes straight to Red/doctor review.

### Step 4: Risk Index
`risk_index = base_risk_score × sport_demand_weight`

### Step 5: Band Assignment
- `risk_index < 3` → Green
- `3 ≤ risk_index < 6` → Yellow
- `risk_index ≥ 6` → Red

## AI Architecture

### Why Cascading Multi-Model?

Different tasks have different requirements:

| Task | Model | Rationale |
|------|-------|-----------|
| Free-text triage tagging | gemini-2.0-flash | Speed matters; structured JSON output; no creativity needed |
| Result explanation | gemini-2.5-flash | Empathy and tone matter; grounded reasoning from rules; longer output |

### Prompt Engineering Principles

1. **Grounding**: The result explanation prompt includes every rule that fired, the exact risk index, and the band. The model is instructed to reference ONLY these factors.
2. **Constraint**: The model is explicitly told it does NOT decide the band — only explains it.
3. **Tone**: Warm, conversational, non-clinical. Never uses "diagnosis". Always uses "screening".
4. **Fallback**: If the API fails, a deterministic fallback generates a reasonable explanation.

## UI Architecture

### State Management
A simple object (`state`) holds all user inputs. No reactive framework — DOM updates are triggered by full re-renders of each step. This is acceptable because:
- Each step is a single view (no partial updates needed)
- Step transitions are infrequent (user-triggered)
- Re-render cost is negligible for simple form views

### Progressive Disclosure
The `STEPS` array defines the step sequence. The `render()` function dispatches to the appropriate renderer. Steps are added/removed dynamically based on gate answers:
- Gate = No: Steps skip from gate directly to result
- Gate = Yes: Category selection → domain questions → sport-specific → result

### Validation
Each step validates its inputs before enabling the Continue button. No form submission occurs until all required fields are complete.

## Security Considerations

### API Key Exposure
The Gemini API key is embedded client-side. This is acceptable for a demo but NOT for production. In production:
- Route API calls through a backend proxy
- Use server-side API key storage
- Implement rate limiting

### Data Privacy
- No data is stored or persisted
- No data is sent to any server except Gemini API (for explanation generation)
- Medical screening data stays in browser memory only
- Consent is captured before Tier 1 (medical) data is collected

## Testing Strategy

Tests validate the **deterministic scoring engine** — the only component that makes decisions. The AI layer is not tested because:
1. It doesn't decide anything (the band is always deterministic)
2. LLM outputs are non-deterministic by nature
3. A fallback exists if the AI is unavailable

The test suite includes all 9 worked examples from the design document as ground-truth validation.
