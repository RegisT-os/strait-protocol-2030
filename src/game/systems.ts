import { GameMode } from "./data";
import {
  ActiveOpState,
  OpsHistoryEntry,
  OpsOutcome,
  OpsState,
  PendingFollowUp,
  createInitialOpsState,
  finalizeIncompleteOps,
  restoreOpsState,
  serializeOpsState,
} from "./operations";
import { rng as seededRng } from "./rng";

export const SAVE_VERSION_WITH_OPERATIONS = 4;

export interface OpsSaveFields {
  activeOps: ActiveOpState[];
  opsHistory: OpsHistoryEntry[];
  opsCooldowns: Record<string, number>;
  pendingFollowUps: PendingFollowUp[];
  opFlags: Record<string, unknown>;
  nextInstanceId: number;
}

export interface OperationsEndingPanelData {
  title: string;
  recordLines: string[];
  incompleteLines: string[];
  activeLines: string[];
  counts: Record<OpsOutcome | "active", number>;
}

export function createEmptyOpsSaveFields(mode: GameMode = "war"): OpsSaveFields {
  const empty = createInitialOpsState(mode);
  return pickOpsSaveFields(empty);
}

export function normalizeOpsSaveFields(raw: unknown): OpsSaveFields {
  const value = asRecord(raw);
  const activeOps = normalizeActiveOps(value.activeOps);
  const opsHistory = normalizeOpsHistory(value.opsHistory);
  const pendingFollowUps = normalizeFollowUps(value.pendingFollowUps);
  const nextInstanceId = Number.isFinite(Number(value.nextInstanceId))
    ? Math.max(1, Math.floor(Number(value.nextInstanceId)))
    : inferNextInstanceId(activeOps);

  return {
    activeOps,
    opsHistory,
    opsCooldowns: normalizeNumberRecord(value.opsCooldowns),
    pendingFollowUps,
    opFlags: normalizePlainRecord(value.opFlags),
    nextInstanceId,
  };
}

export function restoreOpsStateFromSave(raw: unknown, mode: GameMode = "war"): OpsState {
  const value = asRecord(raw);
  const fields = normalizeOpsSaveFields(value);
  return restoreOpsState({
    ...fields,
    day: Number.isFinite(Number(value.day)) ? Math.floor(Number(value.day)) : undefined,
    campaignLength: Number.isFinite(Number(value.campaignLength)) ? Math.floor(Number(value.campaignLength)) : undefined,
    act: Number.isFinite(Number(value.act)) ? Math.floor(Number(value.act)) : undefined,
    factionId: typeof value.factionId === "string" ? value.factionId : undefined,
    roleId: typeof value.roleId === "string" ? value.roleId : undefined,
    cityId: typeof value.cityId === "string" ? value.cityId : undefined,
    philosophyId: typeof value.philosophyId === "string" ? value.philosophyId : undefined,
    stats: normalizeNumberRecord(value.stats),
    crisis: normalizeNumberRecord(value.crisis),
    markets: normalizeNumberRecord(value.markets),
    fleets: Array.isArray(value.fleets) ? value.fleets.map(item => ({ ...asRecord(item) })) : undefined,
    chainTags: normalizeStringArray(value.chainTags),
    lifeEventTags: normalizeStringArray(value.lifeEventTags),
    cityEventTags: normalizeStringArray(value.cityEventTags),
  }, mode);
}

export function serializeOpsStateForSave(state: OpsState): OpsSaveFields {
  return pickOpsSaveFields(serializeOpsState(state));
}

export function buildOperationsRecordText(opsState: OpsState): string {
  const lines = opsState.opsHistory.map(formatHistoryLine);
  return ["OPERATIONS RECORD", ...(lines.length ? lines : ["No operations or projects recorded."])].join("\n");
}

