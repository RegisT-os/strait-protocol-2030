export type GameMode = "war" | "life";
export type RiskLevel = "low" | "low-medium" | "medium" | "medium-high" | "high";
export type StatEffect = Record<string, number>;

export interface CostRule {
  effects: StatEffect;
  intervalDays?: number;
  note?: string;
}

export interface FollowUpDefinition {
  title: string;
  note: string;
}

export interface OperationDefinition {
  id: string;
  title: string;
  mode: GameMode;
  trigger: string;
  durationDays: number;
  startCost?: StatEffect;
  upkeep?: CostRule[];
  risk: RiskLevel;
  riskNotes?: string[];
  success: {
    effects?: StatEffect;
    fleetEffects?: StatEffect;
    flags?: string[];
    notes?: string[];
  };
  partial?: {
    effects?: StatEffect;
    notes?: string[];
  };
  failure: {
    effects?: StatEffect;
    fleetEffects?: StatEffect;
    notes?: string[];
  };
  affectedStats: string[];
  followUp?: FollowUpDefinition;
  endingHook: string;
  tags?: string[];
  repeatable?: boolean;
  limits?: string[];
}

export interface ModifierRule {
  source: string;
  target: string;
  type: "score" | "cost" | "duration" | "trigger" | "block" | "floor" | "failureWeight" | "partialBand" | "effect";
  value: number | boolean | string | StatEffect | Record<string, unknown>;
  note: string;
}

export interface SynergyRule {
  source: string | string[];
  target: string | string[];
  type: "score" | "cost" | "severity" | "block" | "trigger";
  value: number | boolean | string | Record<string, unknown>;
  note: string;
  sourceState?: "active" | "resolved" | "active-or-resolved" | "failed" | "pair-resolved";
}

export interface RiskTickDefinition {
  id: string;
  title: string;
  appliesTo: string[];
  effects: StatEffect;
  failureBandPenalty: number;
  note: string;
  tags?: string[];
}

export const BASE_SCORE = 60;
export const RISK_TICK_RATE = { low: 10, medium: 22, high: 35 } as const;
export const RISK_TICK_PENALTY = 10;
export const RISK_PENALTY_CAP = 30;
export const PARTIAL_FACTOR = 0.5;
export const SYNERGY_SCORE_CAP = 20;
export const DIFFICULTY = { baseScoreDelta: 0, riskRateMult: 1.0, upkeepMult: 1.0, budgetMult: 1.0 } as const;

