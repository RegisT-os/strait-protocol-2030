# STRAIT PROTOCOL: 2030 — Expansion Design: Operations & Projects System

**Version:** Design v1.0 · for implementation by Codex
**Scope:** New multi-day commitment layer for both modes. War Room gains **Operations**; Life Mode gains **Projects**. No existing system is removed; this layer sits on top of the current turn loop.
**Design goal:** Convert both modes from "react to today's card" into "manage a portfolio of commitments under pressure." Replayability comes from which operations a run can afford, which triggers unlock, and how faction/role/philosophy bend the odds.

---

## 0. Core Concept (shared by both modes)

An **operation/project** is a multi-day commitment with:
`id · title · trigger · duration (days) · startCost · dailyUpkeep · risk profile · resolution roll (success / partial / failure) · stat effects · optional follow-up event · ending hook`

Lifecycle: **Available → Active (progressing daily) → Resolving (roll on completion) → Resolved (effects applied, note recorded)**. Resolved operations append a line to the run's *operations record*, which feeds summaries and endings exactly like `chainHistory` does today.

All randomness in this system MUST flow through `rng()` from `src/game/rng.ts` (never `Math.random`) so seeded runs and resumed saves stay deterministic.

---

## 1. WAR ROOM OPERATIONS (10)

> Stat keys reference existing fields: global stats (`stability, military, economy, credibility, global, domestic, chest, fuel, supply, proxy` + faction privates), crisis stats (`escalationLevel, financialContagion, oilShock, foodInflation, semiconductorSupply, shippingInsuranceCost, cyberDisruption, refugeePressure, mediaPanic, allianceCohesion, publicTrust, warWeariness, humanitarianDamage, nuclearRisk, globalStability`), and fleet fields (`sup, eta, status`).

### OP-01 · Diplomatic Backchannel
- **Mode:** War Room
- **Trigger:** `crisis.escalationLevel >= 45` AND day >= 5
- **Duration:** 8 days
- **Cost:** start `chest -4`; upkeep `credibility -1` every 4 days (deniability strain)
- **Risk:** Medium — leak risk each tick (see §4 risk events)
- **Expected benefit (success):** `escalationLevel -14, allianceCohesion +6, credibility +5`; unlocks Ceasefire Framework trigger 1 act early
- **Failure consequence:** Leak — `credibility -8, domestic -6, mediaPanic +10`; faction pressure stat hit (e.g. `politburo -6` for China, `coalition -5` for US-Dem)
- **Affected stats:** escalationLevel, credibility, allianceCohesion, domestic, mediaPanic
- **Follow-up event:** *"The Other Side Answers"* — choice card offering a prisoner/hostage gesture (good-faith proof) vs. demand for public concession
- **Ending relevance:** success flag `op_backchannel` is a precondition for the two diplomatic A-tier endings (§7-E1)

### OP-02 · Cyber Defense Surge
- **Mode:** War Room
- **Trigger:** `crisis.cyberDisruption >= 40` OR a chain event with a cyber tag has fired
- **Duration:** 5 days
- **Cost:** start `chest -6`; upkeep none
- **Risk:** Low
- **Expected benefit:** `cyberDisruption -16, publicTrust +5, stability +3`; while active, incoming sudden events with cyber effects are halved
- **Failure consequence:** `cyberDisruption +6` (botched patch window), `chest -3` extra spend
- **Affected stats:** cyberDisruption, publicTrust, stability, chest
- **Follow-up event:** *"Attribution Package"* — publish attribution (credibility +, escalation +) or bank it quietly (proxy +)
- **Ending relevance:** counts toward the *Resilience* ending note; prevents the cyber-collapse D ending if completed before Day 30

