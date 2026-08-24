# Architecture & Design Document (v3)

## System Architecture

```mermaid
graph TB
    subgraph Browser["CLIENT (Browser)"]
        UI["Multi-Step UI Wizard<br/>(main.js + modules)"]
        RE["Deterministic Rule Engine<br/>(ruleEngine.js)"]
        SD["Sport-Demand Map<br/>(SPORT_DEMANDS)"]
        DO["Decision Orchestrator<br/>(computeFinalResult)"]
        AI["Gemini AI Layer<br/>(gemini.js)"]
    end
    API["Gemini API<br/>(External)"]

    UI --> RE
    UI --> SD
    RE --> DO
    SD --> DO
    DO --> AI
    AI <--> API
    DO --> UI
```

## Screening Flow (v3 — Three Independent Gates)

```mermaid
flowchart TD
    A[Landing Page] --> B[Step 1: Age, Sex, Height/Weight]
    B --> C[Step 2: Sport Selection]
    C --> D[Step 3: Activity Level, Intensity, Water Confidence]
    D --> E[Step 4: Three Independent Gate Questions]

    E --> G1{Gate 1: Diagnosed<br/>conditions?}
    E --> G2{Gate 2: Injuries,<br/>symptoms, infections?}
    E --> G3{Gate 3: Currently<br/>pregnant?}

    G1 -->|Yes| F1[Category Selection]
    F1 --> F2[Domain Follow-up Questions]
    G1 -->|No| MERGE

    G2 -->|Yes| F3[Musculoskeletal + Sport-Specific Questions]
    G2 -->|No| MERGE

    G3 -->|Yes| F4[Pregnancy Questions]
    G3 -->|No| MERGE

    F2 --> MERGE[Scoring Engine]
    F3 --> MERGE
    F4 --> MERGE

    MERGE --> R[Result Page with AI Explanation]
```

## Why Three Gates Instead of One

```mermaid
flowchart LR
    subgraph Old["OLD: Single Gate"]
        SG["'Diagnosed condition<br/>or medication?'"]
        SG -->|No| MISS["Injuries, infections,<br/>pregnancy ALL SKIPPED"]
    end
    subgraph New["NEW: Three Independent Gates"]
        G1N["Gate 1: Diagnosed conditions"]
        G2N["Gate 2: Injuries & symptoms"]
        G3N["Gate 3: Pregnancy"]
        G1N -->|No| G2N
        G2N -->|Yes| CATCH["Catches undiagnosed<br/>injuries & infections"]
    end
```

**Key example**: A 19-year-old with an ACL reconstruction 8 months ago correctly answers "No" to Gate 1 (not a "diagnosed condition" in their mind) but "Yes" to Gate 2 (injury in the last 12 months). Under the old single-gate design, this case would have reached a false Green.

## Scoring Pipeline

```mermaid
flowchart TD
    T0["Tier 0 Points<br/>(age + BMI + activity + water confidence)"]
    G1S["Gate 1 Domain Points<br/>(cardiac, respiratory, metabolic, neuro)<br/>Each domain capped"]
    G2S["Gate 2 Points<br/>(musculoskeletal + sport-specific)<br/>Capped at 8"]
    G3S["Gate 3 Points<br/>(pregnancy advisory)"]

    T0 --> BRS["Base Risk Score = Sum"]
    G1S --> BRS
    G2S --> BRS
    G3S --> BRS

    BRS --> MUL["× Sport Demand Weight"]
    MUL --> RI["Risk Index"]

    RI --> |"< 3"| GREEN["🟢 Green: Clear to start"]
    RI --> |"3 to < 6"| YELLOW["🟡 Yellow: Modified start"]
    RI --> |"≥ 6"| RED["🔴 Red: Doctor review"]

    AF["Absolute Red Flags<br/>(bypass scoring)"] --> RED
```

## AI Architecture

```mermaid
flowchart LR
    RE2["Rule Engine Output<br/>(band, rules, risk index)"]
    RE2 --> M2["gemini-2.5-flash<br/>Result Explanation"]
    FT["Free-text Input"] --> M1["gemini-2.0-flash<br/>Triage Tagging"]
    M2 --> RP["Result Page"]
    M1 --> RP
```

### Model Responsibilities

| Model | Task | Decides Band? |
|-------|------|:---:|
| gemini-2.0-flash | Free-text triage tagging | ❌ |
| gemini-2.5-flash | Result explanation generation | ❌ |
| Rule Engine | All scoring and band assignment | ✅ |

## Doctor-in-the-Loop (Demo)

```mermaid
flowchart TD
    R["Red Band Output"] --> PKG["Auto-generated Review Package<br/>(answers, rules fired, risk index)"]
    PKG --> DOC["Doctor Reviews Case"]
    DOC --> A1["Approve as-is"]
    DOC --> A2["Approve with modification"]
    DOC --> A3["Request live consult"]
    DOC --> A4["Decline with reason"]

    style R fill:#ef4444,color:white
    style DOC fill:#3b82f6,color:white
```

> **Note**: In this demo, Red-band results show a banner indicating doctor review would be required. The actual doctor console is not implemented.

## Data Flow

All data stays client-side. No backend server exists. The only external call is to the Gemini API for generating explanations.

## Security Note

The Gemini API key is embedded client-side for demo purposes. Production would route through a backend proxy with proper key management.
