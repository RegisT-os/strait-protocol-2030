import {
  BASE_SCORE,
  DIFFICULTY,
  LIFE_PROJECTS,
  OP_MODIFIERS,
  OP_SYNERGIES,
  OperationDefinition,
  PARTIAL_FACTOR,
  RISK_PENALTY_CAP,
  RISK_TICK_RATE,
  RISK_TICKS,
  SYNERGY_SCORE_CAP,
  StatEffect,
  WAR_OPERATIONS,
  GameMode,
} from "./data";
import { cl } from "./engine";
import { rng as seededRng } from "./rng";

export type OpsOutcome = "success" | "partial" | "failure" | "abandoned" | "incomplete";
export type ActiveOpStatus = "active" | "suspended" | "ready";
export type RngFn = () => number;

export interface ActiveOpState {
  instanceId: string;
  id: string;
  startedDay: number;
  startedAct?: number;
  slotIndex: number;
  progress: number;
  duration: number;
  riskPenalty: number;
  suspendedDays: number;
  status: ActiveOpStatus;
  paidUpkeepDay: Record<string, number>;
  completedDay?: number;
  targetId?: string;
}

export interface OpsHistoryEntry {
  id: string;
  title: string;
  day: number;
  act?: number;
  outcome: OpsOutcome;
  instanceId?: string;
  roll?: number;
  score?: number;
  effects?: StatEffect;
  targetId?: string;
  note?: string;
}

export interface PendingFollowUp {
  id: string;
  opId: string;
  title: string;
  note: string;
  day: number;
}

export interface OpsState {
  mode: GameMode;
  day: number;
  campaignLength: number;
  act?: number;
  factionId?: string;
  roleId?: string;
  cityId?: string;
  philosophyId?: string;
  stats: StatEffect;
  crisis: StatEffect;
  markets: StatEffect;
  fleets?: Array<Record<string, any>>;
  chainTags?: string[];
  lifeEventTags?: string[];
  cityEventTags?: string[];
  activeOps: ActiveOpState[];
  opsHistory: OpsHistoryEntry[];
  opsCooldowns: Record<string, number>;
  pendingFollowUps: PendingFollowUp[];
  opFlags: Record<string, any>;
  nextInstanceId: number;
}

export interface AvailabilityEntry {
  op: OperationDefinition;
  available: boolean;
  reasons: string[];
  slotCapacity: number;
  activeSlotCount: number;
}

export interface StartOpResult {
  state: OpsState;
  started?: ActiveOpState;
  ok: boolean;
  reasons: string[];
}

export interface ResolveOpResult {
  state: OpsState;
  entry?: OpsHistoryEntry;
  ok: boolean;
  reason?: string;
}

const DEFAULT_CAMPAIGN_LENGTH: Record<GameMode, number> = { war: 45, life: 30 };
const SUCCESS_PARTIAL_OUTCOMES = new Set<OpsOutcome>(["success", "partial"]);
const CHEAPER_STAPLES_CITIES = new Set(["kl_pj", "jakarta", "manila"]);
const EXPENSIVE_CITIES = new Set(["london", "new_york"]);
const FRONTLINE_CITIES = new Set(["taipei", "seoul", "hong_kong"]);

export function createInitialOpsState(mode: GameMode): OpsState {
  return {
    mode,
    day: 1,
    campaignLength: DEFAULT_CAMPAIGN_LENGTH[mode],
    stats: {},
    crisis: {},
    markets: {},
    activeOps: [],
    opsHistory: [],
    opsCooldowns: {},
    pendingFollowUps: [],
    opFlags: {},
    nextInstanceId: 1,
  };
}

export function availableOps(mode: GameMode, state: OpsState): AvailabilityEntry[] {
  const defs = definitionsForMode(mode);
  const capacity = slotCapacity(state);
  const activeSlotCount = usedSlotCount(state);
  return defs.map(op => {
    const reasons: string[] = [];
    const remainingDays = (state.campaignLength || DEFAULT_CAMPAIGN_LENGTH[mode]) - (state.day || 1) + 1;

    if (state.activeOps.some(active => active.id === op.id)) reasons.push("Already active.");
    if (remainingDays < op.durationDays) reasons.push(`Insufficient time - needs ${op.durationDays} days.`);
    if ((state.opsCooldowns[op.id] || 0) > (state.day || 1)) reasons.push("On cooldown.");
    if (!triggerMet(op, state)) reasons.push(`Trigger not met: ${op.trigger}`);
    if (!repeatAllowed(op, state)) reasons.push("Repeat limit reached.");
    if (isBlockedByModifier(op, state)) reasons.push("Blocked by faction, role, city, or philosophy rule.");
    if (isBlockedBySynergy(op, state)) reasons.push("Blocked by active synergy or conflict.");
    if (activeSlotCount >= capacity && !isSlotFreeProject(op, state)) reasons.push("No operation/project slot available.");

    return { op, available: reasons.length === 0, reasons, slotCapacity: capacity, activeSlotCount };
  });
}

