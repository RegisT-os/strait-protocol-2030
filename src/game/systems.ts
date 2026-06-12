import { FABLE_SCENARIO_EXPANSIONS, FACTIONS, LIFE_ACTIONS, LIFE_BASE_STATS, LIFE_LOCAL_EVENTS, LIFE_PHILOSOPHIES, LIFE_ROLES, LIFE_SPAWNS, SCENARIOS } from "./data";
import { AnyRecord, CRISIS_META, FLEET_COMMAND_POINTS_PER_DAY, StatMap, chainEndingNote, factionEndingNote, fleetEndingNote, fleetSummary, rnd, sfl } from "./engine";
export const ENDINGS = {
  us_dem: [
    { cond: s => s.credibility > 82 && s.coalition > 76 && s.global > 72, grade: "A+", title: "Pax Democratica", body: "Your coalition held through every crisis. The multilateral framework you built became the architecture of post-Taiwan Strait Asia. Taiwan's sovereignty is enshrined. The Nobel committee calls." },
    { cond: s => s.domestic < 44, grade: "C-", title: "Domestic Collapse", body: "You saved Taiwan but lost the country. Midterm bloodbath. A Republican successor reverses your multilateral commitments within 18 months." },
    { cond: s => s.chest < 35, grade: "D", title: "Bankruptcy of Power", body: "The financial cost produced a fiscal crisis. Bond markets pricing in a US credit downgrade. Geopolitical victory at generational economic cost." },
    { cond: s => s.military > 86 && s.coalition < 50, grade: "B-", title: "Pyrrhic Victory", body: "Taiwan held by sheer American military dominance. But the coalition never formed. The US spent $2.4T alone." },
    { cond: s => s.global > 82 && s.credibility > 78, grade: "A", title: "Coalition Triumph", body: "The world's largest democratic coalition since 1945. Taiwan defended by 24 nations. China's global influence set back a decade." },
    { cond: () => true, grade: "B", title: "Managed Ambiguity", body: "Taiwan survives in managed tension. Not victory, not defeat. The crisis is frozen, not resolved. Your administration bought a generation of time." },
  ],
  china: [
    { cond: s => (s.pla || 0) > 82 && s.military > 82, grade: "A+", title: "Reunification", body: "Taiwan is unified under PRC sovereignty. The century of humiliation is over. Xi Jinping's place in history is alongside Mao." },
    { cond: s => (s.pla || 0) < 58, grade: "F", title: "PLA Coup", body: "The generals moved. Admiral Chen led the faction that forced Xi's removal. China is stable — under different management." },
    { cond: s => s.economy < 33, grade: "D", title: "Economic Collapse", body: "The blockade bled Taiwan. It bled China faster. The worst Chinese economic crisis since the Cultural Revolution." },
    { cond: s => (s.politburo || 0) > 82 && s.credibility > 62, grade: "A", title: "Peaceful Framework", body: "The 25-year autonomy framework became the basis for peaceful integration. Xi's legacy: the leader who reunified China without a war." },
    { cond: s => s.global > 66 && s.credibility > 62, grade: "A-", title: "New World Order", body: "China has not annexed Taiwan — but has created a new regional order where Beijing's consent is required for every Pacific decision." },
    { cond: () => true, grade: "C+", title: "Frozen Conflict", body: "The strait is tenser than before. Taiwan survives. China has not retreated. The world adapted to a new normal of managed confrontation." },
  ],
  russia: [
    { cond: s => s.economy > 72 && (s.nato || 0) < 49 && (s.oligarch || 0) > 72, grade: "A+", title: "Grand Strategic Victory", body: "Russia emerged as the indispensable swing power. Energy contracts secured. Ukraine concessions extracted. Oligarchs protected. NATO's attention permanently split." },
    { cond: s => (s.nato || 0) > 82, grade: "D", title: "NATO Encirclement", body: "Your Kaliningrad gambit brought NATO's full attention back to Europe. Four new brigades deployed to Poland. You overplayed a strong hand." },
    { cond: s => s.economy < 40, grade: "D", title: "Overextension Collapse", body: "Maintaining every front simultaneously exceeded Russia's actual capacity. The war chest is empty. The machine has broken down." },
    { cond: s => s.credibility > 55 && s.global > 52, grade: "A-", title: "Peacemaker's Bonus", body: "Russia as mediator was unexpected and effective. Both sides owe you. Your credibility is the highest since the Cold War." },
    { cond: s => s.economy > 62 && (s.oligarch || 0) > 62, grade: "B+", title: "Profitable Neutrality", body: "The auction worked. China paid. US paid. Europe paid. Russia's energy revenues at record highs." },
    { cond: () => true, grade: "C+", title: "Status Maintained", body: "Russia survived in approximately the same position it entered. The Arctic route is operational. China is paying. Ukraine front stable." },
  ],
  north_korea: [
    { cond: s => (s.kim || 0) > 86 && (s.food || 0) > 72 && s.economy > 56, grade: "A+", title: "Supreme Victory", body: "Kim Jong-un used a global crisis to secure food, fuel, and international legitimacy simultaneously. Both superpowers negotiated directly with Pyongyang." },
    { cond: s => (s.kim || 0) < 48, grade: "F", title: "Succession Crisis", body: "The generals moved. A provisional Military Council has been announced. Kim's authority is contested." },
    { cond: s => (s.food || 0) < 28, grade: "F", title: "Famine and Fall", body: "The crisis consumed the resources that could have fed the country. Kim's miscalculations cost millions of civilian lives." },
    { cond: s => s.credibility > 52 && s.economy > 56, grade: "A", title: "Normalization Path", body: "The historic denuclearization deal Kim signed shocked the world. North Korea joins the global community. The dynasty survives by transforming." },
    { cond: s => s.military > 75 && (s.kim || 0) > 70, grade: "B+", title: "Nuclear Deterrence Proven", body: "DPRK's nuclear capability acknowledged by both superpowers. Kim extracted maximum concessions without firing a warhead." },
    { cond: () => true, grade: "C", title: "Regime Survival", body: "The DPRK made it through another crisis. The dynasty continues. In Pyongyang, that counts as victory." },
  ],
  asean: [
    { cond: s => (s.unity || 0) > 76 && (s.malacca || 0) > 82 && s.economy > 72, grade: "A+", title: "ASEAN's Century", body: "The bloc held together, leveraged Malacca brilliantly, and emerged as Southeast Asia's first true great power. A genuine third pole in global geopolitics." },
    { cond: s => (s.unity || 0) < 33, grade: "F", title: "ASEAN Collapse", body: "The bloc fractured beyond repair. The 50-year ASEAN project ends not with a bang but with 10 separate bilateral press releases." },
    { cond: s => (s.malacca || 0) > 86, grade: "A-", title: "Malacca Masters", body: "The Strait of Malacca became the most important negotiating table of the 21st century — and you held the chair." },
    { cond: s => s.economy > 78, grade: "A", title: "Economic Sovereignty", body: "By leveraging Malacca and refusing capture by either bloc, ASEAN secured its economic future." },
    { cond: s => s.economy < 43, grade: "D", title: "Economic Casualty", body: "Caught between two superpowers, ASEAN's export economies were devastated." },
    { cond: () => true, grade: "B", title: "Managed Survival", body: "ASEAN survived without absorption into either bloc. Sovereignty intact. Economy battered but recovering." },
  ],
  eu: [
    { cond: s => s.credibility > 86 && (s.unity || 0) > 71 && (s.leverage || 0) > 82, grade: "A+", title: "Brussels Moment", body: "The EU proved economic statecraft and principled multilateralism can end a superpower conflict. The Geneva framework is the EU's Westphalian moment." },
    { cond: s => (s.unity || 0) < 38, grade: "D", title: "ASEAN Scenario", body: "The EU fractured under pressure. Germany and Hungary broke ranks. The European project's credibility as a unified foreign policy actor is in ruins for a generation." },
    { cond: s => (s.leverage || 0) > 78 && s.global > 78, grade: "A", title: "Indispensable Mediator", body: "Every major crisis player needed EU blessing to conclude their deals. Brussels is the indispensable swing power." },
    { cond: s => s.economy < 48, grade: "C", title: "Pyrrhic Neutrality", body: "The energy crisis, the rare earth disruption, the recession — you preserved your principles but your economy is shaken." },
    { cond: () => true, grade: "B-", title: "Managed Mediation", body: "The EU brokered a ceasefire but not a resolution. Brussels remains a second-tier actor in hard security." },
  ],
  un: [
    { cond: s => (s.hum || 0) > 78 && (s.p5 || 0) > 58 && s.credibility > 72, grade: "A", title: "The Room Still Matters", body: "The UN did not command fleets or markets, but it kept the room open long enough for convoys, monitors, and signatures to become possible. The ceasefire carries your stamp in every paragraph." },
    { cond: s => (s.hum || 0) < 35, grade: "D", title: "Corridors Closed", body: "The diplomacy continued while the aid system failed. History remembers the speeches, but it counts the ships that never sailed." },
    { cond: s => (s.p5 || 0) < 30, grade: "C-", title: "Veto Theatre", body: "The Security Council became a stage for great-power performance. Agencies improvised in the margins while the chamber proved smaller than the crisis." },
    { cond: s => s.global > 82 && s.credibility > 68, grade: "B+", title: "Humanitarian Framework", body: "No one mistook it for peace, but the notification corridors, observer cells, and Geneva format outlived the fighting. That is how institutions survive bad decades." },
    { cond: () => true, grade: "B-", title: "Useful Imperfection", body: "The UN remained flawed, slow, and necessary. The crisis was not solved in Turtle Bay, but enough doors stayed open for others to walk through." },
  ],
};
(ENDINGS as AnyRecord).us_rep = [
  { cond: s => (s.deterrence || 0) > 78 && (s.alliedAnxiety || 0) < 58 && (s.warMandate || 0) > 64, grade: "A", title: "Deterrence Doctrine", body: "The administration turned speed, force posture, and congressional mandate into a credible Pacific deterrent without breaking the alliance system." },
  { cond: s => (s.alliedAnxiety || 0) > 76, grade: "C-", title: "Alliance Panic", body: "Deterrence became indistinguishable from escalation in allied capitals. Partners stayed close publicly and hedged privately." },
  { cond: s => (s.hawk || 0) > 78 && (s.warMandate || 0) < 45, grade: "D", title: "Mandate Trap", body: "The hawks kept demanding more visible force, but the public mandate never caught up. The crisis became a domestic test of nerve." },
  { cond: s => (s.deterrence || 0) > 72, grade: "B+", title: "Hard Line Held", body: "The crisis ended with deterrence credibility higher than it began, though allied anxiety remained the price of speed." },
  { cond: () => true, grade: "B-", title: "Uneasy Strength", body: "The United States projected strength and avoided collapse, but the coalition will spend years deciding whether it was reassured or frightened." },
];

