# STRAITS V4 — The Long Crisis

## Purpose

STRAITS V4 should make the crisis feel longer, harsher, and more strategically recoverable. The player should be able to hit economic danger without feeling softlocked, but every recovery path should be ugly: solvency returns at the cost of legitimacy, domestic patience, credibility, or future stability.

This document is design-only. It does not change current gameplay.

## 1. War Room Campaign Length

Current War Room runs tend to end around Day 45. That is tight for multi-day Operations, especially when several require 5-8 days and compete for scarce chest, economy, and slot capacity.

Recommended V4 default:

- **60-day War Room campaign** as the standard V4 pacing.
- This gives Operations more room to start, stall, resolve, and matter to endings.
- The extra time should increase strategic breathing room, not reduce pressure.

Optional future modes:

- **45-day Classic:** preserves the current short, sharp crisis pacing.
- **60-day Standard:** recommended V4 default.
- **90-day Long War:** attrition-forward mode for deeper Operations, doctrine, and institutional memory systems.

## 2. War Chest And Economy Recovery

Observed problem:

- Chest can reach 0.
- Operations become unaffordable.
- Economy recovery can feel too punishing.
- Once the player is broke, the Operations layer can become visible but unusable.

V4 should add ugly recovery paths that are available through existing decision/event/operation surfaces. These should restore liquidity or stabilize markets, but never for free.

### Emergency Liquidity Measures

Purpose: immediate cash injection during collapse.

Possible effects:

- `chest +12`
- `economy +4`
- `domestic -6`
- `credibility -4`
- `warWeariness +5`

Design note: this is the blunt "keep the lights on" option. It should feel embarrassing but useful.

### War Bond Campaign

Purpose: recover chest by asking the public to finance the crisis.

Possible effects:

- `chest +10`
- `domestic -4`
- `warWeariness +6`
- `publicTrust -3`

Design note: stronger if domestic trust is high; weaker or riskier if trust is already low.

### Allied Credit Line

Purpose: restore liquidity through allies.

Possible effects:

- `chest +14`
- `allianceCohesion +4`
- `credibility -5`
- `domestic -3`

Design note: useful for coalition factions, but should imply dependency and political cost.

### Central Bank Swap Line

Purpose: reduce financial panic without directly solving every fiscal problem.

Possible effects:

- `financialContagion -12`
- `economy +6`
- `chest +4`
- `credibility -3`

Design note: this should be one of the cleanest recovery tools, but not always available.

### Strategic Reserve Release

Purpose: convert reserves into short-term economic relief.

Possible effects:

- `economy +8`
- `fuel +6`
- `chest +5`
- `credibility -2`
- `warWeariness +3`

Design note: helps oil/fuel-linked crashes, but reduces future optionality.

### Capital Controls

Purpose: stop the bleeding when markets are running.

Possible effects:

- `financialContagion -15`
- `chest +6`
- `economy -4`
- `global -6`
- `credibility -8`

Design note: powerful, ugly, and internationally costly.

## 3. Anti-Softlock Rule

V4 should guarantee at least one recovery option is eligible when any of these are true:

- `chest <= 5`
- `economy <= 35`
- `financialContagion >= 60`

Preferred rule:

When the economy is in distress, at least one finance-tagged recovery choice, crisis event response, or emergency operation should be available within the next decision cycle.

Constraints:

- Do not give free money every turn.
- Recovery should require a choice.
- Recovery should trade solvency for political or strategic pain.
- The player should be able to recover enough to re-enter Operations play, not erase the crisis.

## 4. Operation Balance Notes

### OP-08 Emergency Market Stabilization

OP-08 may need stronger recovery or lower cost in V4. It is the natural answer to financial collapse, so if it is too expensive when the player needs it most, it can feel like a locked door.

Potential tuning direction:

- Lower start cost.
- Increase success recovery to `financialContagion` and `economy`.
- Make partial outcomes meaningfully useful.
- Keep failure painful, but avoid making failure end the run by itself.

### OP-04 Sanctions Package

OP-04 should remain a serious tradeoff: sanctions create leverage, credibility, and chest upside, but should not single-handedly make economy recovery impossible.

Potential tuning direction:

- Reduce recurring economy upkeep pressure.
- Keep economy pain on start or failure.
- Increase compensation through `chest`, `credibility`, or `allianceCohesion`.
- Preserve faction differences, especially EU/ASEAN sanctions sensitivity.

## 5. Future V4 Systems

### Institution Memory

Track what institutions learned or lost over the campaign: central banks, alliances, parliaments, militaries, aid agencies, and media ecosystems. Repeated choices should build trust, fatigue, doctrine, or institutional scars.

### Rival Posture

Give rivals clearer long-term posture states: deterred, probing, cornered, opportunistic, exhausted, or escalatory. Rival posture should react to Operations, economy, military choices, and endings.

### Life Mode Household System

Deepen Life Mode with household members, obligations, shared resources, conflict, care burdens, and household-level endings. The player should feel that survival is social, not only individual.

### Doctrine Trees

Add lightweight doctrine paths based on repeated behavior: coalition leadership, coercive finance, hard deterrence, humanitarian legitimacy, domestic control, proxy warfare, or resilience economics.

### Better Personalized Endings

Endings should reference the player's actual crisis history: completed Operations, abandoned projects, institutional damage, doctrine patterns, rival posture, household outcomes, and late-game recovery decisions.

## 6. Implementation Roadmap

### V4.0 Long Crisis Balance Pass

- Set 60-day War Room as the default.
- Tune operation costs, durations, and recovery effects.
- Ensure Operations have enough calendar space to matter.
- Preserve 45-day pacing as a future Classic option.

### V4.1 Strategic Economy Recovery

- Add emergency finance recovery paths.
- Add anti-softlock eligibility rules.
- Tune OP-08 and OP-04 around the longer campaign.
- Make recovery visible, costly, and strategically ugly.

### V4.2 Institution Memory

- Track institutional trust, fatigue, and capability.
- Let repeated decisions shape future options.
- Reflect institutional state in endings.

### V4.3 Rival Posture

- Add rival posture states and transitions.
- Connect posture to Operations, crisis stats, and military/economic decisions.
- Use posture to shape late-game event pressure.

### V4.4 Life Household System

- Add household members and obligations.
- Share resources across household needs.
- Add household conflict, care, and resilience outcomes.

### V4.5 Doctrine Trees And Legacy Endings

- Add doctrine progression from repeated strategic behavior.
- Expand ending panels with doctrine, institutional, rival, operation, and household records.
- Make V4 endings feel like a legacy report, not only a final grade.
