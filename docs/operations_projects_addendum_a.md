# Addendum A — Edge Cases, Synergies, and Balance

**Applies to:** Operations & Projects Design v1.0 · STRAIT PROTOCOL: 2030
**Status:** Implementation-ready. Where this addendum and the base design conflict, this addendum wins.
**Clock note:** the War Room campaign clock in code is **Day 45** (turns advance `rnd(2,4)` days ≈ 14–16 turns). All War Room numbers below use the 45-day clock.

---

## 1. Edge-Case Rules

These are rules, not options. Implement exactly as stated.

**R1 — Same-day resolutions.** When multiple operations reach `progress >= duration` on the same day, resolve in **start-day order** (earliest started first); ties broken by slot index (slot 0 first). Each resolution draws its own `rng()` roll in that order — order is therefore deterministic and save-stable. Resolution cards render sequentially before the day's scenario card.

**R2 — Loaded save where the trigger is no longer true.** Triggers are checked **only at start time**. An active operation never re-validates its trigger; it continues normally after load. The *available* list in the picker is always re-evaluated live against current state.

**R3 — Campaign ends with operations still active.** No refunds, no resolution rolls. Active ops are written to `opsHistory` as `outcome: "incomplete"` and listed in the ending screen / export under "Incomplete at end." **Exception:** an op that has already reached `progress >= duration` but whose resolution card has not yet displayed resolves first, before ending computation — the player earned the roll.

**R4 — Abandon.** Abandoning forfeits the start cost and all upkeep already paid, applies **no failure consequence and no roll**, frees the slot immediately, and puts that op id on a **1-day cooldown** (cannot restart until the next calendar day). Abandon writes `outcome: "abandoned"` to `opsHistory`.

**R5 — Abandon while suspended.** Allowed; identical to R4. Suspended days are not refunded in any form.

**R6 — Suspension (insufficient resources).** If an upkeep charge cannot be paid in full (the paying stat would clamp at 0), the op becomes **suspended**: no progress accrual, no upkeep charges, and **no risk-tick rolls** (the op is dormant). Suspension auto-checks each day; the op resumes the day the upkeep becomes affordable. After **4 cumulative suspended days**, the op auto-abandons per R4 (logged as `"abandoned (stalled)"`).

**R7 — Starting late in the campaign.** An op **cannot be started** if `remainingDays < duration`. The picker shows it greyed with the reason "Insufficient time — needs N days." No partial-credit starts.

**R8 — Duplicates and repeats.** At most **one active instance per op id** at any time, ever. Repeatability after resolution: `OP-03` and `PJ-10` are repeatable without limit (PJ-10 carries its escalating failure weight per the base design); `OP-06` is limited to once per act; **all other ops are once per campaign after a Success or Partial**. After a **Failure**, any op may be retried once following a **3-day cooldown**; a second Failure locks it for the campaign.

**R9 — Follow-up event queueing.** Follow-ups enter a FIFO `pendingFollowUps` queue. **At most one interstitial event is injected per day**, with priority **follow-up > chain event > sudden crisis**. A suppressed chain/sudden event is not lost — it simply remains eligible for its normal roll on subsequent days. Follow-ups never expire; they drain one per day until empty.

**R10 — Stat clamps.** All op effects apply through the existing `cl()` / `applyCrisis` clamps. Overflow above 100 or below 0 is **lost — never banked**. Ops are **not exempt from collapse rules**: a failure consequence that drives a survival stat (`stability`, `domestic`, Life `cash`-driven collapse conditions, etc.) to its collapse threshold triggers the collapse exactly as an event would.

**R11 — Endings timing.** Op outcomes apply stats and set flags **immediately**, which means they can trigger an immediate collapse ending via R10. Narrative/grade endings are computed **only at campaign end**, reading flags and `opsHistory`. Single designed exception: PJ-03's follow-up *"The Window Opens"* may legitimately end a Life run early with the migration ending — it is the only op-driven early exit.

---

## 2. Synergy / Conflict Matrix

Implement as a single data table `OP_SYNERGIES` in `src/game/data.ts`:
`{ source, target, type: "score" | "cost" | "severity" | "block" | "trigger", value, note }` — evaluated in `availableOps()` (block/trigger), `resolveOp()` (score), `tickOps()` (severity/cost). Synergies require the source to be **resolved with Success or Partial** unless marked *(while active)*.