### OP-03 · Carrier Resupply Window
- **Mode:** War Room
- **Trigger:** any non-hostile fleet with `sup < 20`
- **Duration:** 4 days
- **Cost:** start `chest -5, fuel -4`; consumes 1 fleet command point on start day
- **Risk:** Medium — interdiction roll if `escalationLevel >= 65`
- **Expected benefit:** target fleet `sup +28`; `supply +6` global; clears that fleet's "CRITICAL" note
- **Failure consequence:** convoy harassed — fleet `sup +10` only, `escalationLevel +6, shippingInsuranceCost +8`
- **Affected stats:** fleet sup, supply, fuel, escalationLevel, shippingInsuranceCost
- **Follow-up event:** *"Escort Doctrine"* — set standing escort policy (recurring small fuel upkeep vs. recurring interdiction risk)
- **Ending relevance:** zero out-of-supply fleets at game end adds the *"Logistics Won This"* ending note (§7-E3)

### OP-04 · Sanctions Package
- **Mode:** War Room
- **Trigger:** day >= 8 AND `credibility >= 45`; not available to UN faction (replaced by *Compliance Monitoring* variant, same shape, legitimacy-flavored)
- **Duration:** 7 days
- **Cost:** start `economy -5`; upkeep `economy -1`/3 days
- **Risk:** Medium-high — retaliation roll
- **Expected benefit:** adversary-pressure: `escalationLevel +4` but `chest +6` (seized assets), `credibility +7, allianceCohesion +5`; opens the *Sanctions Bite* chain event
- **Failure consequence:** coalition splits on enforcement — `allianceCohesion -8, economy -4`, faction private hit (`unity -6` EU/ASEAN)
- **Affected stats:** economy, credibility, allianceCohesion, chest, escalationLevel
- **Follow-up event:** *"Exemption Lobby"* — carve-outs for key industries (economy + / credibility −)
- **Ending relevance:** economic-victory endings require either this op or Market Stabilization completed

### OP-05 · Humanitarian Corridor
- **Mode:** War Room
- **Trigger:** `crisis.humanitarianDamage >= 35` OR `refugeePressure >= 40`
- **Duration:** 6 days
- **Cost:** start `chest -4, supply -3`; upkeep `supply -1`/2 days
- **Risk:** Medium — corridor incident roll, worse if `escalationLevel >= 70`
- **Expected benefit:** `humanitarianDamage -15, refugeePressure -10, global +8, publicTrust +6`
- **Failure consequence:** corridor strike incident — `humanitarianDamage +8, mediaPanic +12, global -5`
- **Affected stats:** humanitarianDamage, refugeePressure, global, publicTrust, supply
- **Follow-up event:** *"Permanent Mandate"* — institutionalize the corridor (recurring upkeep, recurring legitimacy gain)
- **Ending relevance:** required for the UN A+ ending and adds the humanitarian note to any faction's summary (§7-E2)

### OP-06 · Intelligence Collection
- **Mode:** War Room
- **Trigger:** always available from day 3; only one instance per act
- **Duration:** 5 days
- **Cost:** start `chest -3`; upkeep `proxy -1`/2 days (asset exposure)
- **Risk:** Low-medium — burn-an-asset roll
- **Expected benefit:** for the next 6 days, choice previews show one extra hidden consequence line; `proxy +6` on completion; reveals the next queued chain event in the side panel
- **Failure consequence:** asset burned — `proxy -8, credibility -3`; adversary counter-op sudden event becomes eligible
- **Affected stats:** proxy, credibility, chest
- **Follow-up event:** *"Defector in the Net"* — exploit immediately (big one-time intel) vs. run long-term (recurring small proxy gain)
- **Ending relevance:** 2+ successful intel ops add the *Shadow War* doctrine note to the ending summary

### OP-07 · Domestic Messaging Campaign
- **Mode:** War Room
- **Trigger:** `domestic <= 50` OR `crisis.mediaPanic >= 55`
- **Duration:** 6 days
- **Cost:** start `chest -3`; upkeep `credibility -1`/3 days (spin fatigue)
- **Risk:** Low
- **Expected benefit:** `domestic +10, mediaPanic -10, publicTrust +6`
- **Failure consequence:** astroturf exposed — `publicTrust -8, credibility -5`
- **Affected stats:** domestic, mediaPanic, publicTrust, credibility
- **Follow-up event:** *"Opposition Buys Airtime"* — counter-spend (chest −) or debate offer (high-variance domestic swing)
- **Ending relevance:** prevents the domestic-collapse endings from triggering at end-of-game margins (raises their thresholds by 5)