export const WAR_OPERATIONS: OperationDefinition[] = [
  {
    id: "OP-01",
    title: "Diplomatic Backchannel",
    mode: "war",
    trigger: "crisis.escalationLevel >= 45 AND day >= 5",
    durationDays: 8,
    startCost: { chest: -4 },
    upkeep: [{ intervalDays: 4, effects: { credibility: -1 }, note: "Deniability strain" }],
    risk: "medium",
    riskNotes: ["Leak risk each tick"],
    success: {
      effects: { escalationLevel: -14, allianceCohesion: 6, credibility: 5 },
      flags: ["op_backchannel"],
      notes: ["Unlocks Ceasefire Framework trigger one act early"],
    },
    failure: {
      effects: { credibility: -8, domestic: -6, mediaPanic: 10 },
      notes: ["Leak", "Faction pressure hit such as politburo -6 for China or coalition -5 for US-Dem"],
    },
    affectedStats: ["escalationLevel", "credibility", "allianceCohesion", "domestic", "mediaPanic"],
    followUp: {
      title: "The Other Side Answers",
      note: "Choice card offering a prisoner/hostage gesture versus a demand for public concession",
    },
    endingHook: "Success flag op_backchannel is a precondition for diplomatic A-tier endings.",
    tags: ["diplomacy", "backchannel"],
  },
  {
    id: "OP-02",
    title: "Cyber Defense Surge",
    mode: "war",
    trigger: "crisis.cyberDisruption >= 40 OR a chain event with a cyber tag has fired",
    durationDays: 5,
    startCost: { chest: -6 },
    risk: "low",
    success: {
      effects: { cyberDisruption: -16, publicTrust: 5, stability: 3 },
      notes: ["While active, incoming sudden events with cyber effects are halved"],
    },
    failure: {
      effects: { cyberDisruption: 6, chest: -3 },
      notes: ["Botched patch window"],
    },
    affectedStats: ["cyberDisruption", "publicTrust", "stability", "chest"],
    followUp: {
      title: "Attribution Package",
      note: "Publish attribution for credibility/escalation or bank it quietly for proxy gain",
    },
    endingHook: "Counts toward Resilience ending note and prevents cyber-collapse D ending if completed before Day 30.",
    tags: ["cyber", "resilience"],
  },
  {
    id: "OP-03",
    title: "Carrier Resupply Window",
    mode: "war",
    trigger: "Any non-hostile fleet with sup < 20",
    durationDays: 4,
    startCost: { chest: -5, fuel: -4 },
    risk: "medium",
    riskNotes: ["Interdiction roll if escalationLevel >= 65", "Consumes 1 fleet command point on start day"],
    success: {
      effects: { supply: 6 },
      fleetEffects: { sup: 28 },
      notes: ["Clears the target fleet CRITICAL note"],
    },
    failure: {
      effects: { escalationLevel: 6, shippingInsuranceCost: 8 },
      fleetEffects: { sup: 10 },
      notes: ["Convoy harassed"],
    },
    affectedStats: ["fleet.sup", "supply", "fuel", "escalationLevel", "shippingInsuranceCost"],
    followUp: {
      title: "Escort Doctrine",
      note: "Set standing escort policy: recurring small fuel upkeep versus recurring interdiction risk",
    },
    endingHook: "Zero out-of-supply fleets at game end adds the Logistics Won This ending note.",
    tags: ["fleet", "logistics"],
    repeatable: true,
  },
  {
    id: "OP-04",
    title: "Sanctions Package",
    mode: "war",
    trigger: "day >= 8 AND credibility >= 45; not available to UN faction",
    durationDays: 7,
    startCost: { economy: -5 },
    upkeep: [{ intervalDays: 3, effects: { economy: -1 } }],
    risk: "medium-high",
    riskNotes: ["Retaliation roll"],
    success: {
      effects: { escalationLevel: 4, chest: 6, credibility: 7, allianceCohesion: 5 },
      notes: ["Opens the Sanctions Bite chain event"],
    },
    failure: {
      effects: { allianceCohesion: -8, economy: -4 },
      notes: ["Coalition splits on enforcement", "Faction private hit such as unity -6 for EU/ASEAN"],
    },
    affectedStats: ["economy", "credibility", "allianceCohesion", "chest", "escalationLevel"],
    followUp: {
      title: "Exemption Lobby",
      note: "Carve-outs for key industries: economy gain versus credibility loss",
    },
    endingHook: "Economic-victory endings require either this operation or Market Stabilization completed.",
    tags: ["finance", "sanctions"],
  },
  {
    id: "OP-05",
    title: "Humanitarian Corridor",
    mode: "war",
    trigger: "crisis.humanitarianDamage >= 35 OR refugeePressure >= 40",
    durationDays: 6,
    startCost: { chest: -4, supply: -3 },
    upkeep: [{ intervalDays: 2, effects: { supply: -1 } }],
    risk: "medium",
    riskNotes: ["Corridor incident roll", "Risk worsens if escalationLevel >= 70"],
    success: {
      effects: { humanitarianDamage: -15, refugeePressure: -10, global: 8, publicTrust: 6 },
    },
    failure: {
      effects: { humanitarianDamage: 8, mediaPanic: 12, global: -5 },
      notes: ["Corridor strike incident"],
    },
    affectedStats: ["humanitarianDamage", "refugeePressure", "global", "publicTrust", "supply"],
    followUp: {
      title: "Permanent Mandate",
      note: "Institutionalize the corridor with recurring upkeep and recurring legitimacy gain",
    },
    endingHook: "Required for the UN A+ ending and adds humanitarian note to any faction summary.",
    tags: ["humanitarian", "corridor"],
  },
  {
    id: "OP-06",
    title: "Intelligence Collection",
    mode: "war",
    trigger: "Always available from day 3; only one instance per act",
    durationDays: 5,
    startCost: { chest: -3 },
    upkeep: [{ intervalDays: 2, effects: { proxy: -1 }, note: "Asset exposure" }],
    risk: "low-medium",
    riskNotes: ["Burn-an-asset roll"],
    success: {
      effects: { proxy: 6 },
      notes: ["For next 6 days, choice previews show one extra hidden consequence line", "Reveals the next queued chain event in the side panel"],
    },
    failure: {
      effects: { proxy: -8, credibility: -3 },
      notes: ["Asset burned", "Adversary counter-op sudden event becomes eligible"],
    },
    affectedStats: ["proxy", "credibility", "chest"],
    followUp: {
      title: "Defector in the Net",
      note: "Exploit immediately for big one-time intel or run long-term for recurring small proxy gain",
    },
    endingHook: "Two or more successful intel ops add the Shadow War doctrine note to the ending summary.",
    tags: ["intelligence", "proxy"],
    limits: ["once-per-act"],
  },
  {
    id: "OP-07",
    title: "Domestic Messaging Campaign",
    mode: "war",
    trigger: "domestic <= 50 OR crisis.mediaPanic >= 55",
    durationDays: 6,
    startCost: { chest: -3 },
    upkeep: [{ intervalDays: 3, effects: { credibility: -1 }, note: "Spin fatigue" }],
    risk: "low",
    success: {
      effects: { domestic: 10, mediaPanic: -10, publicTrust: 6 },
    },
    failure: {
      effects: { publicTrust: -8, credibility: -5 },
      notes: ["Astroturf exposed"],
    },
    affectedStats: ["domestic", "mediaPanic", "publicTrust", "credibility"],
    followUp: {
      title: "Opposition Buys Airtime",
      note: "Counter-spend or accept a high-variance debate offer",
    },
    endingHook: "Prevents domestic-collapse endings from triggering at endgame margins by raising thresholds by 5.",
    tags: ["domestic", "media"],
  },
  {
    id: "OP-08",
    title: "Emergency Market Stabilization",
    mode: "war",
    trigger: "crisis.financialContagion >= 55 OR economy <= 40",
    durationDays: 4,
    startCost: { chest: -10 },
    risk: "medium",
    success: {
      effects: { financialContagion: -18, economy: 8 },
      notes: ["Recession indicator recomputes lower next tick"],
    },
    failure: {
      effects: { chest: -5, financialContagion: -4, publicTrust: -5 },
      notes: ["Intervention absorbed by panic"],
    },
    affectedStats: ["financialContagion", "economy", "chest", "publicTrust"],
    followUp: {
      title: "Moral Hazard Hearing",
      note: "Defend the bailout or claw back support",
    },
    endingHook: "Bankruptcy of Power endings check chest after this spend, making it a real gamble.",
    tags: ["finance", "markets"],
  },
  {
    id: "OP-09",
    title: "Evacuation Planning",
    mode: "war",
    trigger: "crisis.escalationLevel >= 60 AND refugeePressure >= 30",
    durationDays: 5,
    startCost: { chest: -4, fuel: -3 },
    risk: "low",
    riskNotes: ["Benefit realized only if escalation later crosses 80"],
    success: {
      effects: {},
      flags: ["op_evac_ready"],
      notes: ["If escalationLevel >= 80 later, automatic mitigation fires once: humanitarianDamage -12, domestic +6, refugeePressure -8"],
    },
    partial: {
      notes: ["Half effect, chest spent regardless"],
    },
    failure: {
      notes: ["Plan shelved incomplete"],
    },
    affectedStats: ["humanitarianDamage", "refugeePressure", "domestic", "fuel", "chest"],
    followUp: {
      title: "Allies Want In",
      note: "Share the plan for alliance cohesion at proxy cost, or keep it national",
    },
    endingHook: "If the run ends above escalation 80 with this complete, ending body appends the planes were ready clause and grade floor rises one step.",
    tags: ["evacuation", "humanitarian", "refugee"],
  },
  {
    id: "OP-10",
    title: "Ceasefire Framework",
    mode: "war",
    trigger: "day >= 28 AND (crisis.warWeariness >= 45 OR op_backchannel succeeded)",
    durationDays: 9,
    startCost: { credibility: -4 },
    upkeep: [{ note: "Player choices may not raise escalationLevel by more than +6 per turn or the operation collapses", effects: {} }],
    risk: "high",
    riskNotes: ["Spoiler roll every 3 days", "Risk worsens if nuclearRisk >= 50"],
    success: {
      effects: { escalationLevel: -25, warWeariness: -10, globalStability: 12 },
      flags: ["op_ceasefire"],
    },
    failure: {
      effects: { escalationLevel: 10, credibility: -8, mediaPanic: 10 },
      notes: ["Talks collapse publicly"],
    },
    affectedStats: ["escalationLevel", "warWeariness", "globalStability", "credibility", "mediaPanic"],
    followUp: {
      title: "Verification Annex",
      note: "Intrusive monitoring for durability at sovereignty cost, or fragile paper terms for free",
    },
    endingHook: "Strongest single ending lever for quiet peace endings.",
    tags: ["diplomacy", "ceasefire"],
  },
];