| # | Source | Target | Effect | Reason | Implementation note |
|---|--------|--------|--------|--------|---------------------|
| S1 | OP-01 Backchannel ✓ | OP-10 Ceasefire Framework | `score +12`; trigger unlocks one act early | Trust channel already exists | `type:"score"` + `type:"trigger"`; check flag `op_backchannel` |
| S2 | OP-05 Humanitarian Corridor ✓ | OP-10 Ceasefire Framework | `score +8` | Legitimacy makes terms sellable | `type:"score"` |
| S3 | OP-04 Sanctions Package *(while active)* | OP-05 Humanitarian Corridor | `score −10`; corridor risk-tick rate +1 band | Sanctions choke the same routes aid uses | Conflict; both directions apply (OP-05 active also gives OP-04 `score −5`) |
| S4 | OP-02 Cyber Defense Surge ✓ | OP-06 Intelligence Collection | `score +10` | Clean networks protect collection | `type:"score"` |
| S5 | OP-02 Cyber Defense Surge *(while active or ✓)* | Cyber chain events | Cyber-tagged chain/sudden effects halved (round toward zero) | Hardened infrastructure | `type:"severity"`, key on event tag `cyber` |
| S6 | OP-03 Carrier Resupply ✓ (each) | Fleet system / endings | Target fleet exits CRITICAL; counts toward E3 *"Logistics Won This"*; while any OP-03 is active, out-of-supply readiness penalty halved | Active replenishment pipeline | Severity hook in fleet tick; counter `op03_successes` for E3 |
| S7 | OP-08 Market Stabilization ✓ | Financial crash chains | Financial-tagged chain severity −50%; `financialContagion` floor 15 for 10 days | Backstop absorbs panic | `type:"severity"`, tag `finance`, store `expiresDay` |
| S8 | OP-09 Evacuation Planning ✓ | Refugee/humanitarian spikes | First `escalationLevel ≥ 80` spike replaced by mitigation (per base design); additionally refugee-tagged sudden effects −30% while flag set | Plans absorb shocks | One-shot flag `op_evac_ready` + `type:"severity"` tag `refugee` |
| S9 | PJ-10 Side Hustle *(while active)* | PJ-08 Community Network | **Block** — cannot run simultaneously; if PJ-10 ever Failed, PJ-08 `score −10` permanently | Grey money poisons local trust | `type:"block"`; permanent malus keys on `opsHistory` |
| S10 | PJ-05 Repair Family Trust ✓ | PJ-07 Health Routine / stress ticks | PJ-07 `score +10`; all stress-type risk-ticks campaign-wide fire at −5% rate | Support system reduces burnout | `type:"score"` + global tick modifier |
| S11 | PJ-03 Migration Packet *(while active or ✓)* | PJ-08 Community Network, PJ-05 Family Trust | Both `score −10`; PJ-08 benefit `reputation` gain halved | One foot out the door | Conflict; the exit-vs-roots tension is the point — do not soften |
| S12 | PJ-04 Stockpile ✓ + PJ-09 Backup Power ✓ | *Fortress Household* ending (E5) | Pair completion is the E5 requirement; pair also negates blackout AND shortage events entirely | Self-sufficient household | Ending precondition + `type:"severity"` full negate, tags `blackout`,`shortage` |
| S13 | PJ-09 Backup Power ✓ | PJ-02 Upskill / remote-work events | PJ-02 `score +8`; remote-work-tagged events always take their positive branch availability | Connectivity = career continuity | `type:"score"` + event tag `remote` |

Stacking rule: score modifiers from synergies stack additively but the **total synergy bonus is capped at +20** per resolution (penalties uncapped).

---

## 3. Concrete Balance Numbers

### 3.1 War Room economy (45-day campaign, ~15 turns)