### OP-08 · Emergency Market Stabilization
- **Mode:** War Room
- **Trigger:** `crisis.financialContagion >= 55` OR `economy <= 40`
- **Duration:** 4 days
- **Cost:** start `chest -10` (heavy)
- **Risk:** Medium
- **Expected benefit:** `financialContagion -18, economy +8`; recession indicator recomputes lower next tick
- **Failure consequence:** intervention absorbed by the panic — `chest -5` more, `financialContagion -4` only, `publicTrust -5`
- **Affected stats:** financialContagion, economy, chest, publicTrust
- **Follow-up event:** *"Moral Hazard Hearing"* — defend the bailout (credibility −, economy +) or claw back (economy −, domestic +)
- **Ending relevance:** see §7-E4; the *Bankruptcy of Power* endings check `chest` AFTER this op's spend, making it a real gamble

### OP-09 · Evacuation Planning
- **Mode:** War Room
- **Trigger:** `crisis.escalationLevel >= 60` AND `refugeePressure >= 30`
- **Duration:** 5 days
- **Cost:** start `chest -4, fuel -3`
- **Risk:** Low while planning; benefit realized only if escalation later crosses 80
- **Expected benefit:** sets flag `op_evac_ready`; if `escalationLevel >= 80` later, an automatic mitigation fires once: `humanitarianDamage -12, domestic +6, refugeePressure -8` instead of the usual spike
- **Failure consequence:** plan shelved incomplete — half effect, `chest` spent regardless
- **Affected stats:** humanitarianDamage, refugeePressure, domestic, fuel, chest
- **Follow-up event:** *"Allies Want In"* — share the plan (allianceCohesion +, proxy −) or keep it national
- **Ending relevance:** if the run ends above escalation 80 WITH this op complete, the ending body appends the *"…but the planes were ready"* clause and grade floor rises one step

### OP-10 · Ceasefire Framework
- **Mode:** War Room
- **Trigger:** day >= 28 AND (`crisis.warWeariness >= 45` OR `op_backchannel` succeeded)
- **Duration:** 9 days (the long bet)
- **Cost:** start `credibility -4` (talking costs face); upkeep `escalationLevel` may not be raised by player choices > +6 per turn or the op collapses
- **Risk:** High — spoiler roll every 3 days, worse if `nuclearRisk >= 50`
- **Expected benefit:** `escalationLevel -25, warWeariness -10, globalStability +12`; sets flag `op_ceasefire`
- **Failure consequence:** talks collapse publicly — `escalationLevel +10, credibility -8, mediaPanic +10`
- **Affected stats:** escalationLevel, warWeariness, globalStability, credibility, mediaPanic
- **Follow-up event:** *"Verification Annex"* — intrusive monitoring (durable, sovereignty cost) vs. paper terms (fragile, free)
- **Ending relevance:** the strongest single ending lever — see §7-E1/E5

---

## 2. LIFE MODE PROJECTS (10)

> Stat keys reference existing Life stats (`cash, debt, monthlyIncome, jobSecurity, careerCapital, familyStability, health, stress, morale, foodSupply, fuelAccess, medicineAccess, housingSecurity, internetAccess, legalRisk, migrationReadiness, reputation, emergencyPreparedness`) and markets (`food, fuel, rent, medicine, usd, jobs`).