export function startOp(state: OpsState, opId: string, options: { targetId?: string } = {}): StartOpResult {
  const op = definitionById(state.mode, opId);
  if (!op) return { state, ok: false, reasons: [`Unknown operation/project id: ${opId}`] };

  const availability = availableOps(state.mode, state).find(entry => entry.op.id === opId);
  const reasons = [...(availability?.reasons || [])];
  if (!canAfford(state, effectiveStartCost(op, state))) reasons.push("Start cost is not affordable.");
  if (op.id === "OP-03" && !options.targetId) reasons.push("Carrier Resupply Window requires a target fleet id.");
  if (reasons.length) return { state, ok: false, reasons };

  const slotIndex = nextSlotIndex(state, op);
  const instanceId = `${op.id}-${state.nextInstanceId || 1}`;
  const started: ActiveOpState = {
    instanceId,
    id: op.id,
    startedDay: state.day,
    startedAct: state.act,
    slotIndex,
    progress: 0,
    duration: effectiveDuration(op, state),
    riskPenalty: 0,
    suspendedDays: 0,
    status: "active",
    paidUpkeepDay: {},
    targetId: options.targetId,
  };

  return {
    ok: true,
    reasons: [],
    started,
    state: {
      ...applyEffects(state, effectiveStartCost(op, state)),
      activeOps: [...state.activeOps, started],
      nextInstanceId: (state.nextInstanceId || 1) + 1,
    },
  };
}

export function tickOps(state: OpsState, daysElapsed: number, roll: RngFn = seededRng): OpsState {
  const elapsed = Math.max(0, Math.floor(daysElapsed));
  if (elapsed <= 0) return cloneState(state);

  let next = cloneState(state);
  const updated: ActiveOpState[] = [];

  for (const active of orderedActiveOps(next.activeOps)) {
    const op = definitionById(next.mode, active.id);
    if (!op || active.status === "ready") {
      updated.push(active);
      continue;
    }

    let current = { ...active, paidUpkeepDay: { ...active.paidUpkeepDay } };
    for (let i = 0; i < elapsed; i++) {
      const tickDay = (next.day || 1) + i + 1;
      if (current.status === "ready") break;

      const upkeep = upkeepDue(op, current, tickDay, next);
      if (!canAfford(next, upkeep)) {
        current.status = "suspended";
        current.suspendedDays += 1;
        if (current.suspendedDays >= 4) {
          next = recordAbandon(next, current, "abandoned (stalled)", 1);
          current = null as any;
          break;
        }
        continue;
      }

      if (current.status === "suspended") current.status = "active";
      if (Object.keys(upkeep).length) {
        next = applyEffects(next, upkeep);
        for (const rule of op.upkeep || []) {
          current.paidUpkeepDay[upkeepKey(rule)] = tickDay;
        }
      }

      current.progress += 1;
      const risk = maybeRiskTick(op, next, roll);
      if (risk) {
        next = applyEffects(next, risk.effects);
        current.riskPenalty = Math.min(RISK_PENALTY_CAP, current.riskPenalty + risk.failureBandPenalty);
      }

      if (current.progress >= current.duration) {
        current.status = "ready";
        current.completedDay = tickDay;
      }
    }

    if (current) updated.push(current);
  }

  return { ...next, activeOps: orderedActiveOps(updated), day: (next.day || 1) + elapsed };
}