| Item | Number |
|---|---|
| `chest` at start (faction range) | 50–68 |
| Net `chest` drift from events, no ops (typical run) | −10 to +8 |
| **Ops budget envelope** (total spend the design assumes) | **22–30 chest** across the run |
| `fuel` / `supply` ops share | Ops may consume ≤ 25% of run-total fuel; OP-03 must be net-positive on supply |
| Recommended start cost per op | 3–6 chest (one designated heavy at 10 = OP-08) |
| Recommended upkeep | ≤ 1 of any stat per interval; intervals ≥ 2 days |
| Recommended total cost per op (start + lifetime upkeep) | 5–9 chest-equivalent |
| **Too cheap** (redesign) | total < 4 — no decision being made |
| **Too expensive** (redesign) | single start cost > 12, or upkeep > 2 per interval, or total > 14 |

**Expected completions (Success + Partial, 45 days, 2 slots):**

| Player | Completions | Why |
|---|---|---|
| Struggling (low chest, high crisis) | **2–3** | suspensions + abandons eat throughput |
| Normal | **4–5** | 2 slots × ~6-day average, budget-limited |
| Strong (3rd slot + synergies + S1 chains) | **6–7** | hard ceiling ≈ 8; do not allow more |

If playtests show normal players completing 6+, raise start costs by 1 across the board before touching durations.

### 3.2 Life Mode economy (30-day default; scale budgets linearly for 14/45/60)

| Item | Number |
|---|---|
| `cash` at start | 52 |
| Effective daily cash drift (define once in engine) | `(monthlyIncome − 40) / 7` → ≈ +2.1/day at start income 55 |
| Expected gross inflow over 30 days | ≈ 60–65 cash |
| **Projects budget envelope** | **45–60 cash** total (player must choose, not buy everything) |
| Project cost feel | one project = **15–25% of expected run cashflow**; PJ-09's 12-start should visibly sting |
| Debt interaction | while `debt ≥ 60`, all project cash costs +1/day equivalent (interest drag) — makes PJ-06 strategic, not cosmetic |

**Expected completions (30 days, 2 slots):**

| Player | Completions |
|---|---|
| Struggling | **1–2** |
| Normal | **3–4** |
| Strong (philosophy slot/floors + synergies) | **5–6** |

**Risk feel target for PJ-10 (the gamble):** baseline outcome distribution ≈ **45% success / 25% partial / 30% failure**, shifting ~10 points toward failure per repeat. Every other project should sit at ≤ 15% failure for a prepared player.

### 3.3 Tuning constants (single source of truth — put in `data.ts`)

```
BASE_SCORE        = 60      // resolution score before modifiers
SUCCESS_BAND      = score - 20    // r <= this → Success
PARTIAL_BAND      = score + 10    // r <= this → Partial, else Failure
// unmodified: 40% / 30% / 30%. With a typical +10 modifier: 50% / 30% / 20%.

RISK_TICK_RATE    = { low: 10, medium: 22, high: 35 }   // % per interval
RISK_TICK_PENALTY = 10      // subtracted from score per fired tick
RISK_PENALTY_CAP  = 30      // accumulated tick penalty never exceeds this

PARTIAL_FACTOR    = 0.5     // partial = 50% of success effects, rounded toward zero,
                            // no follow-up event, no failure consequence
SYNERGY_SCORE_CAP = 20      // max combined positive synergy per resolution
```

### 3.4 Difficulty (design now, do not implement UI)

All tuning reads must go through one scalar object so difficulty later is a data change, not a refactor:

```
DIFFICULTY = { baseScoreDelta: 0, riskRateMult: 1.0, upkeepMult: 1.0, budgetMult: 1.0 }
```

Engine functions read `BASE_SCORE + DIFFICULTY.baseScoreDelta`, `rate * riskRateMult`, etc. Ship with the neutral object hard-coded and **no UI, no save field, no menu option**. A future "Hard" preset would be `{ baseScoreDelta: -10, riskRateMult: 1.25, upkeepMult: 1.0, budgetMult: 0.9 }` — noted here for direction only.

---

**Acceptance check for Codex:** extend the smoke test with three assertions — (a) two ops completing same-day resolve in start-day order deterministically under a fixed seed, (b) a suspended op auto-abandons on suspended day 4, (c) save/load round-trips `activeOps`, `opsHistory`, `opsCooldowns`, and `pendingFollowUps` with Sets/arrays intact.