export const LIFE_PROJECTS: OperationDefinition[] = [
  {
    id: "PJ-01",
    title: "Build Emergency Fund",
    mode: "life",
    trigger: "Always available; recommended when cash < 40",
    durationDays: 7,
    upkeep: [{ intervalDays: 1, effects: { cash: -3 }, note: "Auto-deduct savings" }],
    risk: "low",
    success: {
      effects: { cash: 24, stress: -4, emergencyPreparedness: 6 },
      notes: ["Forced savings plus small interest"],
    },
    failure: {
      effects: { stress: 5 },
      notes: ["Emergency drains it mid-project; keep half; worsens if household crisis fired"],
    },
    affectedStats: ["cash", "stress", "emergencyPreparedness"],
    followUp: {
      title: "Bank Withdrawal Limits",
      note: "Keep cash at home with theft risk or spread accounts with USD exposure",
    },
    endingHook: "Cash >= 70 endings require this or Side Hustle; adds cushion note.",
    tags: ["finance", "household"],
  },
  {
    id: "PJ-02",
    title: "Upskill for Crisis Career",
    mode: "life",
    trigger: "careerCapital < 60 OR market.jobs < 55",
    durationDays: 10,
    startCost: { cash: -8 },
    upkeep: [{ intervalDays: 2, effects: { stress: 1 } }],
    risk: "low",
    success: {
      effects: { careerCapital: 14, jobSecurity: 8, monthlyIncome: 6 },
    },
    failure: {
      effects: { careerCapital: 5 },
      notes: ["Course mill or layoff mid-course; cash not refunded"],
    },
    affectedStats: ["careerCapital", "jobSecurity", "monthlyIncome", "stress"],
    followUp: {
      title: "Recruiter Pings You",
      note: "Jump employers for income with job security reset, or leverage for raise",
    },
    endingHook: "Powers Career Ascendant; tech/cyber/finance roles get duration -3.",
    tags: ["career", "remote"],
  },
  {
    id: "PJ-03",
    title: "Prepare Migration Packet",
    mode: "life",
    trigger: "migrationReadiness < 55 AND (city is taipei/seoul/hong_kong OR stress >= 55)",
    durationDays: 8,
    startCost: { cash: -10 },
    upkeep: [{ intervalDays: 3, effects: { legalRisk: 1 }, note: "Document grey zones" }],
    risk: "medium",
    success: {
      effects: { migrationReadiness: 22, stress: -5 },
      flags: ["pj_exit_ready"],
    },
    failure: {
      effects: { migrationReadiness: 8, cash: -4 },
      notes: ["Visa rules change mid-process"],
    },
    affectedStats: ["migrationReadiness", "legalRisk", "stress", "cash"],
    followUp: {
      title: "The Window Opens",
      note: "Leave now for early migration ending or hold the packet",
    },
    endingHook: "Unlocks Clean Exit ending family; exit-philosophy runs get success +15.",
    tags: ["migration", "exit"],
  },
  {
    id: "PJ-04",
    title: "Stockpile Supplies",
    mode: "life",
    trigger: "market.food >= 125 OR foodSupply < 45",
    durationDays: 5,
    upkeep: [{ intervalDays: 1, effects: { cash: -4 }, note: "Purchases scale with food/fuel indices" }],
    risk: "low",
    success: {
      effects: { foodSupply: 16, fuelAccess: 8, medicineAccess: 6, emergencyPreparedness: 8 },
      notes: ["Immune to shortage sudden events for 7 days after completion"],
    },
    failure: {
      effects: { stress: 4 },
      notes: ["Spoilage or confiscation; half stocks"],
    },
    affectedStats: ["foodSupply", "fuelAccess", "medicineAccess", "emergencyPreparedness", "cash"],
    followUp: {
      title: "Neighbors Notice",
      note: "Share for reputation at stock cost, or hide with stress/legal risk in rationing cities",
    },
    endingHook: "Fortress Household requires this plus Backup Power.",
    tags: ["supplies", "shortage"],
  },
  {
    id: "PJ-05",
    title: "Repair Family Trust",
    mode: "life",
    trigger: "familyStability < 50 OR morale < 45",
    durationDays: 6,
    upkeep: [{ intervalDays: 1, effects: { monthlyIncome: -2 }, note: "Time off shifts while active" }],
    risk: "low",
    success: {
      effects: { familyStability: 14, morale: 8, stress: -6 },
    },
    failure: {
      effects: { familyStability: 4, stress: 5 },
      notes: ["Old wound reopens"],
    },
    affectedStats: ["familyStability", "morale", "stress", "monthlyIncome"],
    followUp: {
      title: "Family Council",
      note: "Pool finances for cash at autonomy cost, or stay separate",
    },
    endingHook: "Protector-philosophy endings check familyStability >= 65; this is the main lever.",
    tags: ["family", "stress"],
  },
  {
    id: "PJ-06",
    title: "Reduce Debt",
    mode: "life",
    trigger: "debt >= 45",
    durationDays: 9,
    upkeep: [{ intervalDays: 1, effects: { cash: -5 }, note: "Routed to principal" }],
    risk: "low",
    success: {
      effects: { debt: -22, stress: -6, monthlyIncome: 3 },
      notes: ["Less interest drag"],
    },
    failure: {
      effects: { debt: -10 },
      notes: ["Rate hike mid-plan"],
    },
    affectedStats: ["debt", "cash", "stress", "monthlyIncome"],
    followUp: {
      title: "Consolidation Offer",
      note: "Refinance for debt relief with legal fine print, or decline",
    },
    endingHook: "Hard-blocks Debt Collapse if completed; debt <= 20 endings effectively require it.",
    tags: ["finance", "debt"],
  },
  {
    id: "PJ-07",
    title: "Improve Health Routine",
    mode: "life",
    trigger: "health < 60 OR stress >= 60",
    durationDays: 7,
    upkeep: [{ intervalDays: 2, effects: { cash: -2 } }],
    risk: "low",
    success: {
      effects: { health: 12, stress: -10, morale: 6 },
    },
    failure: {
      effects: { health: 4 },
      notes: ["Burnout relapse"],
    },
    affectedStats: ["health", "stress", "morale"],
    followUp: {
      title: "Clinic Slot Opens",
      note: "Preventive checkup for health or give the slot to family",
    },
    endingHook: "Survival endings with health < 35 downgrade one grade; this is the counter.",
    tags: ["health", "stress"],
  },
  {
    id: "PJ-08",
    title: "Build Community Network",
    mode: "life",
    trigger: "reputation < 55 OR city event with community tag fired",
    durationDays: 8,
    upkeep: [
      { intervalDays: 2, effects: { stress: 1 } },
      { intervalDays: 3, effects: { cash: -2 } },
    ],
    risk: "low",
    success: {
      effects: { reputation: 14, foodSupply: 5, medicineAccess: 5, morale: 6 },
      notes: ["Community absorbs one future bad event by negating one failure roll once"],
    },
    failure: {
      effects: { reputation: 5, stress: 4 },
      notes: ["Network politics"],
    },
    affectedStats: ["reputation", "foodSupply", "medicineAccess", "morale", "stress"],
    followUp: {
      title: "They Ask You to Lead",
      note: "Accept for more reputation with stress/time cost, or support quietly",
    },
    endingHook: "Civic-philosophy A endings require this completed; adds Community Pillar note.",
    tags: ["community"],
  },
  {
    id: "PJ-09",
    title: "Secure Backup Internet / Power",
    mode: "life",
    trigger: "internetAccess < 60 OR a blackout/cyber life event fired",
    durationDays: 6,
    startCost: { cash: -12 },
    risk: "low-medium",
    riskNotes: ["Supply scams", "Hardware cost scales with market.fuel"],
    success: {
      effects: { internetAccess: 15, emergencyPreparedness: 10, jobSecurity: 4 },
      notes: ["Remote work survives outages", "Blackout events lose stat penalties for rest of run"],
    },
    failure: {
      effects: { internetAccess: 5 },
      notes: ["Counterfeit gear; cash gone"],
    },
    affectedStats: ["internetAccess", "emergencyPreparedness", "jobSecurity", "cash"],
    followUp: {
      title: "Neighbor Wants to Plug In",
      note: "Share capacity for reputation or charge for cash at reputation cost",
    },
    endingHook: "Required with PJ-04 for Fortress Household; tech/cyber roles get cost -4.",
    tags: ["blackout", "remote", "cyber"],
  },
  {
    id: "PJ-10",
    title: "Risky Side Hustle",
    mode: "life",
    trigger: "cash < 35 OR opportunist philosophy",
    durationDays: 6,
    upkeep: [
      { intervalDays: 2, effects: { stress: 2 } },
      { intervalDays: 2, effects: { legalRisk: 2 } },
    ],
    risk: "high",
    success: {
      effects: { cash: 30, careerCapital: 6, reputation: 4 },
    },
    partial: {
      effects: { cash: 12, legalRisk: 4 },
    },
    failure: {
      effects: { cash: -8, legalRisk: 12, reputation: -8 },
      notes: ["Caught or scammed", "Spawns Paying It Back obligation event chain"],
    },
    affectedStats: ["cash", "legalRisk", "reputation", "stress", "careerCapital"],
    followUp: {
      title: "Scale It or Fold It",
      note: "Repeatable with escalating risk, +10 failure weight per prior run",
    },
    endingHook: "Enables Grey Fortune; two failures hard-unlock Burned ending.",
    tags: ["grey", "cash"],
    repeatable: true,
  },
];