export function getEnding(fid, st, context: AnyRecord = {}) {
  const list = ENDINGS[fid] || [];
  const base = list.find(e => e.cond(st)) || list[list.length - 1] || { grade: "B", title: "Crisis Concluded", body: "The situation resolved. History will judge the choices made." };
  const counts = context.decisionCounts || {};
  const crisis = context.crisis || {};
  const topCategory = Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const notes = [
    topCategory && Number(topCategory[1]) > 0 ? `Your dominant playbook was ${topCategory[0]} (${topCategory[1]} decisions).` : "",
    context.strikes ? `${context.strikes} strike decision${context.strikes === 1 ? "" : "s"} left a permanent escalation signature.` : "",
    crisis.nuclearRisk >= 60 ? "Nuclear risk remained dangerously high at the close." : "",
    crisis.humanitarianDamage >= 60 ? "Humanitarian damage became one of the defining costs of the crisis." : "",
    crisis.allianceCohesion >= 70 ? "Alliance cohesion held strongly through the final act." : "",
    crisis.publicTrust < 40 ? "Public trust was badly damaged by the endgame." : "",
    factionEndingNote(fid, st),
    fleetEndingNote(fid, context.fleets || []),
    chainEndingNote(context.chains || []),
  ].filter(Boolean).join(" ");
  return { ...base, body: notes ? `${base.body} ${notes}` : base.body, context };
}