### PJ-01 · Build Emergency Fund
- **Trigger:** always available; recommended chip shown when `cash < 40`
- **Duration:** 7 days · **Cost:** `cash -3`/day upkeep (auto-deduct savings) · **Risk:** Low
- **Benefit:** `cash +24` lump on completion (forced savings + small interest), `stress -4`, `emergencyPreparedness +6`
- **Failure:** an emergency drains it mid-project (roll worsens if any household crisis event fired): keep half, `stress +5`
- **Stats:** cash, stress, emergencyPreparedness
- **Follow-up:** *"Bank Withdrawal Limits"* — keep cash at home (theft risk) vs. spread accounts (`usd` exposure)
- **Ending hook:** `cash >= 70` endings require this or Side Hustle completed; adds *"You built a cushion before the floor dropped"* note

### PJ-02 · Upskill for Crisis Career
- **Trigger:** `careerCapital < 60` OR market `jobs < 55`
- **Duration:** 10 days · **Cost:** `cash -8` start, `stress +1`/2 days · **Risk:** Low
- **Benefit:** `careerCapital +14, jobSecurity +8, monthlyIncome +6`
- **Failure:** course mill / layoff mid-course — `careerCapital +5` only, `cash` not refunded
- **Stats:** careerCapital, jobSecurity, monthlyIncome, stress
- **Follow-up:** *"Recruiter Pings You"* — jump employers (income +, jobSecurity reset) or leverage for raise
- **Ending hook:** powers the *Career Ascendant* ending; tech/cyber/finance roles get duration −3 (§4)

### PJ-03 · Prepare Migration Packet
- **Trigger:** `migrationReadiness < 55` AND (city is taipei/seoul/hong_kong OR `stress >= 55`)
- **Duration:** 8 days · **Cost:** `cash -10` start, `legalRisk +1`/3 days (document grey zones) · **Risk:** Medium
- **Benefit:** `migrationReadiness +22, stress -5`; sets flag `pj_exit_ready`
- **Failure:** visa rules change mid-process — `migrationReadiness +8` only, `cash -4` more in fees
- **Stats:** migrationReadiness, legalRisk, stress, cash
- **Follow-up:** *"The Window Opens"* — leave now (ends run early with migration ending) or hold the packet
- **Ending hook:** unlocks the *Clean Exit* ending family; exit-philosophy runs get success +15 (§4)

### PJ-04 · Stockpile Supplies
- **Trigger:** market `food >= 125` OR `foodSupply < 45`
- **Duration:** 5 days · **Cost:** `cash -4`/day (purchases at current market price — cost scales with `food`/`fuel` indices) · **Risk:** Low
- **Benefit:** `foodSupply +16, fuelAccess +8, medicineAccess +6, emergencyPreparedness +8`; immune to shortage sudden events for 7 days after
- **Failure:** spoilage/confiscation roll — half stocks, `stress +4`
- **Stats:** foodSupply, fuelAccess, medicineAccess, emergencyPreparedness, cash
- **Follow-up:** *"Neighbors Notice"* — share (reputation +, stocks −) or hide (stress +, legalRisk + in rationing cities)
- **Ending hook:** *Fortress Household* ending requires this + Backup Power (§7-E2-life analog under E5)

### PJ-05 · Repair Family Trust
- **Trigger:** `familyStability < 50` OR `morale < 45`
- **Duration:** 6 days · **Cost:** `monthlyIncome -2` while active (time off shifts) · **Risk:** Low
- **Benefit:** `familyStability +14, morale +8, stress -6`
- **Failure:** old wound reopens — `familyStability +4` only, `stress +5`
- **Stats:** familyStability, morale, stress, monthlyIncome
- **Follow-up:** *"Family Council"* — pool finances (cash +, autonomy −) or stay separate
- **Ending hook:** protector-philosophy endings check `familyStability >= 65`; this is the main lever

### PJ-06 · Reduce Debt
- **Trigger:** `debt >= 45`
- **Duration:** 9 days · **Cost:** `cash -5`/day routed to principal · **Risk:** Low
- **Benefit:** `debt -22, stress -6, monthlyIncome +3` (less interest drag)
- **Failure:** rate hike mid-plan — `debt -10` only
- **Stats:** debt, cash, stress, monthlyIncome
- **Follow-up:** *"Consolidation Offer"* — refinance (debt −, legalRisk + fine print) or decline
- **Ending hook:** hard-blocks the *Debt Collapse* ending if completed; `debt <= 20` endings effectively require it