export const OP_MODIFIERS = {
  faction: [
    { source: "us_dem", target: "OP-01", type: "score", value: 10, note: "US-Dem gains on Diplomatic Backchannel" },
    { source: "us_dem", target: "OP-05", type: "score", value: 10, note: "US-Dem gains on Humanitarian Corridor" },
    { source: "us_rep", target: "OP-03", type: "score", value: 10, note: "US-Rep gains on Carrier Resupply Window" },
    { source: "us_rep", target: "OP-01", type: "score", value: -5, note: "US-Rep penalty on Diplomatic Backchannel" },
    { source: "china", target: "OP-02", type: "score", value: 10, note: "China gains on Cyber Defense Surge" },
    { source: "china", target: "OP-06", type: "score", value: 10, note: "China gains on Intelligence Collection" },
    { source: "china", target: "OP-04", type: "block", value: true, note: "China cannot start Sanctions Package; future mirror is Export Controls" },
    { source: "eu", target: "OP-04", type: "score", value: 15, note: "EU gains on Sanctions Package" },
    { source: "eu", target: "OP-08", type: "score", value: 15, note: "EU gains on Emergency Market Stabilization" },
    { source: "un", target: "OP-05", type: "score", value: 15, note: "UN gains on Humanitarian Corridor" },
    { source: "un", target: "OP-10", type: "score", value: 15, note: "UN gains on Ceasefire Framework" },
    { source: "un", target: "OP-06", type: "block", value: true, note: "UN cannot start Intelligence Collection" },
    { source: "russia", target: "OP-06", type: "score", value: 10, note: "Russia gains on Intelligence Collection" },
    { source: "russia", target: "OP-10", type: "score", value: -10, note: "Russia penalty on Ceasefire Framework" },
    { source: "north_korea", target: "OP-08", type: "block", value: true, note: "North Korea cannot start Emergency Market Stabilization" },
    { source: "north_korea", target: "OP-06", type: "score", value: 15, note: "North Korea gains on Intelligence Collection" },
    { source: "asean", target: "OP-09", type: "score", value: 10, note: "ASEAN gains on Evacuation Planning" },
    { source: "asean", target: "OP-04", type: "cost", value: { unity: -4 }, note: "ASEAN pays extra unity cost on Sanctions Package" },
  ] satisfies ModifierRule[],
  role: [
    { source: "finance", target: "PJ-01", type: "score", value: 10, note: "Finance role gains on Build Emergency Fund" },
    { source: "finance", target: "PJ-06", type: "score", value: 10, note: "Finance role gains on Reduce Debt" },
    { source: "compliance", target: "PJ-01", type: "score", value: 10, note: "Compliance role gains on Build Emergency Fund" },
    { source: "compliance", target: "PJ-06", type: "score", value: 10, note: "Compliance role gains on Reduce Debt" },
    { source: "tech", target: "PJ-09", type: "score", value: 10, note: "Tech role gains on Backup Internet / Power" },
    { source: "tech", target: "PJ-09", type: "cost", value: { cash: 4 }, note: "Tech role reduces PJ-09 cost by 4" },
    { source: "tech", target: "PJ-02", type: "duration", value: -3, note: "Tech role reduces PJ-02 duration by 3 days" },
    { source: "cyber", target: "PJ-09", type: "score", value: 10, note: "Cyber role gains on Backup Internet / Power" },
    { source: "cyber", target: "PJ-09", type: "cost", value: { cash: 4 }, note: "Cyber role reduces PJ-09 cost by 4" },
    { source: "cyber", target: "PJ-02", type: "duration", value: -3, note: "Cyber role reduces PJ-02 duration by 3 days" },
    { source: "nurse", target: "PJ-07", type: "score", value: 10, note: "Nurse gains on Improve Health Routine" },
    { source: "nurse", target: "PJ-04", type: "effect", value: { medicineMarketEffectsMult: 2 }, note: "Nurse doubles medicine market effects on Stockpile Supplies" },
    { source: "journalist", target: "PJ-08", type: "score", value: 10, note: "Journalist gains on Community Network" },
    { source: "journalist", target: "PJ-10", type: "failureWeight", value: 10, note: "Journalist adds failure weight on Risky Side Hustle" },
    { source: "migrant", target: "PJ-03", type: "score", value: -10, note: "Migrant penalty on Migration Packet success" },
    { source: "migrant", target: "PJ-03", type: "trigger", value: "always", note: "Migrant always meets Migration Packet trigger" },
    { source: "student", target: "PJ-02", type: "duration", value: -2, note: "Student reduces PJ-02 duration by 2 days" },
  ] satisfies ModifierRule[],
  city: [
    { source: "taipei", target: "PJ-03", type: "trigger", value: "always", note: "Taipei always meets Migration Packet trigger" },
    { source: "taipei", target: "PJ-04", type: "trigger", value: "always", note: "Taipei always meets Stockpile Supplies trigger" },
    { source: "taipei", target: "PJ-09", type: "score", value: 10, note: "Taipei gains on Backup Internet / Power" },
    { source: "seoul", target: "PJ-03", type: "trigger", value: "always", note: "Seoul always meets Migration Packet trigger" },
    { source: "seoul", target: "PJ-04", type: "trigger", value: "always", note: "Seoul always meets Stockpile Supplies trigger" },
    { source: "seoul", target: "PJ-09", type: "score", value: 10, note: "Seoul gains on Backup Internet / Power" },
    { source: "kl_pj", target: "PJ-04", type: "cost", value: { cashPerDay: 2 }, note: "Kuala Lumpur/PJ reduces PJ-04 cost by 2 per day" },
    { source: "kl_pj", target: "PJ-10", type: "score", value: 5, note: "Kuala Lumpur/PJ informal economy improves Side Hustle success" },
    { source: "jakarta", target: "PJ-04", type: "cost", value: { cashPerDay: 2 }, note: "Jakarta reduces PJ-04 cost by 2 per day" },
    { source: "jakarta", target: "PJ-10", type: "score", value: 5, note: "Jakarta informal economy improves Side Hustle success" },
    { source: "manila", target: "PJ-04", type: "cost", value: { cashPerDay: 2 }, note: "Manila reduces PJ-04 cost by 2 per day" },
    { source: "manila", target: "PJ-10", type: "score", value: 5, note: "Manila informal economy improves Side Hustle success" },
    { source: "singapore", target: "PJ-01", type: "score", value: 10, note: "Singapore gains on Build Emergency Fund" },
    { source: "singapore", target: "PJ-06", type: "score", value: 10, note: "Singapore gains on Reduce Debt" },
    { source: "singapore", target: "PJ-10", type: "failureWeight", value: 10, note: "Singapore enforcement adds Side Hustle failure weight" },
    { source: "hong_kong", target: "PJ-01", type: "score", value: 10, note: "Hong Kong gains on Build Emergency Fund" },
    { source: "hong_kong", target: "PJ-06", type: "score", value: 10, note: "Hong Kong gains on Reduce Debt" },
    { source: "hong_kong", target: "PJ-10", type: "failureWeight", value: 10, note: "Hong Kong enforcement adds Side Hustle failure weight" },
    { source: "london", target: "PJ-02", type: "score", value: 10, note: "London gains on Upskill for Crisis Career" },
    { source: "london", target: "life_cash_costs", type: "cost", value: { multiplier: 1.25 }, note: "London increases all cash costs by 25%" },
    { source: "new_york", target: "PJ-02", type: "score", value: 10, note: "New York gains on Upskill for Crisis Career" },
    { source: "new_york", target: "life_cash_costs", type: "cost", value: { multiplier: 1.25 }, note: "New York increases all cash costs by 25%" },
  ] satisfies ModifierRule[],
  philosophy: [
    { source: "protector", target: "PJ-05", type: "floor", value: "partial", note: "Protector worst case on Repair Family Trust is partial" },
    { source: "civic", target: "PJ-08", type: "score", value: 15, note: "Civic gains on Community Network" },
    { source: "exit", target: "PJ-03", type: "score", value: 15, note: "Exit philosophy gains on Migration Packet" },
    { source: "opportunist", target: "PJ-10", type: "partialBand", value: "widen", note: "Opportunist widens PJ-10 partial band for more partials and fewer outright failures" },
  ] satisfies ModifierRule[],
} as const;