export function resolveOp(state: OpsState, activeOpId: string, roll: RngFn = seededRng): ResolveOpResult {
  const active = findActiveOp(state, activeOpId);
  if (!active) return { state, ok: false, reason: `Active operation/project not found: ${activeOpId}` };

  const op = definitionById(state.mode, active.id);
  if (!op) return { state, ok: false, reason: `Definition not found: ${active.id}` };

  const score = resolutionScore(op, active, state);
  const r = roll() * 100;
  const partialCeiling = score + 10 + partialBandBonus(op, state);
  let outcome: OpsOutcome = r <= score - 20 ? "success" : r <= partialCeiling ? "partial" : "failure";
  if (outcome === "failure" && hasOutcomeFloor(op, state)) outcome = "partial";
  const outcomeEffects = effectsForOutcome(op, outcome);
  let next = applyEffects(state, outcomeEffects);
  next = applyFlags(next, op, outcome);

  const entry: OpsHistoryEntry = {
    id: op.id,
    title: op.title,
    instanceId: active.instanceId,
    day: state.day,
    act: state.act,
    outcome,
    roll: Math.round(r * 100) / 100,
    score,
    effects: outcomeEffects,
    targetId: active.targetId,
  };

  next = {
    ...next,
    activeOps: next.activeOps.filter(item => item.instanceId !== active.instanceId),
    opsHistory: [...next.opsHistory, entry],
  };

  if (outcome === "failure") next = applyFailureCooldown(next, op.id);
  if (outcome === "success" && op.followUp) next = enqueueFollowUp(next, op);

  return { state: next, entry, ok: true };
}

export function abandonOp(state: OpsState, activeOpId: string): OpsState {
  const active = findActiveOp(state, activeOpId);
  if (!active) return cloneState(state);
  return recordAbandon(state, active, "abandoned", 1);
}

export function finalizeIncompleteOps(state: OpsState, roll: RngFn = seededRng): OpsState {
  let next = cloneState(state);
  for (const active of orderedReadyOps(next.activeOps)) {
    const result = resolveOp(next, active.instanceId, roll);
    next = result.state;
  }

  const incompleteEntries = orderedActiveOps(next.activeOps).map(active => {
    const op = definitionById(next.mode, active.id);
    return {
      id: active.id,
      title: op?.title || active.id,
      instanceId: active.instanceId,
      day: next.day,
      act: next.act,
      outcome: "incomplete" as OpsOutcome,
      targetId: active.targetId,
      note: "Incomplete at campaign end; no refund and no resolution roll.",
    };
  });

  return {
    ...next,
    activeOps: [],
    opsHistory: [...next.opsHistory, ...incompleteEntries],
  };
}

export function dequeueNextFollowUp(state: OpsState): { state: OpsState; followUp?: PendingFollowUp } {
  const [followUp, ...rest] = state.pendingFollowUps;
  return { state: { ...state, pendingFollowUps: rest }, followUp };
}

export function chooseInterstitial<TChain = unknown, TSudden = unknown>(
  state: OpsState,
  chainEvent?: TChain,
  suddenEvent?: TSudden,
): { kind: "follow-up" | "chain" | "sudden" | "none"; event?: PendingFollowUp | TChain | TSudden; state: OpsState } {
  if (state.pendingFollowUps.length) {
    const { state: next, followUp } = dequeueNextFollowUp(state);
    return { kind: "follow-up", event: followUp, state: next };
  }
  if (chainEvent) return { kind: "chain", event: chainEvent, state };
  if (suddenEvent) return { kind: "sudden", event: suddenEvent, state };
  return { kind: "none", state };
}

export function buildOpsRecord(state: OpsState): string[] {
  return state.opsHistory.map(entry => {
    const suffix = entry.note ? ` (${entry.note})` : "";
    return `Day ${entry.day} - ${entry.title} - ${capitalize(entry.outcome)}${suffix}`;
  });
}

export function serializeOpsState(state: OpsState): OpsState {
  return cloneState(state);
}

export function restoreOpsState(value: Partial<OpsState>, mode: GameMode): OpsState {
  return { ...createInitialOpsState(mode), ...value, mode };
}

function definitionsForMode(mode: GameMode) {
  return mode === "war" ? WAR_OPERATIONS : LIFE_PROJECTS;
}

function definitionById(mode: GameMode, id: string) {
  return definitionsForMode(mode).find(op => op.id === id);
}