### PJ-07 · Improve Health Routine
- **Trigger:** `health < 60` OR `stress >= 60`
- **Duration:** 7 days · **Cost:** `cash -2`/2 days · **Risk:** Low
- **Benefit:** `health +12, stress -10, morale +6`
- **Failure:** burnout relapse — `health +4` only
- **Stats:** health, stress, morale
- **Follow-up:** *"Clinic Slot Opens"* — preventive checkup (medicineAccess −1 use, health +) or give slot to family (familyStability +)
- **Ending hook:** survival endings with `health < 35` downgrade one grade; this op is the counter

### PJ-08 · Build Community Network
- **Trigger:** `reputation < 55` OR city event with community tag fired
- **Duration:** 8 days · **Cost:** `stress +1`/2 days, `cash -2`/3 days · **Risk:** Low
- **Benefit:** `reputation +14, foodSupply +5, medicineAccess +5, morale +6`; community absorbs one future bad event (negate one failure roll, once)
- **Failure:** network politics — `reputation +5`, `stress +4`
- **Stats:** reputation, foodSupply, medicineAccess, morale, stress
- **Follow-up:** *"They Ask You to Lead"* — accept (reputation ++, stress +, time cost) or support quietly
- **Ending hook:** civic-philosophy A endings require this completed; adds *Community Pillar* note

### PJ-09 · Secure Backup Internet / Power
- **Trigger:** `internetAccess < 60` OR a blackout/cyber life event fired
- **Duration:** 6 days · **Cost:** `cash -12` start (hardware at market `fuel`-scaled price) · **Risk:** Low-medium (supply scams)
- **Benefit:** `internetAccess +15, emergencyPreparedness +10, jobSecurity +4` (remote work survives outages); blackout events lose their stat penalties for the rest of the run
- **Failure:** counterfeit gear — `cash` gone, `internetAccess +5` only
- **Stats:** internetAccess, emergencyPreparedness, jobSecurity, cash
- **Follow-up:** *"Neighbor Wants to Plug In"* — share capacity (reputation +) or charge for it (cash +, reputation −)
- **Ending hook:** required (with PJ-04) for *Fortress Household*; tech/cyber roles get cost −4

### PJ-10 · Risky Side Hustle
- **Trigger:** `cash < 35` OR opportunist philosophy
- **Duration:** 6 days · **Cost:** `stress +2`/2 days, `legalRisk +2`/2 days · **Risk:** HIGH (the gamble project)
- **Benefit (success):** `cash +30, careerCapital +6, reputation +4`
- **Partial:** `cash +12, legalRisk +4`
- **Failure:** caught/scammed — `cash -8, legalRisk +12, reputation -8`; spawns *"Paying It Back"* obligation event chain
- **Stats:** cash, legalRisk, reputation, stress, careerCapital
- **Follow-up:** *"Scale It or Fold It"* — repeatable with escalating risk each repeat (+10 failure weight per prior run)
- **Ending hook:** enables the *Grey Fortune* ending (high cash + high legalRisk); 2 failures hard-unlock the *Burned* ending

---

## 3. SYSTEM RULES

### 3.1 Active slots
- **War Room:** 2 operation slots. A 3rd slot unlocks when `allianceCohesion >= 65` OR faction is US-Dem/EU (institutional capacity). UN gets 3 slots from start but pays double `chest` costs (no real treasury).
- **Life Mode:** 2 project slots. Philosophy modifies: *opportunist* +1 slot but all failure rolls +5; *protector* keeps 2 but family-tagged projects (PJ-05) don't consume a slot.
- Starting an op consumes its slot until resolved or **abandoned** (abandon = lose start cost, no failure roll, 1-day cooldown on that op).