export const OP_SYNERGIES: SynergyRule[] = [
  {
    source: "OP-01",
    target: "OP-10",
    type: "score",
    value: { score: 12, trigger: "unlock-one-act-early", flag: "op_backchannel" },
    note: "S1: Trust channel already exists; Backchannel success gives Ceasefire Framework score +12 and unlocks trigger one act early.",
    sourceState: "resolved",
  },
  {
    source: "OP-05",
    target: "OP-10",
    type: "score",
    value: 8,
    note: "S2: Legitimacy makes terms sellable; Humanitarian Corridor success/partial gives Ceasefire Framework score +8.",
    sourceState: "resolved",
  },
  {
    source: "OP-04",
    target: "OP-05",
    type: "score",
    value: { score: -10, riskTickRateBandDelta: 1, reverse: { source: "OP-05", target: "OP-04", score: -5 } },
    note: "S3: Sanctions choke the same routes aid uses; while OP-04 is active, OP-05 score -10 and corridor risk-tick rate +1 band. OP-05 active also gives OP-04 score -5.",
    sourceState: "active",
  },
  {
    source: "OP-02",
    target: "OP-06",
    type: "score",
    value: 10,
    note: "S4: Clean networks protect collection; Cyber Defense Surge success/partial gives Intelligence Collection score +10.",
    sourceState: "resolved",
  },
  {
    source: "OP-02",
    target: "cyber_chain_events",
    type: "severity",
    value: { tag: "cyber", multiplier: 0.5, rounding: "toward-zero" },
    note: "S5: Hardened infrastructure halves cyber-tagged chain/sudden effects while active or after success/partial.",
    sourceState: "active-or-resolved",
  },
  {
    source: "OP-03",
    target: "fleet_system",
    type: "severity",
    value: { targetFleetExitsCritical: true, endingCounter: "op03_successes", activeOutOfSupplyReadinessPenaltyMultiplier: 0.5 },
    note: "S6: Active replenishment pipeline; each success/partial exits target fleet from CRITICAL and counts toward Logistics Won This. While any OP-03 is active, out-of-supply readiness penalty is halved.",
    sourceState: "active-or-resolved",
  },
  {
    source: "OP-08",
    target: "financial_crash_chains",
    type: "severity",
    value: { tag: "finance", multiplier: 0.5, financialContagionFloor: 15, expiresAfterDays: 10 },
    note: "S7: Backstop absorbs panic; Market Stabilization success/partial reduces financial-tagged chain severity by 50% and applies a financialContagion floor of 15 for 10 days.",
    sourceState: "resolved",
  },
  {
    source: "OP-09",
    target: "refugee_humanitarian_spikes",
    type: "severity",
    value: { oneShotFlag: "op_evac_ready", escalationThreshold: 80, tag: "refugee", multiplier: 0.7 },
    note: "S8: Plans absorb shocks; first escalation >= 80 spike is replaced by mitigation and refugee-tagged sudden effects are reduced 30% while flag is set.",
    sourceState: "resolved",
  },
  {
    source: "PJ-10",
    target: "PJ-08",
    type: "block",
    value: { whileActive: true, failedHistoryScore: -10 },
    note: "S9: Grey money poisons local trust; PJ-10 blocks PJ-08 while active, and any PJ-10 failure permanently gives PJ-08 score -10.",
    sourceState: "active",
  },
  {
    source: "PJ-05",
    target: "PJ-07",
    type: "score",
    value: { score: 10, globalStressRiskTickRateDelta: -5 },
    note: "S10: Support system reduces burnout; Repair Family Trust success/partial gives Health Routine score +10 and all stress-type risk ticks fire at -5% rate.",
    sourceState: "resolved",
  },
  {
    source: "PJ-03",
    target: ["PJ-08", "PJ-05"],
    type: "score",
    value: { score: -10, pj08ReputationGainMultiplier: 0.5 },
    note: "S11: One foot out the door; Migration Packet active or complete gives Community Network and Family Trust score -10, and PJ-08 reputation gain is halved.",
    sourceState: "active-or-resolved",
  },
  {
    source: ["PJ-04", "PJ-09"],
    target: "fortress_household",
    type: "severity",
    value: { endingPrecondition: true, negateTags: ["blackout", "shortage"] },
    note: "S12: Self-sufficient household; Stockpile Supplies plus Backup Power are the Fortress Household requirement and negate blackout and shortage events entirely.",
    sourceState: "pair-resolved",
  },
  {
    source: "PJ-09",
    target: "PJ-02",
    type: "score",
    value: { score: 8, eventTag: "remote", positiveBranchAlwaysAvailable: true },
    note: "S13: Connectivity equals career continuity; Backup Power success/partial gives Upskill score +8 and remote-work-tagged events always take positive branch availability.",
    sourceState: "resolved",
  },
];