export function buildIncompleteOpsText(opsState: OpsState): string {
  const incomplete = opsState.opsHistory
    .filter(entry => entry.outcome === "incomplete")
    .map(formatHistoryLine);
  const active = opsState.activeOps.map(activeOp => formatActiveLine(opsState, activeOp));
  const lines = [...incomplete, ...active];
  return ["INCOMPLETE AT END", ...(lines.length ? lines : ["No incomplete operations or projects."])].join("\n");
}

export function buildOperationsEndingPanelData(opsState: OpsState): OperationsEndingPanelData {
  const recordLines = opsState.opsHistory.map(formatHistoryLine);
  const incompleteLines = opsState.opsHistory.filter(entry => entry.outcome === "incomplete").map(formatHistoryLine);
  const activeLines = opsState.activeOps.map(activeOp => formatActiveLine(opsState, activeOp));
  return {
    title: "OPERATIONS RECORD",
    recordLines,
    incompleteLines,
    activeLines,
    counts: countOpsOutcomes(opsState),
  };
}

export function finalizeOpsForCampaignEndSave(opsState: OpsState, roll = seededRng): OpsState {
  return finalizeIncompleteOps(opsState, roll);
}

export function runOperationsSystemsSelfCheck() {
  const base = createInitialOpsState("war");
  const readyState: OpsState = {
    ...base,
    day: 10,
    activeOps: [
      readyOp("OP-02-2", "OP-02", 4, 1),
      readyOp("OP-01-1", "OP-01", 3, 1),
      readyOp("OP-03-3", "OP-03", 3, 0),
    ],
  };
  const sameDayOrder = [...readyState.activeOps]
    .sort((a, b) => a.startedDay - b.startedDay || a.slotIndex - b.slotIndex)
    .map(op => op.instanceId);

  const stalledState: OpsState = {
    ...base,
    day: 8,
    activeOps: [{ ...readyOp("OP-08-1", "OP-08", 4, 0), status: "suspended", progress: 1, duration: 4, suspendedDays: 4 }],
  };
  const serialized = serializeOpsStateForSave(stalledState);
  const restored = restoreOpsStateFromSave(serialized, "war");

  return {
    sameDayOrder,
    suspendedAutoAbandonShape: {
      status: stalledState.activeOps[0].status,
      suspendedDays: stalledState.activeOps[0].suspendedDays,
    },
    roundTripShape: {
      activeOps: restored.activeOps.length,
      opsHistory: restored.opsHistory.length,
      opsCooldowns: Object.keys(restored.opsCooldowns).length,
      pendingFollowUps: restored.pendingFollowUps.length,
    },
  };
}

function pickOpsSaveFields(state: OpsState): OpsSaveFields {
  return {
    activeOps: normalizeActiveOps(state.activeOps),
    opsHistory: normalizeOpsHistory(state.opsHistory),
    opsCooldowns: normalizeNumberRecord(state.opsCooldowns),
    pendingFollowUps: normalizeFollowUps(state.pendingFollowUps),
    opFlags: normalizePlainRecord(state.opFlags),
    nextInstanceId: state.nextInstanceId || inferNextInstanceId(state.activeOps),
  };
}

function normalizeActiveOps(value: unknown): ActiveOpState[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const record = asRecord(item);
    const id = typeof record.id === "string" ? record.id : "";
    const instanceId = typeof record.instanceId === "string" ? record.instanceId : id || "op-0";
    return {
      instanceId,
      id,
      startedDay: numberOr(record.startedDay, 1),
      startedAct: optionalNumber(record.startedAct),
      slotIndex: numberOr(record.slotIndex, 0),
      progress: numberOr(record.progress, 0),
      duration: numberOr(record.duration, 1),
      riskPenalty: numberOr(record.riskPenalty, 0),
      suspendedDays: numberOr(record.suspendedDays, 0),
      status: normalizeActiveStatus(record.status),
      paidUpkeepDay: normalizeNumberRecord(record.paidUpkeepDay),
      completedDay: optionalNumber(record.completedDay),
      targetId: typeof record.targetId === "string" ? record.targetId : undefined,
    };
  }).filter(item => item.id);
}