function cloneState(state: OpsState): OpsState {
  return {
    ...state,
    stats: { ...state.stats },
    crisis: { ...state.crisis },
    markets: { ...state.markets },
    fleets: state.fleets ? state.fleets.map(fleet => ({ ...fleet })) : undefined,
    chainTags: [...(state.chainTags || [])],
    lifeEventTags: [...(state.lifeEventTags || [])],
    cityEventTags: [...(state.cityEventTags || [])],
    activeOps: state.activeOps.map(op => ({ ...op, paidUpkeepDay: { ...op.paidUpkeepDay } })),
    opsHistory: state.opsHistory.map(entry => ({ ...entry, effects: entry.effects ? { ...entry.effects } : undefined })),
    opsCooldowns: { ...state.opsCooldowns },
    pendingFollowUps: state.pendingFollowUps.map(item => ({ ...item })),
    opFlags: { ...state.opFlags },
    nextInstanceId: state.nextInstanceId || 1,
  };
}

function slotCapacity(state: OpsState) {
  if (state.mode === "war") {
    if (state.factionId === "un") return 3;
    if (state.factionId === "us_dem" || state.factionId === "eu") return 3;
    if (readStat(state, "allianceCohesion") >= 65) return 3;
    return 2;
  }
  return state.philosophyId === "opportunist" ? 3 : 2;
}

function usedSlotCount(state: OpsState) {
  return state.activeOps.filter(active => {
    const op = definitionById(state.mode, active.id);
    return op && !isSlotFreeProject(op, state);
  }).length;
}

function isSlotFreeProject(op: OperationDefinition, state: OpsState) {
  return state.mode === "life" && state.philosophyId === "protector" && op.id === "PJ-05";
}

function nextSlotIndex(state: OpsState, op: OperationDefinition) {
  if (isSlotFreeProject(op, state)) return -1;
  const used = new Set(state.activeOps.map(active => active.slotIndex));
  for (let i = 0; i < slotCapacity(state); i++) {
    if (!used.has(i)) return i;
  }
  return used.size;
}

function triggerMet(op: OperationDefinition, state: OpsState) {
  if (modifierApplies(state.cityId, op.id, "trigger", "always")) return true;
  if (modifierApplies(state.roleId, op.id, "trigger", "always")) return true;

  switch (op.id) {
    case "OP-01": return readStat(state, "escalationLevel") >= 45 && state.day >= 5;
    case "OP-02": return readStat(state, "cyberDisruption") >= 40 || (state.chainTags || []).includes("cyber");
    case "OP-03": return (state.fleets || []).some(fleet => !fleet.hostile && fleet.sup < 20);
    case "OP-04": return state.day >= 8 && readStat(state, "credibility") >= 45 && state.factionId !== "un";
    case "OP-05": return readStat(state, "humanitarianDamage") >= 35 || readStat(state, "refugeePressure") >= 40;
    case "OP-06": return state.day >= 3 && !opCompletedThisAct(state, op.id);
    case "OP-07": return readStat(state, "domestic") <= 50 || readStat(state, "mediaPanic") >= 55;
    case "OP-08": return readStat(state, "financialContagion") >= 55 || readStat(state, "economy") <= 40;
    case "OP-09": return readStat(state, "escalationLevel") >= 60 && readStat(state, "refugeePressure") >= 30;
    case "OP-10": return (state.day >= 28 && readStat(state, "warWeariness") >= 45) || (state.day >= 21 && hasFlagOrOutcome(state, "op_backchannel", "OP-01"));
    case "PJ-01": return true;
    case "PJ-02": return readStat(state, "careerCapital") < 60 || readStat(state, "jobs") < 55;
    case "PJ-03": return readStat(state, "migrationReadiness") < 55 && (FRONTLINE_CITIES.has(state.cityId || "") || readStat(state, "stress") >= 55);
    case "PJ-04": return readStat(state, "food") >= 125 || readStat(state, "foodSupply") < 45;
    case "PJ-05": return readStat(state, "familyStability") < 50 || readStat(state, "morale") < 45;
    case "PJ-06": return readStat(state, "debt") >= 45;
    case "PJ-07": return readStat(state, "health") < 60 || readStat(state, "stress") >= 60;
    case "PJ-08": return readStat(state, "reputation") < 55 || (state.cityEventTags || []).includes("community");
    case "PJ-09": return readStat(state, "internetAccess") < 60 || hasAnyTag(state, ["blackout", "cyber"]);
    case "PJ-10": return readStat(state, "cash") < 35 || state.philosophyId === "opportunist";
    default: return false;
  }
}

function repeatAllowed(op: OperationDefinition, state: OpsState) {
  if (op.repeatable) return true;
  if (op.limits?.includes("once-per-act") && opCompletedThisAct(state, op.id)) return false;
  const history = state.opsHistory.filter(entry => entry.id === op.id);
  if (history.some(entry => SUCCESS_PARTIAL_OUTCOMES.has(entry.outcome))) return false;
  return history.filter(entry => entry.outcome === "failure").length < 2;
}