export function buildQ(fid) {
  const scenarioBase = SCENARIOS[fid] || (fid === "us_rep" ? SCENARIOS.us_dem : []);
  const expansionBase = FABLE_SCENARIO_EXPANSIONS[fid] || (fid === "us_rep" ? FABLE_SCENARIO_EXPANSIONS.us_dem : []);
  const pool = [...scenarioBase, ...expansionBase];
  const byA = {};
  pool.forEach(s => { if (!byA[s.a]) byA[s.a] = []; byA[s.a].push(s); });
  const q = [];
  [1, 2, 3, 4, 5, 6].forEach(a => q.push(...sfl(byA[a] || [])));
  return q;
}

export const lc = (v, max = 100) => Math.max(0, Math.min(max, Math.round(v)));
export const lifeRiskHigh = (k) => ["debt", "stress", "legalRisk"].includes(k);
export const lifeStatMax = (k) => ["cash", "debt", "monthlyIncome"].includes(k) ? 180 : 100;
export const lifeLabel = (k) => ({ cash: "Cash", debt: "Debt", monthlyIncome: "Monthly Income", jobSecurity: "Job Security", careerCapital: "Career Capital", familyStability: "Family Stability", health: "Health", stress: "Stress", morale: "Morale", foodSupply: "Food Supply", fuelAccess: "Fuel Access", medicineAccess: "Medicine Access", housingSecurity: "Housing Security", internetAccess: "Internet Access", legalRisk: "Legal Risk", migrationReadiness: "Migration Readiness", reputation: "Reputation", emergencyPreparedness: "Emergency Preparedness" }[k] || k);
export const lifeApplyStats = (s, e = {}) => {
  const n = { ...s };
  Object.entries(e).forEach(([k, v]) => { n[k] = lc((n[k] ?? 50) + Number(v), lifeStatMax(k)); });
  return n;
};
export const lifeApplyMarkets = (m, e = {}) => {
  const n = { ...m };
  Object.entries(e).forEach(([k, v]) => { n[k] = Math.max(20, Math.min(260, Math.round((n[k] ?? 100) + Number(v)))); });
  return n;
};
export function buildLifeProfile(draft) {
  const spawn = LIFE_SPAWNS[draft.spawn] || LIFE_SPAWNS.singapore;
  const role = LIFE_ROLES[draft.role] || LIFE_ROLES.nurse;
  const philosophy = LIFE_PHILOSOPHIES[draft.philosophy] || LIFE_PHILOSOPHIES.protector;
  const roleBase = { monthlyIncome: role.income || 50, cash: Math.round((role.income || 50) * 0.8), debt: role.id === "student" ? 42 : role.id === "business" ? 46 : 24, familyStability: draft.philosophy === "protector" ? 68 : 55 };
  const stats = lifeApplyStats(lifeApplyStats(lifeApplyStats(lifeApplyStats(LIFE_BASE_STATS, roleBase), spawn.stats), role.stats), philosophy.stats);
  return {
    ...draft,
    spawn,
    role,
    philosophy,
    jobSector: role.sector,
    startingCash: stats.cash,
    debt: stats.debt,
    monthlyIncome: stats.monthlyIncome,
    familyObligation: stats.familyStability,
    length: Number(draft.length) || 30,
    stats,
    markets: { ...spawn.markets },
  };
}
export const mergeEffect = (base = {}, extra = {}) => {
  const out = { ...base };
  Object.entries(extra).forEach(([k, v]) => { out[k] = Number(out[k] || 0) + Number(v); });
  return out;
};
export const cloneLifeAction = (a: AnyRecord): AnyRecord => ({ ...a, e: { ...(a.e || {}) }, m: { ...(a.m || {}) } });
export const actionByStrategy = (strategy: string, alt = 0) => LIFE_ACTIONS.filter(a => a.strategy === strategy)[alt] || LIFE_ACTIONS.find(a => a.strategy === strategy) || LIFE_ACTIONS[0];
export const recoveryStrategiesFor = (stats: StatMap) => {
  const needs = [
    { strategy: "money", score: (stats.cash < 45 ? 90 - stats.cash : 0) + Math.max(0, stats.debt - 60) },
    { strategy: "career", score: Math.max(0, 58 - stats.jobSecurity) + Math.max(0, 52 - stats.careerCapital) },
    { strategy: "family", score: Math.max(0, 62 - stats.familyStability) + Math.max(0, 45 - stats.morale) },
    { strategy: "health", score: Math.max(0, 72 - stats.health) + Math.max(0, stats.stress - 45) },
    { strategy: "supplies", score: Math.max(0, 58 - stats.foodSupply) + Math.max(0, 55 - stats.fuelAccess) + Math.max(0, 55 - stats.medicineAccess) + Math.max(0, 50 - stats.emergencyPreparedness) },
    { strategy: "migration", score: Math.max(0, 60 - stats.migrationReadiness) + Math.max(0, stats.legalRisk - 38) },
    { strategy: "grey", score: Math.max(0, 45 - stats.cash) + Math.max(0, 45 - stats.foodSupply) + Math.max(0, 45 - stats.fuelAccess) },
  ];
  return needs.sort((a, b) => b.score - a.score).filter(n => n.score > 0).map(n => n.strategy);
};
export function contextualizeLifeAction(action: AnyRecord, profile: AnyRecord, crisis: StatMap, stats: StatMap) {
  const a = cloneLifeAction(action);
  const role = profile.role?.id;
  const city = profile.spawn?.id;
  const philosophy = profile.philosophy?.id;
  const expensiveCity = ["singapore", "hong_kong", "london", "new_york", "tokyo", "dubai"].includes(city);
  const highFinance = (crisis.financialContagion || 0) > 48;
  const highOil = (crisis.oilShock || 0) > 50;
  const highCyber = (crisis.cyberDisruption || 0) > 45;
  const highHumanitarian = (crisis.humanitarianDamage || 0) > 45;
  if (["finance", "compliance", "crypto"].includes(role) && ["FIN", "DEAL"].includes(a.tag)) a.e = mergeEffect(a.e, { cash: 3, careerCapital: 2, stress: 1 });
  if (["tech", "cyber"].includes(role) && ["WORK", "CYB"].includes(a.tag)) a.e = mergeEffect(a.e, { careerCapital: 3, jobSecurity: 2, stress: 1 });
  if (["nurse", "civil"].includes(role) && ["CARE", "HEAL"].includes(a.tag)) a.e = mergeEffect(a.e, { reputation: 3, medicineAccess: role === "nurse" ? 3 : 0 });
  if (role === "port" && ["HOME", "DEAL"].includes(a.tag)) a.e = mergeEffect(a.e, { foodSupply: 3, fuelAccess: 2 });
  if (role === "migrant" && a.strategy === "migration") a.e = mergeEffect(a.e, { legalRisk: -2, migrationReadiness: 3 });
  if (expensiveCity && ["HOME", "DIP", "HEAL"].includes(a.tag)) a.e = mergeEffect(a.e, { cash: -2 });
  if (["taipei", "seoul", "hong_kong"].includes(city) && a.strategy === "migration") a.e = mergeEffect(a.e, { migrationReadiness: 3, stress: 1 });
  if (["kl_pj", "jakarta", "manila"].includes(city) && a.strategy === "supplies") a.e = mergeEffect(a.e, { fuelAccess: highOil ? 4 : 2 });
  if (philosophy === "protector" && a.strategy === "family") a.e = mergeEffect(a.e, { familyStability: 4, cash: -1 });
  if (philosophy === "civic" && a.strategy === "community") a.e = mergeEffect(a.e, { reputation: 4, morale: 2 });
  if (philosophy === "exit" && a.strategy === "migration") a.e = mergeEffect(a.e, { migrationReadiness: 4, emergencyPreparedness: 2 });
  if (philosophy === "opportunist" && a.strategy === "grey") a.e = mergeEffect(a.e, { cash: 4, legalRisk: 2, reputation: -1 });
  if (highFinance && a.strategy === "money") a.e = mergeEffect(a.e, { cash: 3, stress: 2, debt: a.e.debt ? -2 : 0 });
  if (highFinance && a.strategy === "career") a.e = mergeEffect(a.e, { jobSecurity: 2, stress: 1 });
  if (highOil && a.strategy === "supplies") a.e = mergeEffect(a.e, { foodSupply: 3, fuelAccess: 3, cash: -2 });
  if (highCyber && a.strategy === "career") a.e = mergeEffect(a.e, { internetAccess: -2, careerCapital: 2 });
  if (highHumanitarian && a.strategy === "health") a.e = mergeEffect(a.e, { medicineAccess: 3, cash: -2 });
  if ((stats.stress || 0) > 75 && a.strategy === "health") a.e = mergeEffect(a.e, { stress: -4, health: 3 });
  if ((stats.foodSupply || 0) < 30 && a.strategy === "supplies") a.e = mergeEffect(a.e, { foodSupply: 4, morale: 1 });
  if ((stats.cash || 0) < 25 && ["HOME", "DIP", "HEAL"].includes(a.tag)) a.e = mergeEffect(a.e, { debt: 3, stress: 1 });
  a.o = `${a.o} Impact reflects your ${profile.role.name}, ${profile.spawn.name}, and ${profile.philosophy.name.toLowerCase()} posture.`;
  return a;
}
export function buildLifeChoices(day, profile, crisis, stats) {
  const chosen = new Map<string, AnyRecord>();
  const add = (a?: AnyRecord) => { if (a) chosen.set(a.l, contextualizeLifeAction(a, profile, crisis, stats)); };
  recoveryStrategiesFor(stats).slice(0, 3).forEach((s, i) => add(actionByStrategy(s, i % 2)));
  add(LIFE_ACTIONS[(day - 1) % LIFE_ACTIONS.length]);
  add(LIFE_ACTIONS[(day + 4) % LIFE_ACTIONS.length]);
  add(profile.role.roleChoice ? { ...profile.role.roleChoice, strategy: profile.role.roleChoice.strategy || "career" } : null);
  if (profile.philosophy.id === "protector") add(actionByStrategy("family"));
  if (profile.philosophy.id === "civic") add(actionByStrategy("community"));
  if (profile.philosophy.id === "exit") add(actionByStrategy("migration", 1));
  if (profile.philosophy.id === "opportunist") add(actionByStrategy("grey", 1));
  if ((crisis.financialContagion || 0) > 58 || (stats.cash || 0) < 30) add(actionByStrategy("money", 1));
  if ((crisis.oilShock || 0) > 55 || (stats.foodSupply || 0) < 35) add(actionByStrategy("supplies"));
  if ((crisis.escalationLevel || 0) > 55 || (stats.migrationReadiness || 0) < 35) add(actionByStrategy("migration"));
  return Array.from(chosen.values()).slice(0, 6);
}
export function buildLifeEvent(day, profile, currentStats = profile.stats) {
  const local = LIFE_LOCAL_EVENTS[(day - 1) % LIFE_LOCAL_EVENTS.length];
  const stage = Math.min(6, Math.ceil(day / 7));
  const crisis = {
    financialContagion: 18 + stage * 7 + (day % 5 === 0 ? 10 : 0),
    oilShock: 24 + stage * 6 + (["jakarta", "kl_pj", "manila"].includes(profile.spawn.id) ? 8 : 0),
    cyberDisruption: 14 + stage * 5 + (["tech", "cyber", "compliance", "finance"].includes(profile.role.id) ? 8 : 0),
    refugeePressure: 10 + stage * 5 + (["taipei", "hong_kong", "seoul"].includes(profile.spawn.id) ? 10 : 0),
    escalationLevel: 20 + stage * 7 + (["taipei", "seoul", "tokyo"].includes(profile.spawn.id) ? 8 : 0),
    nuclearRisk: 8 + stage * 4 + (["taipei", "seoul"].includes(profile.spawn.id) ? 6 : 0),
    humanitarianDamage: 12 + stage * 5,
  };
  const pressure = {
    jobSecurity: -Math.round(crisis.financialContagion / 18),
    debt: Math.round(crisis.financialContagion / 28),
    monthlyIncome: -Math.round(crisis.financialContagion / 35),
    fuelAccess: -Math.round(crisis.oilShock / 16),
    foodSupply: -Math.round((crisis.oilShock + crisis.humanitarianDamage) / 32),
    internetAccess: -Math.round(crisis.cyberDisruption / 22),
    housingSecurity: -Math.round(crisis.refugeePressure / 28),
    stress: Math.round((crisis.escalationLevel + crisis.nuclearRisk) / 26),
    migrationReadiness: crisis.escalationLevel > 48 ? 2 : 0,
    medicineAccess: -Math.round(crisis.humanitarianDamage / 24),
    morale: -Math.round((crisis.humanitarianDamage + crisis.escalationLevel) / 36),
  };
  const choices = buildLifeChoices(day, profile, crisis, currentStats);
  return {
    local,
    role: { t: `${profile.role.name} Pressure`, d: profile.role.event },
    choices,
    pressure,
    crisis,
  };
}
export function resolveLifeChoice(stats, markets, event, choice, day) {
  const c = event.crisis || {};
  const drift = { food: rnd(0, 3) + Math.round((c.oilShock || 0) / 25), fuel: rnd(-1, 5) + Math.round((c.oilShock || 0) / 18), rent: rnd(0, 2) + Math.round((c.refugeePressure || 0) / 40), medicine: rnd(0, 3) + Math.round((c.humanitarianDamage || 0) / 28), usd: rnd(-2, 5) + Math.round((c.financialContagion || 0) / 35), jobs: -rnd(0, 2) - Math.round((c.financialContagion || 0) / 45) };
  const ns = lifeApplyStats(lifeApplyStats(lifeApplyStats(stats, event.local.e), event.pressure), choice.e);
  const nm = lifeApplyMarkets(lifeApplyMarkets(lifeApplyMarkets(markets, event.local.m), drift), choice.m);
  const preview = Object.entries(choice.e || {}).slice(0, 5).map(([k, v]) => `${Number(v) > 0 ? "+" : ""}${v} ${lifeLabel(k)}`).join(", ");
  const entry = `Day ${day}: ${event.local.t}. ${choice.l}. ${choice.o}${preview ? ` Consequences: ${preview}.` : ""}`;
  return { stats: ns, markets: nm, entry };
}
export function lifeStrategyNote(counts: AnyRecord = {}) {
  const top = Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  if (!top || Number(top[1]) <= 0) return "";
  const labels = { money: "cash and debt triage", career: "career recovery", family: "family stabilization", community: "community aid", health: "health and stress recovery", supplies: "supplies and preparedness", migration: "migration planning", grey: "grey-market risk-taking" };
  return `Your most repeated recovery strategy was ${labels[top[0]] || top[0]} (${top[1]} choices).`;
}
export function getLifeEnding(profile, stats, context: AnyRecord = {}) {
  const why = `You ended in ${profile.spawn.name} as a ${profile.role.name}: cash ${stats.cash}, debt ${stats.debt}, stress ${stats.stress}, reputation ${stats.reputation}. ${lifeStrategyNote(context.strategyCounts)}`;
  if (stats.debt > 105 || (stats.cash < 22 && stats.debt > 78)) return { title: "Debt Collapse", grade: "F", body: `Compounding debt outran income and emergency cash. ${why}` };
  if (stats.cash > 118 && stats.reputation < 38) return { title: "Black Market King", grade: "B-", body: `You profited from shortages faster than trust could survive it. ${why}` };
  if (stats.cash > 126) return { title: "Crisis Millionaire", grade: "A-", body: `You converted volatility, income, and cash discipline into a balance sheet. ${why}` };
  if (stats.health < 34 || stats.stress > 82 || stats.morale < 30) return { title: "Burned-Out Professional", grade: "C-", body: `You kept functioning until the crisis took it out of your body and mind. ${why}` };
  if (stats.familyStability > 84) return { title: "Family Protector", grade: "A", body: `You did not save the world. You kept your people stable, housed, and supplied. ${why}` };
  if (profile.philosophy.id === "exit" && stats.migrationReadiness > 72 && stats.cash > 48 && stats.legalRisk < 48) return { title: "Expat Escape", grade: "B+", body: `Documents, money, and timing lined up when the exit window opened. ${why}` };
  if (stats.reputation > 84) return { title: "Community Pillar", grade: "A", body: `Your network became infrastructure. People survived because you made trust practical. ${why}` };
  if (stats.careerCapital > 86 && stats.jobSecurity > 62) return { title: "Career Breakthrough During Chaos", grade: "A-", body: `You became visibly useful while institutions were short on calm competence. ${why}` };
  return { title: "Quiet Survivor", grade: "B", body: `No headlines, no fortune, no collapse. You endured the crisis one careful day at a time. ${why}` };
}