### 3.2 Daily progression
- Each op stores `{ id, startedDay, progress, duration, paidUpkeepDay }`.
- On every day-advance (note: War Room advances `rnd(2,4)` days per turn — progress ticks by **days elapsed**, not turns; Life Mode ticks 1/day):
  1. add elapsed days to `progress`
  2. charge any upkeep whose interval elapsed; if the player cannot pay upkeep (stat would clamp at 0), op is **suspended** (no progress) until affordable, max 4 suspended days then auto-abandon
  3. run **risk-tick events** (leak/interdiction/spoiler) at each interval listed in the op spec; a fired risk-tick applies a small penalty and adds +10 to the final failure band — it does NOT kill the op outright
  4. when `progress >= duration`, queue resolution at the start of the next event phase (resolution card shows before the day's scenario)

### 3.3 Resolution roll (success / partial / failure)
- Roll `r = rng() * 100`. Compute `score = base 60 + modifiers (§4) − accumulated riskTick penalties`.
- `r <= score − 20` → **Success** (full benefit)
- `score − 20 < r <= score + 10` → **Partial** (≈50% benefit rounded toward caution, no follow-up event, no failure consequence)
- `r > score + 10` → **Failure** (failure consequence; follow-up replaced by the failure-flavored variant if the op defines one)
- Resolution writes one line to `opsHistory` (`{ id, day, outcome }`) and appends to the war/life log.

### 3.4 Faction / role / city / philosophy modifiers (examples Codex should implement as data, not branching code — a `modifiers` table keyed by op id)
- **Faction (War Room):** US-Dem +10 on OP-01/OP-05; US-Rep +10 on OP-03, −5 on OP-01; China +10 on OP-02/OP-06, cannot start OP-04 (replaced by *Export Controls* mirror); EU +15 on OP-04/OP-08; UN +15 on OP-05/OP-10, cannot start OP-06; Russia +10 on OP-06, −10 on OP-10; North Korea: OP-08 unavailable, OP-06 +15; ASEAN +10 on OP-09, OP-04 costs `unity -4` extra.
- **Role (Life):** finance/compliance +10 on PJ-01/PJ-06; tech/cyber +10 and cost −4 on PJ-09, duration −3 on PJ-02; nurse +10 on PJ-07, medicine market effects doubled on PJ-04; journalist +10 on PJ-08, +10 failure weight on PJ-10; migrant −10 on PJ-03 success but trigger always met; student duration −2 on PJ-02.
- **City (Life):** taipei/seoul: PJ-03/PJ-04 triggers always met, PJ-09 +10; kl_pj/jakarta/manila: PJ-04 cost −2/day (cheaper staples), PJ-10 +5 success (informal economy); singapore/hong_kong: PJ-01/PJ-06 +10, PJ-10 failure weight +10 (enforcement); london/new_york: PJ-02 +10, all `cash` costs +25%.
- **Philosophy:** protector → PJ-05 auto-success floor (worst case = partial); civic → PJ-08 +15; exit → PJ-03 +15; opportunist → PJ-10 partial band widened (more partials, fewer outright failures).

### 3.5 UI display
- New **Operations Tray** component (`ui.tsx`), rendered in the War Room side column above the event log, and in Life Mode under the stat grid:
  - one row per active op: title, progress bar (`progress/duration` days), next-upkeep chip, risk badge (Low/Med/High in existing `riskC/riskBg` colors), Abandon button (confirm on press)
  - empty slots render as dashed "+ Start Operation" buttons opening a picker modal listing **available** ops (trigger met) with locked ops greyed out showing their trigger text — discoverability is part of the strategy
  - resolution renders as a full-width card in the main column (same visual language as sudden-crisis cards: green/amber/red left border for success/partial/failure) before the day's scenario
  - the strategic dashboard gains a one-line ops summary: `OPS: 2 active · 3 resolved (2✓ 1✗)`

### 3.6 Save / load / export
- Bump save `version: 4`. Add to payload: `activeOps` (array of active op state objects), `opsHistory`, `opsCooldowns`, and the existing `seed`/`rngState` already cover roll determinism — **resolution rolls must be drawn at resolution time only**, never pre-rolled, so save/resume stays exact.
- Loader accepts v3 saves: missing fields default to `[]` (a v3 campaign simply continues with no ops yet).
- Export summary (`warSummaryText`/`lifeSummaryText`) gains an **OPERATIONS RECORD** section: one line per resolved op (`Day 14 · Cyber Defense Surge — Success`) plus the active-at-end list. Ending screens show the same record under a new panel.

---

## 4. RISK-TICK EVENT TABLE (shared mechanic)
Small interstitial events fired by §3.2 step 3. Each is one log line + minor effect, no choice required (keeps turn pacing):
- *Leak rumor* (OP-01/OP-10): `mediaPanic +4`, +10 failure band
- *Interdiction scare* (OP-03): `shippingInsuranceCost +5`, +10 band
- *Spoiler attack* (OP-10 ceasefire): `escalationLevel +5`, +15 band
- *Scam brush* (PJ-09/PJ-10): `cash -3`, +10 band
- *Audit notice* (PJ-10): `legalRisk +4`, +10 band
Risk-tick probability per interval: Low 10%, Medium 22%, High 35% (rolled via `rng()`).

---

## 5. EXAMPLE ENDINGS AFFECTED BY OPERATIONS (5)

- **E1 · "The Architects of the Quiet Peace" (War Room, any faction, A+):** requires `op_ceasefire` success AND `op_backchannel` success AND `escalationLevel <= 35` at end. Replaces the generic diplomatic A ending when both flags present; body names the backchannel explicitly.
- **E2 · "The Corridor Held" (UN, A):** existing UN humanitarian ending now requires OP-05 completed (success or partial). Without it, the same stat line caps at B+ — institutions need receipts.
- **E3 · "Logistics Won This" (US-Rep / China, A−):** end the run with zero fleets ever hitting out-of-supply AND ≥2 successful OP-03 runs. Ending body reframes the campaign as a quartermaster's war.
- **E4 · "Solvent at the Brink" (any faction, B+ floor):** if OP-08 succeeded AND `chest >= 30` at end, the *Bankruptcy of Power* family of D endings is suppressed and this ending takes its slot — the gamble paid.
- **E5 · "Fortress Household" (Life Mode, A):** PJ-04 + PJ-09 both completed, `emergencyPreparedness >= 70`, `familyStability >= 55`. Outranks *Quiet Survivor*. Failure-side mirror: **"Burned"** (F) unlocks only via two PJ-10 failures — the player chose the casino twice.

---

## 6. IMPLEMENTATION MAP (module placement — for Codex)
- `src/game/data.ts`: `WAR_OPERATIONS`, `LIFE_PROJECTS` (content tables above), `OP_MODIFIERS` (faction/role/city/philosophy table from §3.4), risk-tick table
- `src/game/engine.ts`: pure functions — `availableOps(mode, state)`, `tickOps(active, daysElapsed, state, rng)`, `resolveOp(op, state, rng)` returning `{outcome, effects, note, followUp?}`
- `src/game/systems.ts`: save v4 fields, ops section in both summary builders, ending-note injection from `opsHistory`, new/modified ending conditions (E1–E5)
- `src/game/ui.tsx`: `OperationsTray`, `OpPickerModal`, `OpResolutionCard`
- `src/App.tsx`: `activeOps/opsHistory/opsCooldowns` state, wire tick into both day-advance paths, wire follow-up events into the existing sudden/chain delivery slot
- `scripts/smoke-entry.tsx`: extend smoke test — start an op with seeded rng, tick to completion, assert deterministic outcome and save round-trip of `activeOps`

**Balance guardrail for tuning:** a player running ops every turn should end roughly +1 grade band over a no-ops player on the same seed — meaningful, not mandatory.