function isBlockedByModifier(op: OperationDefinition, state: OpsState) {
  const sources = [state.factionId, state.roleId, state.cityId, state.philosophyId].filter(Boolean) as string[];
  return Object.values(OP_MODIFIERS).flat().some(rule =>
    sources.includes(rule.source) && rule.target === op.id && rule.type === "block" && rule.value === true
  );
}

function isBlockedBySynergy(op: OperationDefinition, state: OpsState) {
  return OP_SYNERGIES.some(rule => {
    if (rule.type !== "block") return false;
    if (!targetMatches(rule.target, op.id)) return false;
    if (rule.sourceState === "active") return state.activeOps.some(active => sourceMatches(rule.source, active.id));
    if (rule.sourceState === "failed") return state.opsHistory.some(entry => sourceMatches(rule.source, entry.id) && entry.outcome === "failure");
    return false;
  });
}

function canAfford(state: OpsState, effects: StatEffect) {
  return Object.entries(effects).every(([key, value]) => value >= 0 || readStat(state, key) + value >= 0);
}

function applyEffects(state: OpsState, effects: StatEffect = {}) {
  const next = cloneState(state);
  for (const [key, value] of Object.entries(effects)) {
    if (key.includes(".")) continue;
    const bucket = bucketForKey(next, key);
    bucket[key] = cl((bucket[key] ?? 0) + value);
  }
  return next;
}

function readStat(state: OpsState, key: string) {
  if (key in state.stats) return state.stats[key];
  if (key in state.crisis) return state.crisis[key];
  if (key in state.markets) return state.markets[key];
  return 0;
}

function bucketForKey(state: OpsState, key: string) {
  if (key in state.crisis) return state.crisis;
  if (key in state.markets) return state.markets;
  return state.stats;
}

function effectiveStartCost(op: OperationDefinition, state: OpsState) {
  let cost = { ...(op.startCost || {}) };
  if (state.factionId === "un" && state.mode === "war" && cost.chest) cost.chest *= 2;
  if (state.mode === "life" && readStat(state, "debt") >= 60) cost.cash = (cost.cash || 0) - 1;

  for (const rule of Object.values(OP_MODIFIERS).flat()) {
    if (!sourceApplies(rule.source, state) || rule.target !== op.id || rule.type !== "cost") continue;
    if (typeof rule.value === "object" && !Array.isArray(rule.value)) {
      for (const [key, value] of Object.entries(rule.value as Record<string, number>)) {
        if (key === "multiplier") continue;
        if (key === "cashPerDay") continue;
        cost[key] = (cost[key] || 0) + Number(value);
      }
    }
  }

  if (EXPENSIVE_CITIES.has(state.cityId || "") && cost.cash) cost.cash = Math.round(cost.cash * 1.25);
  return cost;
}

function effectiveDuration(op: OperationDefinition, state: OpsState) {
  let duration = op.durationDays;
  for (const rule of Object.values(OP_MODIFIERS).flat()) {
    if (sourceApplies(rule.source, state) && rule.target === op.id && rule.type === "duration") {
      duration += Number(rule.value);
    }
  }
  return Math.max(1, duration);
}

function upkeepDue(op: OperationDefinition, active: ActiveOpState, tickDay: number, state: OpsState) {
  const due: StatEffect = {};
  for (const rule of op.upkeep || []) {
    const interval = rule.intervalDays || 1;
    const key = upkeepKey(rule);
    const lastPaid = active.paidUpkeepDay[key] || active.startedDay;
    if (tickDay - lastPaid < interval) continue;
    const effects = effectiveUpkeepEffects(op, rule.effects, state);
    for (const [stat, value] of Object.entries(effects)) due[stat] = (due[stat] || 0) + value;
  }
  return due;
}

function effectiveUpkeepEffects(op: OperationDefinition, effects: StatEffect, state: OpsState) {
  const next = { ...effects };
  if (state.mode === "life" && op.id === "PJ-04" && CHEAPER_STAPLES_CITIES.has(state.cityId || "") && next.cash) next.cash += 2;
  if (state.mode === "life" && readStat(state, "debt") >= 60 && next.cash && next.cash < 0) next.cash -= 1;
  if (EXPENSIVE_CITIES.has(state.cityId || "") && next.cash) next.cash = Math.round(next.cash * 1.25);
  return next;
}