export const SAVE_KEY = "strait-protocol-2030-campaign-v2";
export const MEMORY_SAVE: AnyRecord = {};
export const storageGet = (k: string) => typeof localStorage !== "undefined" ? localStorage.getItem(k) : MEMORY_SAVE[k] || null;
export const storageSet = (k: string, v: string) => { if (typeof localStorage !== "undefined") localStorage.setItem(k, v); else MEMORY_SAVE[k] = v; };
export const storageRemove = (k: string) => { if (typeof localStorage !== "undefined") localStorage.removeItem(k); else delete MEMORY_SAVE[k]; };
export const saveSet = (s?: Set<string>) => Array.from(s || []);
export const restoreSet = (a?: string[]) => new Set(a || []);
export const fmtEntries = (obj: AnyRecord = {}, limit = 8) => Object.entries(obj).slice(0, limit).map(([k, v]) => `${k}: ${v}`).join(", ");
export const downloadText = (name: string, text: string) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};
export const warSummaryText = (state: AnyRecord) => {
  const F = state.fid ? FACTIONS[state.fid] : null;
  const fleet = fleetSummary(state.fleetAssets || []);
  const chains = (state.chainHistory || []).map((c) => `- D${c.day}: ${c.t}`).join("\n") || "- No major crisis chains recorded yet.";
  const timeline = (state.timeline || []).slice(-6).map((t) => `- D${t.day}: ${t.title} - ${t.body}`).join("\n") || "- No turning points recorded yet.";
  const log = (state.warLog || []).slice(-8).map((l) => `- ${l}`).join("\n") || "- No War Room decisions recorded yet.";
  return [
    "STRAIT PROTOCOL: 2030 - War Room Summary",
    `Faction: ${F ? `${F.name} / ${F.sub}` : state.fid || "Unknown"}`,
    `Day ${state.day}/45, Act ${state.act}, Turn ${Number(state.turn || 0) + 1}, Phase: ${state.phase}`,
    `Core stats: ${fmtEntries(state.stats, 14)}`,
    `Global crisis stats: ${fmtEntries(state.crisis, 15)}`,
    `Decision mix: ${fmtEntries(state.decisionCounts, 10) || "none"}`,
    `Fleet outcomes: sea control ${fleet.seaControl}, readiness ${fleet.readiness}, supply ${fleet.supply}, fuel ${fleet.fuel}, threat ${fleet.threat}`,
    `Fleet command points remaining: ${state.fleetCommandPoints}/${FLEET_COMMAND_POINTS_PER_DAY}`,
    "Major crisis chains:",
    chains,
    "Recent turning points:",
    timeline,
    "Recent log:",
    log,
  ].join("\n");
};
export const lifeSummaryText = (state: AnyRecord) => {
  const profile = state.lifeProfile;
  const log = (state.lifeLog || []).slice(-10).map((l) => `- ${l}`).join("\n") || "- No Life decisions recorded yet.";
  return [
    "STRAIT PROTOCOL: 2030 - Life During Chaos Summary",
    `Profile: ${profile ? `${profile.spawn?.name} / ${profile.role?.name} / ${profile.philosophy?.name}` : "No active profile"}`,
    `Day ${state.lifeDay}/${profile?.length || "?"}`,
    `Personal stats: ${fmtEntries(state.lifeStats, 18)}`,
    `Markets: ${fmtEntries(state.lifeMarkets, 8)}`,
    `Recovery strategy mix: ${fmtEntries(state.lifeStrategyCounts, 8) || "none"}`,
    "Recent life log:",
    log,
  ].join("\n");
};
export const whyWarChoice = (chosen: AnyRecord, crisis: StatMap = {}) => {
  if (!chosen) return "";
  const pressure = Object.keys(chosen.pressureDelta || {}).length ? "Faction pressure moved because this response matched or strained your faction's internal politics." : "";
  const crisisHit = Object.entries(chosen.crisisDelta || {}).filter(([, v]) => Number(v) !== 0).map(([k]) => CRISIS_META[k]?.label || k).slice(0, 3).join(", ");
  const risk = chosen.c.type === "bad" ? "This was a high-risk response; the payoff came with structural damage." : chosen.c.type === "good" ? "This was a stabilizing response; it traded speed or resources for resilience." : "This was a trade-off response; it solved one pressure while moving another.";
  const nuclear = (crisis.nuclearRisk || 0) >= 50 ? " Nuclear risk is now high enough to color later events and endings." : "";
  return `${risk} ${pressure} ${crisisHit ? `It directly affected ${crisisHit}.` : ""}${nuclear}`.trim();
};