export const RISK_TICKS: RiskTickDefinition[] = [
  {
    id: "leak_rumor",
    title: "Leak rumor",
    appliesTo: ["OP-01", "OP-10"],
    effects: { mediaPanic: 4 },
    failureBandPenalty: 10,
    note: "Small interstitial leak event; one log line and minor effect.",
    tags: ["leak", "media"],
  },
  {
    id: "interdiction_scare",
    title: "Interdiction scare",
    appliesTo: ["OP-03"],
    effects: { shippingInsuranceCost: 5 },
    failureBandPenalty: 10,
    note: "Small convoy/interdiction risk event.",
    tags: ["fleet", "shipping"],
  },
  {
    id: "spoiler_attack",
    title: "Spoiler attack",
    appliesTo: ["OP-10"],
    effects: { escalationLevel: 5 },
    failureBandPenalty: 15,
    note: "Ceasefire spoiler event.",
    tags: ["ceasefire", "escalation"],
  },
  {
    id: "scam_brush",
    title: "Scam brush",
    appliesTo: ["PJ-09", "PJ-10"],
    effects: { cash: -3 },
    failureBandPenalty: 10,
    note: "Supply scam or grey-market brush with loss.",
    tags: ["scam", "cash"],
  },
  {
    id: "audit_notice",
    title: "Audit notice",
    appliesTo: ["PJ-10"],
    effects: { legalRisk: 4 },
    failureBandPenalty: 10,
    note: "Audit pressure on the risky side hustle.",
    tags: ["audit", "legal"],
  },
];