function upkeepKey(rule: { effects: StatEffect; intervalDays?: number; note?: string }) {
  return `${rule.intervalDays || 1}:${JSON.stringify(rule.effects)}:${rule.note || ""}`;
}

function maybeRiskTick(op: OperationDefinition, state: OpsState, roll: RngFn) {
  const riskLevel = op.risk === "high" ? "high" : op.risk === "low" ? "low" : "medium";
  let rate = RISK_TICK_RATE[riskLevel] * DIFFICULTY.riskRateMult;
  if (op.id === "OP-05" && state.activeOps.some(active => active.id === "OP-04")) rate = RISK_TICK_RATE.high * DIFFICULTY.riskRateMult;
  if (hasResolved(state, "PJ-05") && op.tags?.includes("stress")) rate = Math.max(0, rate - 5);
  if (roll() * 100 > rate) return null;
  return RISK_TICKS.find(tick => tick.appliesTo.includes(op.id)) || null;
}

function resolutionScore(op: OperationDefinition, active: ActiveOpState, state: OpsState) {
  const modifierScore = scoreFromModifiers(op, state);
  const synergyScore = scoreFromSynergies(op, state);
  const pj10Penalty = op.id === "PJ-10" ? priorOutcomeCount(state, "PJ-10", "failure") * 10 : 0;
  return Math.round(BASE_SCORE + DIFFICULTY.baseScoreDelta + modifierScore + synergyScore - active.riskPenalty - pj10Penalty);
}

function scoreFromModifiers(op: OperationDefinition, state: OpsState) {
  let score = 0;
  for (const rule of Object.values(OP_MODIFIERS).flat()) {
    if (rule.type !== "score" && rule.type !== "failureWeight") continue;
    if (!sourceApplies(rule.source, state) || rule.target !== op.id || typeof rule.value !== "number") continue;
    score += rule.type === "failureWeight" ? -rule.value : rule.value;
  }
  return score;
}

function scoreFromSynergies(op: OperationDefinition, state: OpsState) {
  let positive = 0;
  let negative = 0;
  for (const rule of OP_SYNERGIES) {
    if (rule.type !== "score" || !targetMatches(rule.target, op.id) || !synergySourceActive(rule, state)) continue;
    const value = typeof rule.value === "number" ? rule.value : Number((rule.value as Record<string, unknown>).score || 0);
    if (value > 0) positive += value;
    else negative += value;
  }
  if (op.id === "OP-04" && state.activeOps.some(active => active.id === "OP-05")) negative -= 5;
  if (op.id === "PJ-08" && state.opsHistory.some(entry => entry.id === "PJ-10" && entry.outcome === "failure")) negative -= 10;
  return Math.min(SYNERGY_SCORE_CAP, positive) + negative;
}

function effectsForOutcome(op: OperationDefinition, outcome: OpsOutcome) {
  if (outcome === "success") return { ...(op.success.effects || {}) };
  if (outcome === "failure") return { ...(op.failure.effects || {}) };
  if (outcome === "partial") {
    const explicit = op.partial?.effects;
    if (explicit) return { ...explicit };
    return Object.fromEntries(Object.entries(op.success.effects || {}).map(([key, value]) => [key, Math.trunc(value * PARTIAL_FACTOR)]));
  }
  return {};
}

function applyFlags(state: OpsState, op: OperationDefinition, outcome: OpsOutcome) {
  if (outcome !== "success" && outcome !== "partial") return state;
  const flags = outcome === "success" ? op.success.flags || [] : [];
  if (!flags.length) return state;
  return { ...state, opFlags: { ...state.opFlags, ...Object.fromEntries(flags.map(flag => [flag, true])) } };
}

function enqueueFollowUp(state: OpsState, op: OperationDefinition) {
  if (!op.followUp) return state;
  const followUp = {
    id: `${op.id}-follow-up-${state.pendingFollowUps.length + 1}`,
    opId: op.id,
    title: op.followUp.title,
    note: op.followUp.note,
    day: state.day,
  };
  return { ...state, pendingFollowUps: [...state.pendingFollowUps, followUp] };
}

function applyFailureCooldown(state: OpsState, opId: string) {
  return { ...state, opsCooldowns: { ...state.opsCooldowns, [opId]: state.day + 3 } };
}