function normalizeOpsHistory(value: unknown): OpsHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const record = asRecord(item);
    const id = typeof record.id === "string" ? record.id : "";
    return {
      id,
      title: typeof record.title === "string" ? record.title : id,
      day: numberOr(record.day, 1),
      act: optionalNumber(record.act),
      outcome: normalizeOutcome(record.outcome),
      instanceId: typeof record.instanceId === "string" ? record.instanceId : undefined,
      roll: optionalNumber(record.roll),
      score: optionalNumber(record.score),
      effects: normalizeNumberRecord(record.effects),
      targetId: typeof record.targetId === "string" ? record.targetId : undefined,
      note: typeof record.note === "string" ? record.note : undefined,
    };
  }).filter(item => item.id);
}

function normalizeFollowUps(value: unknown): PendingFollowUp[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const record = asRecord(item);
    return {
      id: typeof record.id === "string" ? record.id : "",
      opId: typeof record.opId === "string" ? record.opId : "",
      title: typeof record.title === "string" ? record.title : "",
      note: typeof record.note === "string" ? record.note : "",
      day: numberOr(record.day, 1),
    };
  }).filter(item => item.id && item.opId);
}

function normalizeNumberRecord(value: unknown): Record<string, number> {
  const record = asRecord(value);
  return Object.fromEntries(Object.entries(record)
    .filter(([, item]) => Number.isFinite(Number(item)))
    .map(([key, item]) => [key, Number(item)]));
}

function normalizePlainRecord(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  return Object.fromEntries(Object.entries(record));
}

function normalizeStringArray(value: unknown): string[] {
  if (value instanceof Set) return [...value].filter(item => typeof item === "string") as string[];
  if (!Array.isArray(value)) return [];
  return value.filter(item => typeof item === "string");
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? value as Record<string, any> : {};
}

function numberOr(value: unknown, fallback: number) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function optionalNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : undefined;
}

function normalizeActiveStatus(value: unknown): ActiveOpState["status"] {
  return value === "suspended" || value === "ready" ? value : "active";
}

function normalizeOutcome(value: unknown): OpsOutcome {
  if (value === "success" || value === "partial" || value === "failure" || value === "abandoned" || value === "incomplete") return value;
  return "incomplete";
}

function inferNextInstanceId(activeOps: ActiveOpState[]) {
  const suffixes = activeOps
    .map(op => Number(String(op.instanceId).split("-").pop()))
    .filter(Number.isFinite);
  return suffixes.length ? Math.max(...suffixes) + 1 : 1;
}

function formatHistoryLine(entry: OpsHistoryEntry) {
  const note = entry.note ? ` (${entry.note})` : "";
  return `Day ${entry.day} · ${entry.title} — ${formatOutcome(entry.outcome)}${note}`;
}

function formatActiveLine(opsState: OpsState, activeOp: ActiveOpState) {
  const title = opsState.opsHistory.find(entry => entry.instanceId === activeOp.instanceId)?.title || activeOp.id;
  return `Day ${opsState.day} · ${title} — Incomplete (${activeOp.progress}/${activeOp.duration} days)`;
}

function formatOutcome(outcome: OpsOutcome) {
  return outcome.split(" ").map(part => part.slice(0, 1).toUpperCase() + part.slice(1)).join(" ");
}

function countOpsOutcomes(opsState: OpsState): Record<OpsOutcome | "active", number> {
  const counts = { success: 0, partial: 0, failure: 0, abandoned: 0, incomplete: 0, active: opsState.activeOps.length };
  for (const entry of opsState.opsHistory) counts[entry.outcome] += 1;
  return counts;
}

function readyOp(instanceId: string, id: string, startedDay: number, slotIndex: number): ActiveOpState {
  return {
    instanceId,
    id,
    startedDay,
    slotIndex,
    progress: 5,
    duration: 5,
    riskPenalty: 0,
    suspendedDays: 0,
    status: "ready",
    paidUpkeepDay: {},
  };
}