function recordAbandon(state: OpsState, active: ActiveOpState, note: string, cooldownDays: number) {
  const op = definitionById(state.mode, active.id);
  const entry = {
    id: active.id,
    title: op?.title || active.id,
    instanceId: active.instanceId,
    day: state.day,
    act: state.act,
    outcome: "abandoned" as OpsOutcome,
    targetId: active.targetId,
    note,
  };
  return {
    ...state,
    activeOps: state.activeOps.filter(item => item.instanceId !== active.instanceId),
    opsHistory: [...state.opsHistory, entry],
    opsCooldowns: { ...state.opsCooldowns, [active.id]: state.day + cooldownDays },
  };
}

function orderedActiveOps(activeOps: ActiveOpState[]) {
  return [...activeOps].sort((a, b) => a.startedDay - b.startedDay || a.slotIndex - b.slotIndex || a.instanceId.localeCompare(b.instanceId));
}

function orderedReadyOps(activeOps: ActiveOpState[]) {
  return orderedActiveOps(activeOps).filter(active => active.status === "ready" || active.progress >= active.duration);
}

function findActiveOp(state: OpsState, activeOpId: string) {
  return state.activeOps.find(active => active.instanceId === activeOpId || active.id === activeOpId);
}

function sourceApplies(source: string, state: OpsState) {
  if (source === state.factionId || source === state.roleId || source === state.cityId || source === state.philosophyId) return true;
  if (source === "finance") return state.roleId === "finance";
  if (source === "compliance") return state.roleId === "compliance";
  if (source === "tech") return state.roleId === "tech";
  if (source === "cyber") return state.roleId === "cyber";
  return false;
}

function modifierApplies(source: string | undefined, target: string, type: string, value: unknown) {
  if (!source) return false;
  return Object.values(OP_MODIFIERS).flat().some(rule =>
    rule.source === source && rule.target === target && rule.type === type && rule.value === value
  );
}

function targetMatches(target: string | string[], id: string) {
  return Array.isArray(target) ? target.includes(id) : target === id;
}

function sourceMatches(source: string | string[], id: string) {
  return Array.isArray(source) ? source.includes(id) : source === id;
}

function synergySourceActive(rule: { source: string | string[]; sourceState?: string }, state: OpsState) {
  if (rule.sourceState === "active") return state.activeOps.some(active => sourceMatches(rule.source, active.id));
  if (rule.sourceState === "active-or-resolved") {
    return state.activeOps.some(active => sourceMatches(rule.source, active.id)) ||
      state.opsHistory.some(entry => sourceMatches(rule.source, entry.id) && SUCCESS_PARTIAL_OUTCOMES.has(entry.outcome));
  }
  if (rule.sourceState === "pair-resolved" && Array.isArray(rule.source)) {
    return rule.source.every(id => state.opsHistory.some(entry => entry.id === id && SUCCESS_PARTIAL_OUTCOMES.has(entry.outcome)));
  }
  return state.opsHistory.some(entry => sourceMatches(rule.source, entry.id) && SUCCESS_PARTIAL_OUTCOMES.has(entry.outcome));
}

function hasResolved(state: OpsState, id: string) {
  return state.opsHistory.some(entry => entry.id === id && SUCCESS_PARTIAL_OUTCOMES.has(entry.outcome));
}

function hasFlagOrOutcome(state: OpsState, flag: string, id: string) {
  return !!state.opFlags[flag] || hasResolved(state, id);
}

function hasAnyTag(state: OpsState, tags: string[]) {
  const allTags = [...(state.chainTags || []), ...(state.lifeEventTags || []), ...(state.cityEventTags || [])];
  return tags.some(tag => allTags.includes(tag));
}

function opCompletedThisAct(state: OpsState, id: string) {
  const act = state.act || 1;
  return state.opsHistory.some(entry => entry.id === id && entry.act === act && entry.outcome !== "abandoned");
}

function partialBandBonus(op: OperationDefinition, state: OpsState) {
  return op.id === "PJ-10" && state.philosophyId === "opportunist" ? 10 : 0;
}

function hasOutcomeFloor(op: OperationDefinition, state: OpsState) {
  return op.id === "PJ-05" && state.philosophyId === "protector";
}

function priorOutcomeCount(state: OpsState, id: string, outcome: OpsOutcome) {
  return state.opsHistory.filter(entry => entry.id === id && entry.outcome === outcome).length;
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
