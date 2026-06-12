import { useState, useCallback } from "react";
import {
  ACTS,
  AnyRecord,
  StatMap,
  apE,
  cl,
  riskBg,
  riskC,
  rnd,
  sfl,
  stC,
  supC,
  tc,
  thrBg,
  thrC,
  vBg,
  vC,
} from "./game/engine";

const CRISIS_META: AnyRecord = {
  globalStability: { label: "Global Stability", goodHigh: true },
  escalationLevel: { label: "Escalation Level" },
  financialContagion: { label: "Financial Contagion" },
  oilShock: { label: "Oil Shock" },
  foodInflation: { label: "Food Inflation" },
  semiconductorSupply: { label: "Semiconductor Supply", goodHigh: true },
  shippingInsuranceCost: { label: "Shipping Insurance Cost" },
  cyberDisruption: { label: "Cyber Disruption" },
  refugeePressure: { label: "Refugee Pressure" },
  mediaPanic: { label: "Media Panic" },
  allianceCohesion: { label: "Alliance Cohesion", goodHigh: true },
  publicTrust: { label: "Public Trust", goodHigh: true },
  warWeariness: { label: "War Weariness" },
  humanitarianDamage: { label: "Humanitarian Damage" },
  nuclearRisk: { label: "Nuclear Risk" },
};
const DEFAULT_CRISIS: StatMap = { globalStability: 62, escalationLevel: 22, financialContagion: 24, oilShock: 32, foodInflation: 28, semiconductorSupply: 72, shippingInsuranceCost: 34, cyberDisruption: 18, refugeePressure: 16, mediaPanic: 25, allianceCohesion: 58, publicTrust: 54, warWeariness: 12, humanitarianDamage: 14, nuclearRisk: 12 };
const crisisC = (k, v) => CRISIS_META[k]?.goodHigh ? vC(v) : riskC(v);
const crisisBg = (k, v) => CRISIS_META[k]?.goodHigh ? vBg(v) : riskBg(v);
const applyCrisis = (s: StatMap, e: StatMap = {}) => {
  const n = { ...s };
  Object.entries(e).forEach(([k, v]) => { if (n[k] !== undefined) n[k] = cl(n[k] + Number(v)); });
  return n;
};
const crisisImpact = (c: AnyRecord): StatMap => {
  const e = c.e || {};
  const badGlobal = Math.max(0, -(e.global || 0));
  const badEconomy = Math.max(0, -(e.economy || 0));
  const badCred = Math.max(0, -(e.credibility || 0));
  const badDomestic = Math.max(0, -(e.domestic || 0));
  const badSupply = Math.max(0, -(e.supply || 0));
  const badFuel = Math.max(0, -(e.fuel || 0));
  const badFood = Math.max(0, -(e.food || 0));
  const tag = c.tag;
  return {
    globalStability: Math.round((e.global || 0) / 2 + (e.stability || 0) / 2 - (c.strike ? 5 : 0)),
    escalationLevel: (c.strike ? 14 : 0) + (tag === "MIL" ? 4 : 0) + (tag === "STR" ? 8 : 0) - (tag === "DIP" ? 3 : 0),
    financialContagion: Math.round(badEconomy / 2 + Math.max(0, -(e.chest || 0)) / 3 + (tag === "FIN" && c.type !== "good" ? 4 : 0)),
    oilShock: Math.round(badFuel + (tag === "MIL" || tag === "STR" ? 3 : 0)),
    foodInflation: Math.round(badFood + badSupply / 2 + (tag === "HUM" && c.type === "good" ? -4 : 0)),
    semiconductorSupply: Math.round(-badEconomy / 2 - (tag === "INT" && c.type !== "good" ? 3 : 0)),
    shippingInsuranceCost: Math.round((tag === "LOG" && c.type !== "good" ? 5 : 0) + badSupply / 2 + (c.strike ? 4 : 0)),
    cyberDisruption: (tag === "INT" ? (c.type === "good" ? -2 : 5) : 0) + (c.strike ? 2 : 0),
    refugeePressure: Math.round((tag === "MIL" || tag === "STR" ? 4 : 0) + badGlobal / 2 + (c.strike ? 5 : 0)),
    mediaPanic: Math.round(badCred / 2 + badDomestic / 2 + badGlobal / 2 + (c.strike ? 4 : 0)),
    allianceCohesion: Math.round((e.coalition || 0) / 2 + (e.global || 0) / 4 + (e.credibility || 0) / 4),
    publicTrust: Math.round((e.domestic || 0) / 2 + (e.credibility || 0) / 3 - (c.strike ? 3 : 0)),
    warWeariness: (c.strike ? 6 : 0) + (tag === "MIL" ? 3 : 0) - (tag === "DIP" ? 2 : 0),
    humanitarianDamage: Math.round((c.strike ? 7 : 0) + badGlobal / 2 + badFood / 2 + (tag === "HUM" && c.type === "good" ? -6 : 0)),
    nuclearRisk: (c.strike ? 7 : 0) + (tag === "STR" ? 5 : 0) + (tag === "DIP" ? -2 : 0),
  };
};
const DECISION_CATEGORIES: AnyRecord = {
  MIL: "Military",
  STR: "Military",
  DIP: "Diplomacy",
  INT: "Intelligence",
  PRX: "Intelligence",
  CYB: "Cyber",
  FIN: "Finance",
  ECO: "Finance",
  ECO2: "Finance",
  LOG: "Logistics",
  SUP: "Logistics",
  POL: "Domestic Politics",
  HUM: "Humanitarian",
  CARE: "Humanitarian",
};
const categoryOf = (c: AnyRecord) => c.strike ? "Military" : (DECISION_CATEGORIES[c.tag] || "Diplomacy");
const decisionCategoryKeys = ["Military", "Diplomacy", "Cyber", "Finance", "Intelligence", "Logistics", "Domestic Politics", "Humanitarian"];
const emptyDecisionCounts = () => Object.fromEntries(decisionCategoryKeys.map(k => [k, 0]));
const topDeltas = (e: StatMap = {}, meta: AnyRecord = {}, limit = 3) => Object.entries(e)
  .filter(([, v]) => Number(v) !== 0)
  .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])))
  .slice(0, limit)
  .map(([k, v]) => `${Number(v) > 0 ? "+" : ""}${v} ${meta[k]?.label || k}`);
const previewFor = (c: AnyRecord) => {
  const cat = categoryOf(c);
  const direct = topDeltas(c.e || {}, {}, 2);
  const global = topDeltas(crisisImpact(c), CRISIS_META, 2);
  const tone = c.type === "good" ? "Lower-risk" : c.type === "bad" ? "High-risk" : "Tradeoff";
  return `${cat} · ${tone}${direct.length ? ` · ${direct.join(", ")}` : ""}${global.length ? ` · Global: ${global.join(", ")}` : ""}`;
};
const factionFocus = (fid: string, st: StatMap) => {
  const focus: AnyRecord = {
    us_dem: ["coalition", "domestic", "resolve"],
    china: ["politburo", "pla", "resolve"],
    russia: ["oligarch", "nato", "proxy"],
    north_korea: ["kim", "food", "fuel"],
    asean: ["unity", "malacca", "economy"],
    eu: ["unity", "leverage", "economy"],
    un: ["p5", "hum", "global"],
  };
  return (focus[fid] || Object.keys(st).slice(6, 9)).filter(k => st[k] !== undefined);
};
const strategicPosture = (fid: string, st: StatMap, crisis: StatMap) => {
  if (crisis.nuclearRisk >= 65 || crisis.escalationLevel >= 75) return "Brink management";
  if (crisis.financialContagion >= 65 || crisis.oilShock >= 65) return "Economic firebreak";
  if (fid === "asean" && (st.unity || 0) < 45) return "Bloc survival";
  if (fid === "north_korea" && (st.food || 0) < 40) return "Regime triage";
  if (fid === "un" && (st.hum || 0) < 45) return "Humanitarian access";
  if ((st.military || 0) >= 75) return "Hard-power leverage";
  if ((st.credibility || 0) >= 70) return "Diplomatic leverage";
  return "Crisis balancing";
};
const logEntryFor = (day: number, act: number, faction: AnyRecord, sc: AnyRecord, c: AnyRecord) =>
  `D${day} · Act ${act} · ${categoryOf(c)}: ${faction.sub} chose "${c.l}" during "${sc.t}". ${c.o}`;
const turningPointFor = (day: number, act: number, sc: AnyRecord, c: AnyRecord, crisisDelta: StatMap) => {
  const largest = topDeltas(crisisDelta, CRISIS_META, 1)[0];
  const marker = c.strike ? "Strike threshold" : c.type === "bad" ? "Crisis setback" : c.type === "good" ? "Strategic gain" : "Major tradeoff";
  return { day, act, title: marker, body: `${sc.t}${largest ? ` · ${largest}` : ""}` };
};

const pressureC = (meta: AnyRecord, v: number) => meta?.riskHigh ? riskC(v) : vC(v);
const pressureBg = (meta: AnyRecord, v: number) => meta?.riskHigh ? riskBg(v) : vBg(v);

const FACTION_IDENTITY: AnyRecord = {
  us_dem: { why: "Win through coalition legitimacy. Speed helps, but caucus pressure and funding can hollow out the mandate.", mechanic: "Legitimacy balance: keep allied confidence above caucus pressure while preserving funding.", stats: { prog: { label: "Progressive Caucus Pressure", start: 46, riskHigh: true }, alliedConf: { label: "Allied Confidence", start: 64 }, approvalFloor: { label: "Approval Floor", start: 58 }, funding: { label: "Congressional Funding", start: 62 } } },
  us_rep: { why: "Win through deterrence without frightening allies into hedging. Hawks reward force; allies punish recklessness.", mechanic: "Deterrence bargain: raise credibility and mandate while containing allied anxiety.", stats: { hawk: { label: "Hawk Pressure", start: 64, riskHigh: true }, alliedAnxiety: { label: "Allied Anxiety", start: 42, riskHigh: true }, deterrence: { label: "Deterrence Credibility", start: 68 }, warMandate: { label: "War Mandate", start: 56 } } },
  china: { why: "The clock is internal as much as military. Blockade gains mean little if protest risk, PLA loyalty, or legitimacy breaks first.", mechanic: "Blockade clock: raise blockade effectiveness before protest and elite pressure overtake it.", stats: { politburoUnity: { label: "Politburo Unity", start: 64 }, plaLoyalty: { label: "PLA Loyalty", start: 76 }, xiLegitimacy: { label: "Xi Legitimacy", start: 70 }, protestRisk: { label: "Protest Risk", start: 32, riskHigh: true }, blockade: { label: "Blockade Effectiveness", start: 58 } } },
  eu: { why: "Europe wins by making economic statecraft decisive before member-state splits drain authority.", mechanic: "Sanctions fulcrum: convert sanctions leverage without collapsing council unity or energy resilience.", stats: { councilUnity: { label: "Council Unity", start: 58 }, energyResilience: { label: "Energy Resilience", start: 52 }, sanctionsLeverage: { label: "Sanctions Leverage", start: 66 }, defectionRisk: { label: "Defection Risk", start: 36, riskHigh: true } } },
  un: { why: "The UN cannot win by force. It wins when access, observers, and P5 language survive long enough to become a ceasefire.", mechanic: "Access versus paralysis: build corridors and observers while P5 consensus stays above collapse.", stats: { p5Consensus: { label: "P5 Consensus", start: 42 }, humanitarianAccess: { label: "Humanitarian Access", start: 56 }, observerCredibility: { label: "Observer Credibility", start: 52 }, ceasefireFramework: { label: "Ceasefire Framework", start: 34 } } },
  russia: { why: "Chaos is profitable until NATO re-centers on Europe. Every auction carries an encirclement price.", mechanic: "Chaos auction: grow energy leverage and Ukraine opportunity while NATO alert stays manageable.", stats: { oligarchLoyalty: { label: "Oligarch Loyalty", start: 66 }, natoAlert: { label: "NATO Alert Level", start: 60, riskHigh: true }, energyLeverage: { label: "Energy Leverage", start: 72 }, ukraineOpportunity: { label: "Ukraine Opportunity", start: 58 } } },
  north_korea: { why: "Leverage rises with missile drama, but food shortage and elite fear can turn bargaining into regime risk.", mechanic: "Extortion ladder: climb missile pressure for concessions while food reserve and coup risk remain survivable.", stats: { kimLoyalty: { label: "Kim Loyalty", start: 76 }, foodReserve: { label: "Food Reserve", start: 42 }, militaryLoyalty: { label: "Military Loyalty", start: 64 }, coupRisk: { label: "Coup Risk", start: 28, riskHigh: true }, missileLadder: { label: "Missile Ladder", start: 38, riskHigh: true } } },
  asean: { why: "ASEAN survives by balancing neutrality, Malacca control, currency defense, and member-state alignment.", mechanic: "Neutrality balance: keep unity and currency stability high while China and US dependency avoid capture.", stats: { aseanUnity: { label: "ASEAN Unity", start: 55 }, malaccaControl: { label: "Malacca Control", start: 78 }, currencyStability: { label: "Currency Stability", start: 48 }, singaporePosition: { label: "Singapore Position", start: 62 }, malaysiaPosition: { label: "Malaysia Position", start: 52 }, indonesiaPosition: { label: "Indonesia Position", start: 54 }, vietnamPosition: { label: "Vietnam Position", start: 58 }, philippinesPosition: { label: "Philippines Position", start: 60 }, chinaDependency: { label: "China Dependency", start: 44, riskHigh: true }, usDependency: { label: "US Dependency", start: 42, riskHigh: true } } },
};
const factionMeta = (fid: string) => FACTION_IDENTITY[fid] || { stats: {}, why: "", mechanic: "" };
const factionPressureKeys = (fid: string) => Object.keys(factionMeta(fid).stats || {});
const factionInitialStats = (fid: string, base: StatMap) => ({ ...base, ...Object.fromEntries(factionPressureKeys(fid).map(k => [k, factionMeta(fid).stats[k].start])) });
const factionPressureImpact = (fid: string, c: AnyRecord, crisis: StatMap): StatMap => {
  const cat = categoryOf(c), e = c.e || {}, d: StatMap = {}, text = `${c.l || ""} ${c.o || ""}`.toLowerCase();
  const add = (k: string, v: number) => { d[k] = (d[k] || 0) + v; };
  if (fid === "us_dem") { if (cat === "Military") { add("prog", 7 + (c.strike ? 5 : 0)); add("alliedConf", 4); add("approvalFloor", -4); add("funding", -3); } if (cat === "Diplomacy" || cat === "Humanitarian") { add("prog", -5); add("alliedConf", 5); add("approvalFloor", 2); } if (cat === "Finance" || cat === "Logistics") add("funding", Number(e.chest || 0) < 0 ? -6 : 3); }
  if (fid === "us_rep") { if (cat === "Military") { add("deterrence", 7 + (c.strike ? 4 : 0)); add("hawk", -4); add("warMandate", 4); add("alliedAnxiety", 6 + (c.strike ? 4 : 0)); } if (cat === "Diplomacy" || cat === "Humanitarian") { add("hawk", 6); add("alliedAnxiety", -5); add("warMandate", -3); } if (cat === "Intelligence" || cat === "Cyber") add("deterrence", 4); }
  if (fid === "china") { if (cat === "Military") { add("blockade", 8); add("plaLoyalty", 5); add("protestRisk", 5 + (c.strike ? 5 : 0)); add("xiLegitimacy", 3); } if (cat === "Diplomacy") { add("politburoUnity", 3); add("plaLoyalty", -4); add("protestRisk", -4); add("blockade", -3); } if (cat === "Finance" || Number(e.economy || 0) < 0) { add("protestRisk", 5); add("xiLegitimacy", -3); } }
  if (fid === "eu") { if (cat === "Finance") { add("sanctionsLeverage", 7); add("energyResilience", Number(e.economy || 0) < 0 ? -4 : 2); add("defectionRisk", Number(e.unity || 0) < 0 ? 6 : -3); } if (cat === "Diplomacy" || cat === "Humanitarian") { add("councilUnity", 5); add("defectionRisk", -4); } if (cat === "Military") { add("councilUnity", -5); add("sanctionsLeverage", 3); } }
  if (fid === "un") { if (cat === "Humanitarian" || cat === "Logistics") { add("humanitarianAccess", 8); add("observerCredibility", 4); add("ceasefireFramework", 3); } if (cat === "Diplomacy") { add("p5Consensus", 5); add("ceasefireFramework", 6); } if (cat === "Military" || cat === "Domestic Politics") { add("p5Consensus", -6); add("humanitarianAccess", -3); } }
  if (fid === "russia") { if (cat === "Finance" || cat === "Logistics") { add("energyLeverage", 6); add("oligarchLoyalty", 4); } if (cat === "Military" || cat === "Intelligence") { add("ukraineOpportunity", 7); add("natoAlert", 7 + (c.strike ? 4 : 0)); add("oligarchLoyalty", -3); } if (cat === "Diplomacy") { add("natoAlert", -6); add("oligarchLoyalty", 2); } }
  if (fid === "north_korea") { if (cat === "Military") { add("missileLadder", 9 + (c.strike ? 5 : 0)); add("kimLoyalty", 4); add("militaryLoyalty", 5); add("foodReserve", -4); add("coupRisk", -2); } if (cat === "Diplomacy" || cat === "Humanitarian") { add("foodReserve", 8); add("coupRisk", -4); add("kimLoyalty", -2); } if (Number(e.food || 0) < 0) { add("coupRisk", 5); add("foodReserve", -3); } }
  if (fid === "asean") { if (cat === "Diplomacy" || cat === "Humanitarian") { add("aseanUnity", 5); add("currencyStability", 3); } if (cat === "Military") { add("malaccaControl", 7); add("aseanUnity", Number(e.unity || 0) < 0 ? -5 : 2); add("currencyStability", -4); } if (cat === "Finance") { add("currencyStability", 8); add("aseanUnity", 3); } if (text.includes("china") || text.includes("yuan") || text.includes("bri")) add("chinaDependency", 7); if (text.includes("us ") || text.includes("u.s") || text.includes("american")) add("usDependency", 7); if (Number(e.malacca || 0) > 0) add("malaccaControl", 4); }
  if (crisis.mediaPanic >= 65) add(fid === "china" ? "protestRisk" : fid === "north_korea" ? "coupRisk" : "approvalFloor", -2);
  return d;
};
const factionTriggeredEvent = (fid: string, st: StatMap, crisis: StatMap, used: Set<string>) => {
  const events: AnyRecord = {
    us_dem: [{ id: "dem_caucus_revolt", when: () => st.prog >= 68 && st.funding < 55, t: "Progressive Caucus Revolt", d: "The caucus threatens to freeze the next supplemental unless the White House publishes tighter war-powers guardrails.", e: { prog: -8, funding: -4, domestic: 5, military: -3 }, crisis: { publicTrust: 3, allianceCohesion: 2 } }, { id: "dem_allied_room", when: () => st.alliedConf >= 76 && crisis.allianceCohesion >= 62, t: "Allied Supermajority Holds", d: "Five allied capitals publicly back the process. Legitimacy is producing operational cover.", e: { alliedConf: 6, credibility: 5, coalition: 4 }, crisis: { allianceCohesion: 5, mediaPanic: -3 } }],
    us_rep: [{ id: "rep_allied_panic", when: () => st.alliedAnxiety >= 68, t: "Allied Anxiety Cable", d: "Tokyo, Canberra, and Berlin ask whether deterrence has become escalation by another name.", e: { alliedAnxiety: -6, deterrence: -3, credibility: -4 }, crisis: { allianceCohesion: -6, mediaPanic: 4 } }, { id: "rep_deterrence_rally", when: () => st.deterrence >= 78 && st.warMandate >= 62, t: "Deterrence Rally", d: "Congressional hawks and defense governors align behind a Pacific readiness package.", e: { warMandate: 7, military: 4 }, crisis: { publicTrust: 3, escalationLevel: 2 } }],
    china: [{ id: "china_protest", when: () => st.protestRisk >= 62, t: "Coastal Protest Wave", d: "Export layoffs and war rumors trigger visible unrest in coastal cities. The censors are no longer enough.", e: { protestRisk: -6, xiLegitimacy: -5, domestic: -5 }, crisis: { mediaPanic: 5, financialContagion: 3 } }, { id: "china_blockade_clock", when: () => st.blockade >= 76 && st.plaLoyalty >= 68, t: "Blockade Clock Accelerates", d: "The quarantine tightens. Taiwan fuel planners talk in days, not weeks.", e: { blockade: 5, plaLoyalty: 3, military: 5 }, crisis: { shippingInsuranceCost: 5, escalationLevel: 4 } }],
    eu: [{ id: "eu_defection", when: () => st.defectionRisk >= 62, t: "Member-State Defection Threat", d: "Two capitals may break sanctions unity unless energy relief arrives immediately.", e: { councilUnity: -6, defectionRisk: -5, energyResilience: -3 }, crisis: { allianceCohesion: -4, oilShock: 3 } }, { id: "eu_sanctions_window", when: () => st.sanctionsLeverage >= 78 && st.councilUnity >= 55, t: "Sanctions Window Opens", d: "Markets believe Brussels can deliver a coordinated package. Leverage becomes real.", e: { sanctionsLeverage: 6, credibility: 5 }, crisis: { financialContagion: 3, allianceCohesion: 3 } }],
    un: [{ id: "un_corridor", when: () => st.humanitarianAccess >= 72 && st.p5Consensus >= 42, t: "Relief Corridor Accepted", d: "Military liaisons accept a notification corridor. Aid begins moving through ASEAN ports.", e: { humanitarianAccess: 6, observerCredibility: 5, hum: 5 }, crisis: { humanitarianDamage: -7, refugeePressure: -4 } }, { id: "un_p5_paralysis", when: () => st.p5Consensus <= 28, t: "P5 Paralysis", d: "The Council chamber becomes theater. Agencies improvise outside formal authority.", e: { p5Consensus: 4, credibility: -5, hum: -4 }, crisis: { publicTrust: -3, humanitarianDamage: 5 } }],
    russia: [{ id: "russia_nato_tripwire", when: () => st.natoAlert >= 78, t: "NATO Tripwire Activated", d: "NATO planners shift attention back to Europe. The Taiwan distraction is no longer free.", e: { natoAlert: -5, ukraineOpportunity: -6, military: -3 }, crisis: { allianceCohesion: 4, nuclearRisk: 3 } }, { id: "russia_energy_premium", when: () => st.energyLeverage >= 82 && st.oligarchLoyalty >= 60, t: "Energy Premium Captured", d: "Buyers accept Moscow's crisis premium. The auction is ugly, but it pays.", e: { economy: 6, chest: 5, oligarchLoyalty: 4 }, crisis: { oilShock: 4, financialContagion: 2 } }],
    north_korea: [{ id: "nk_coup_warning", when: () => st.coupRisk >= 58 || st.foodReserve <= 24, t: "Coup Warning", d: "Security services report unusual corps-level calls. Food scarcity is turning elite anxiety into movement.", e: { coupRisk: -5, kimLoyalty: -4, militaryLoyalty: -3 }, crisis: { nuclearRisk: 4, mediaPanic: 3 } }, { id: "nk_extortion_pays", when: () => st.missileLadder >= 72 && st.coupRisk < 55, t: "Extortion Pays", d: "Both superpowers quietly raise their offers. The missile ladder is dangerous, but the price is higher now.", e: { foodReserve: 6, fuel: 5, kimLoyalty: 4 }, crisis: { nuclearRisk: 3, publicTrust: -2 } }],
    asean: [{ id: "asean_currency_break", when: () => st.currencyStability <= 28, t: "Currency Defense Breaks", d: "Regional currencies gap down at open. Neutrality becomes harder when cabinets fear food-price protests.", e: { currencyStability: 6, aseanUnity: -5, economy: -4 }, crisis: { financialContagion: 6, foodInflation: 4 } }, { id: "asean_neutrality_premium", when: () => st.aseanUnity >= 70 && st.malaccaControl >= 74, t: "Neutrality Premium", d: "Both blocs court ASEAN instead of threatening it. Malacca control becomes bargaining power.", e: { aseanUnity: 4, credibility: 5, currencyStability: 4 }, crisis: { shippingInsuranceCost: -4, allianceCohesion: 3 } }],
  };
  return (events[fid] || []).find(e => !used.has(e.id) && e.when());
};
const factionEndingNote = (fid: string, st: StatMap) => {
  if (fid === "us_dem") return st.alliedConf > st.prog ? "Coalition legitimacy outpaced domestic caucus pressure." : "Domestic caucus pressure constrained the coalition strategy.";
  if (fid === "us_rep") return st.deterrence > 72 && st.alliedAnxiety < 60 ? "Deterrence held without fully panicking allies." : "The deterrence strategy left allied anxiety as a lasting cost.";
  if (fid === "china") return st.blockade > 72 && st.protestRisk < 55 ? "The blockade clock beat the domestic pressure clock." : "Internal pressure limited what the blockade could achieve.";
  if (fid === "eu") return st.sanctionsLeverage > 72 && st.councilUnity > 55 ? "EU economic statecraft stayed unified enough to matter." : "Council splits blunted Europe's leverage.";
  if (fid === "un") return st.humanitarianAccess > 68 && st.ceasefireFramework > 55 ? "Humanitarian access matured into a ceasefire architecture." : "Humanitarian access remained too fragile to define the settlement.";
  if (fid === "russia") return st.energyLeverage > 76 && st.natoAlert < 70 ? "Russia profited from chaos without fully reawakening NATO." : "The chaos auction raised NATO alert alongside Russian leverage.";
  if (fid === "north_korea") return st.foodReserve > 50 && st.coupRisk < 45 ? "The regime extracted concessions without letting scarcity become a coup vector." : "Food and coup risk remained the real ceiling on Pyongyang's leverage.";
  if (fid === "asean") return st.aseanUnity > 65 && st.currencyStability > 45 ? "ASEAN's neutrality survived because the bloc and currencies held together." : "Neutrality was weakened by bloc fracture and currency pressure.";
  return "";
};
const fleetRisk = (t = "Low") => ({ None: 5, Low: 18, Medium: 38, High: 62, Critical: 82, Active: 64, Imminent: 74, Strategic: 70, "N/A": 5 }[t] || 35);
const fleetMissionFor = (fid: string, fl: AnyRecord) => {
  const text = `${fl.type} ${fl.status} ${fl.front}`.toLowerCase();
  if (fid === "un") return text.includes("relief") || text.includes("wfp") ? "Relief corridor" : "Observer access";
  if (fid === "eu") return text.includes("carrier") ? "Naval support option" : "Sanctions/logistics support";
  if (fid === "china" && text.includes("amphib")) return "Amphibious pressure";
  if (fid === "china") return "Blockade enforcement";
  if (fid === "asean") return text.includes("malacca") ? "Malacca control" : "Neutrality patrol";
  if (fid === "russia") return text.includes("convoy") ? "Energy convoy" : "Opportunist pressure";
  if (fid === "north_korea") return text.includes("rocket") || text.includes("artillery") ? "Missile/artillery coercion" : "Regime defense";
  return text.includes("carrier") ? "Carrier deterrence" : "Theater logistics";
};
const normalizeFleets = (fid: string, fleets: AnyRecord[] = []) => fleets.map((fl, i) => ({
  ...fl,
  id: `${fid}-${i}`,
  location: fl.front,
  mission: fl.mission || fleetMissionFor(fid, fl),
  fuel: fl.fuel ?? cl((fl.sup >= 999 ? 82 : fl.sup * 2) + (fl.status === "deployed" || fl.status === "blockade" ? 10 : 0)),
  readiness: fl.readiness ?? cl(72 + (fl.status === "deployed" || fl.status === "active" || fl.status === "combat alert" ? 12 : 0) - (fl.sup < 20 ? 18 : 0) - Math.round(fleetRisk(fl.threat) / 8)),
}));
const fleetSummary = (fleets: AnyRecord[] = []) => {
  const n = Math.max(1, fleets.length);
  const avg = (k: string) => Math.round(fleets.reduce((a, f) => a + Number(f[k] || 0), 0) / n);
  const forward = fleets.filter(f => ["deployed", "blockade", "active", "combat alert", "forward deployed", "on-station"].includes(f.status)).length;
  const threat = Math.round(fleets.reduce((a, f) => a + fleetRisk(f.threat), 0) / n);
  return { seaControl: cl(avg("readiness") + forward * 4 - threat / 3), readiness: avg("readiness"), supply: avg("sup"), fuel: avg("fuel"), threat };
};
const fleetActionEffect = (fid: string, fl: AnyRecord, action: string) => {
  const effects: AnyRecord = {
    Deploy: { status: "deployed", mission: "Forward presence", eta: Math.max(0, (fl.eta || 0) - 2), fuel: -8, sup: -4, readiness: -2, stats: { military: 4, credibility: 2, coalition: 1, supply: -2 }, crisis: { escalationLevel: 3, shippingInsuranceCost: 2 } },
    Hold: { status: "standby", mission: "Hold position", fuel: 3, sup: 2, readiness: 2, stats: { domestic: 1 }, crisis: { escalationLevel: -1 } },
    Resupply: { status: fl.status, mission: "Resupply cycle", fuel: 12, sup: 10, readiness: 4, stats: { supply: 6, chest: -4, military: 2, coalition: 1 }, crisis: { shippingInsuranceCost: 2 } },
    Escort: { status: "deployed", mission: fid === "un" ? "Aid escort" : "Convoy escort", fuel: -5, sup: -3, readiness: 3, stats: { supply: 4, credibility: 2, coalition: 3 }, crisis: { shippingInsuranceCost: -4, escalationLevel: 2 } },
    Shadow: { status: "covert", mission: "Shadow target", fuel: -4, sup: -2, readiness: 2, stats: { credibility: 2, military: 1 }, crisis: { cyberDisruption: 1, escalationLevel: 1 } },
    Interdict: { status: "active", mission: fid === "un" ? "Inspection hold" : "Interdiction", fuel: -8, sup: -5, readiness: -4, stats: { military: 5, credibility: -2 }, crisis: { escalationLevel: 7, shippingInsuranceCost: 5, nuclearRisk: 2 } },
    Retreat: { status: "standby", mission: "Withdraw/recover", eta: (fl.eta || 0) + 2, fuel: 4, sup: 3, readiness: 1, stats: { military: -3, credibility: -4 }, crisis: { escalationLevel: -4, warWeariness: -2 } },
    "Strike Ready": { status: "combat alert", mission: "Strike ready", fuel: -6, sup: -3, readiness: 5, stats: { military: 6, resolve: 3, credibility: 2 }, crisis: { escalationLevel: 6, nuclearRisk: 4, mediaPanic: 3 } },
  };
  const e = effects[action] || effects.Hold;
  if (fid === "un" && ["Interdict", "Strike Ready"].includes(action)) e.crisis = { ...e.crisis, humanitarianDamage: 3, publicTrust: -3 };
  return e;
};
const applyFleetPatch = (fl: AnyRecord, e: AnyRecord) => ({
  ...fl,
  status: e.status || fl.status,
  mission: e.mission || fl.mission,
  eta: e.eta ?? fl.eta,
  fuel: cl((fl.fuel ?? 50) + (e.fuel || 0)),
  sup: fl.sup >= 999 ? 999 : Math.max(0, Math.round((fl.sup || 0) + (e.sup || 0))),
  readiness: cl((fl.readiness ?? 55) + (e.readiness || 0)),
});
const FLEET_COMMAND_POINTS_PER_DAY = 2;
const fleetActionCost = (action: string) => action === "Strike Ready" ? 2 : 1;
const fleetStatusBlockReason = (fl: AnyRecord, action: string) => {
  const status = String(fl.status || "").toLowerCase();
  const name = String(fl.name || "").toLowerCase();
  if (name.includes("hostile") || status === "approaching") return "Action unavailable due to fleet status";
  if (status === "inactive" && !["Hold", "Resupply"].includes(action)) return "Action unavailable due to fleet status";
  if (status === "harbor" && ["Interdict", "Strike Ready"].includes(action)) return "Action unavailable due to fleet status";
  return "";
};
const fleetTriggeredEvent = (fid: string, fleets: AnyRecord[], used: Set<string>) => {
  const s = fleetSummary(fleets);
  const list = [
    { id: "fleet_supply_crunch", when: () => s.supply < 20, t: "Fleet Supply Crunch", d: "Forward assets report that fuel and munitions are being rationed. The next operational window is narrowing.", e: { military: -6, supply: -5, credibility: -3 }, crisis: { shippingInsuranceCost: 5, escalationLevel: 2 } },
    { id: "fleet_sea_control", when: () => s.seaControl > 76, t: fid === "un" ? "Corridor Control Improves" : "Sea Control Window", d: "Your taskforces have enough posture, fuel, and readiness to shape the maritime tempo this week.", e: { military: 5, credibility: 4, supply: 3 }, crisis: { shippingInsuranceCost: -4, allianceCohesion: 3 } },
    { id: "fleet_fuel_warning", when: () => s.fuel < 28, t: "Fleet Fuel Warning", d: "Operations staff warn that the next action may be decided by tankers and port access rather than firepower.", e: { fuel: -5, military: -3 }, crisis: { oilShock: 4, warWeariness: 2 } },
  ];
  return list.find(e => !used.has(e.id) && e.when());
};
const fleetEndingNote = (fid: string, fleets: AnyRecord[] = []) => {
  const s = fleetSummary(fleets);
  if (!fleets.length) return "";
  if (s.seaControl >= 74 && s.readiness >= 62) return fid === "un" ? "Relief and observer assets kept enough corridor control to matter." : "Fleet posture delivered meaningful sea control in the endgame.";
  if (s.supply < 24 || s.fuel < 30) return "Logistics, fuel, and resupply limits capped the final military options.";
  if (s.threat >= 68) return "Fleet risk stayed high enough that every final move carried escalation danger.";
  return "Fleet logistics remained serviceable but never decisive.";
};
const hasChain = (history: AnyRecord[] = [], id: string) => history.some(e => e.id === id);
const chainEventOptions = (ctx: AnyRecord) => {
  const { fid, stats: st, crisis: cr, fleets, act, day, counts, lastChoice, history } = ctx;
  const f = fleetSummary(fleets);
  const cat = categoryOf(lastChoice || {});
  const lowCyberPrep = Number(counts.Cyber || 0) + Number(counts.Intelligence || 0) < 2;
  return [
    { id: "cyber_bank", t: "Cyberattack Hits Banking System", d: "A coordinated intrusion freezes interbank settlement across three Asian financial centers. Crisis liquidity desks switch to manual procedures.", e: { economy: -8, credibility: -4, chest: -5 }, crisis: { cyberDisruption: 12, financialContagion: 8, mediaPanic: 6 }, score: cr.cyberDisruption + cr.financialContagion / 2 + (lowCyberPrep ? 18 : -10), follow: "market_crash" },
    { id: "oil_insurance", t: "Oil Tanker Insurance Spikes", d: "War-risk underwriters triple premiums for hulls entering the Western Pacific. Fuel contracts reprice before diplomats finish their statements.", e: { fuel: -7, economy: -4, supply: -4 }, crisis: { oilShock: 9, shippingInsuranceCost: 12, foodInflation: 4 }, score: cr.shippingInsuranceCost + cr.oilShock / 2 + (f.seaControl < 45 ? 15 : -8), follow: "fleet_resupply_fail" },
    { id: "semis_halt", t: "Semiconductor Exports Halt", d: "A major foundry network pauses priority export lanes. Auto, AI, and defense supply planners all start calling at once.", e: { economy: -9, supply: -8, chest: -4 }, crisis: { semiconductorSupply: -14, financialContagion: 7, mediaPanic: 5 }, score: (100 - cr.semiconductorSupply) + cr.escalationLevel / 2 + (cat === "Military" ? 8 : 0) },
    { id: "un_corridor_blocked", t: "UN Humanitarian Corridor Blocked", d: "A notification corridor is denied at the last checkpoint. Relief cargo sits visible, filmed, and useless.", e: { global: -7, credibility: -5, supply: -3 }, crisis: { humanitarianDamage: 10, refugeePressure: 8, publicTrust: -4 }, score: cr.humanitarianDamage + cr.escalationLevel / 2 + (fid === "un" ? 18 : 0) + ((st.humanitarianAccess || st.hum || 0) > 68 ? -20 : 0), follow: "refugee_surge" },
    { id: "asean_communique_fails", t: "ASEAN Communique Fails", d: "The summit closes without a joint communique. Separate capitals begin briefing separate patrons.", e: { unity: -8, credibility: -5, economy: -3 }, crisis: { allianceCohesion: -6, mediaPanic: 5, shippingInsuranceCost: 3 }, score: (fid === "asean" ? 25 : 5) + (60 - (st.aseanUnity || st.unity || 55)) + (st.chinaDependency || 0) / 3 + (st.usDependency || 0) / 3 },
    { id: "carrier_collision", t: "US Carrier Collision Scare", d: "A destroyer and civilian hull pass inside the safety envelope of a US carrier group. No collision, but everyone saw how close it was.", e: { military: -4, credibility: -3, supply: -2 }, crisis: { escalationLevel: 7, mediaPanic: 6, shippingInsuranceCost: 5 }, score: (fid === "us_dem" || fid === "us_rep" ? 20 : 4) + f.threat + (f.fuel < 45 ? 10 : 0) - (f.readiness > 72 ? 14 : 0) },
    { id: "china_fuel_shortage", t: "Chinese Fuel Shortage", d: "Forward PLAN units begin quiet rationing. The blockade clock is now competing with the tanker clock.", e: { fuel: -8, supply: -6, military: -5, pla: -4 }, crisis: { oilShock: 5, shippingInsuranceCost: 5 }, score: (fid === "china" ? 22 : 4) + (55 - f.fuel) + (st.blockade || 0) / 3 },
    { id: "nk_missile_launch", t: "North Korean Missile Launch", d: "A missile rises over the Sea of Japan. The launch is calibrated, but the alerts are not.", e: { military: 4, credibility: -5, food: -4 }, crisis: { nuclearRisk: 11, escalationLevel: 8, mediaPanic: 7 }, score: (fid === "north_korea" ? 22 : 8) + (st.missileLadder || 0) + cr.nuclearRisk / 2 - ((st.foodReserve || st.food || 0) > 60 ? 12 : 0), follow: "accidental_contact" },
    { id: "russian_arctic_shadowed", t: "Russian Arctic Convoy Shadowed", d: "An unidentified submarine shadows the Arctic convoy route. Moscow can profit, pause, or provoke.", e: { economy: 3, credibility: -3, supply: -3 }, crisis: { escalationLevel: 5, oilShock: 4, shippingInsuranceCost: 4 }, score: (fid === "russia" ? 24 : 5) + (st.energyLeverage || 0) / 2 + f.threat / 2 },
    { id: "market_crash", t: "Financial Market Crash", d: "Circuit breakers trip across Asia, then Europe. The crisis has become a balance-sheet event.", e: { economy: -14, chest: -8, domestic: -6 }, crisis: { financialContagion: 15, mediaPanic: 9, publicTrust: -6 }, score: cr.financialContagion + (hasChain(history, "cyber_bank") ? 35 : 0) + (Number(counts.Finance || 0) >= 2 ? -20 : 0) },
    { id: "refugee_surge", t: "Refugee Surge", d: "Ports and airports report families moving before governments can publish policy. Humanitarian planning becomes domestic politics.", e: { global: -6, domestic: -5, supply: -4 }, crisis: { refugeePressure: 14, humanitarianDamage: 8, foodInflation: 5 }, score: cr.refugeePressure + cr.humanitarianDamage / 2 + (hasChain(history, "un_corridor_blocked") ? 30 : 0) },
    { id: "protest_wave", t: "Protest Wave", d: "Screens fill with crowds: anti-war, anti-shortage, anti-government, sometimes all three in the same square.", e: { domestic: -9, stability: -6, credibility: -4 }, crisis: { publicTrust: -8, mediaPanic: 10, warWeariness: 7 }, score: cr.mediaPanic + cr.warWeariness + (st.protestRisk || st.coupRisk || 0) / 2 - ((st.approvalFloor || st.kimLoyalty || 50) > 65 ? 12 : 0) },
    { id: "backchannel_ceasefire", t: "Backchannel Ceasefire Offer", d: "A neutral channel offers a face-saving pause. It is not peace, but it can stop the next bad hour.", e: { global: 7, credibility: 4, military: -2 }, crisis: { escalationLevel: -8, nuclearRisk: -5, humanitarianDamage: -4 }, score: day > 12 ? Number(counts.Diplomacy || 0) * 18 + cr.escalationLevel / 2 + (cr.nuclearRisk > 45 ? 15 : 0) : 0 },
    { id: "fleet_resupply_fail", t: "Fleet Resupply Failure", d: "A critical lift package misses its window. Readiness loss spreads faster than the staff brief admits.", e: { supply: -10, military: -7, credibility: -4 }, crisis: { shippingInsuranceCost: 8, escalationLevel: 4 }, score: (45 - f.supply) + cr.shippingInsuranceCost / 2 + (hasChain(history, "oil_insurance") ? 25 : 0) },
    { id: "hub_sabotage", t: "Logistics Hub Sabotage", d: "A port fire, false manifests, and cut fiber lines hit the same logistics hub within one hour.", e: { supply: -9, military: -4, economy: -4 }, crisis: { cyberDisruption: 8, shippingInsuranceCost: 8, mediaPanic: 4 }, score: cr.cyberDisruption + (100 - f.readiness) / 2 + (Number(counts.Logistics || 0) >= 2 ? -18 : 0) },
    { id: "media_spiral", t: "Media Panic Spiral", d: "A clipped video outruns the correction. Three governments deny three different rumors and make all of them worse.", e: { credibility: -7, domestic: -5, global: -4 }, crisis: { mediaPanic: 14, publicTrust: -8, nuclearRisk: 3 }, score: cr.mediaPanic + (cat === "Military" ? 8 : 0) + (Number(counts.Intelligence || 0) >= 2 ? -15 : 0) },
    { id: "accidental_contact", t: "Accidental Military Contact", d: "Two armed units touch the same airspace and both report defensive maneuvering. The replay is ambiguous enough to be dangerous.", e: { military: -3, credibility: -4, global: -7 }, crisis: { escalationLevel: 12, nuclearRisk: 6, mediaPanic: 7 }, score: cr.escalationLevel + f.threat / 2 + (hasChain(history, "nk_missile_launch") ? 20 : 0) + (cat === "Military" ? 8 : 0) },
  ].map(e => ({ ...e, score: Math.round(e.score || 0) }));
};
const pickChainEvent = (ctx: AnyRecord) => {
  const options = (chainEventOptions(ctx) as AnyRecord[])
    .filter(e => !ctx.used.has(e.id) && e.score >= 58)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (!options.length) return null;
  const total = options.reduce((a, e) => a + e.score, 0);
  let roll = Math.random() * total;
  return options.find(e => (roll -= e.score) <= 0) || options[0];
};
const chainEndingNote = (history: AnyRecord[] = []) => {
  if (!history.length) return "";
  const names = history.slice(-3).map(e => e.t).join(", ");
  return `Major crisis chains shaped the campaign: ${names}.`;
};

const FACTIONS = {
  us_dem: { id: "us_dem", flag: "🇺🇸", name: "United States", sub: "Democrat Administration", color: "#185FA5", bd: "#85B7EB", bg: "#E6F1FB", tagline: "Multilateral juggler — coalition or bust", pressure: "Progressive caucus · Allied burden disputes · UN credibility · Recession fear", traits: ["Multilateral", "Sanctions-first", "Domestic division", "Coalition"], intel: "NSC emergency session. PLAN blockaded Taiwan's eastern ports — Day 1. Progressive caucus demands UN vote before any military posture. JCS says delay = weakness. Treasury: 90-day conflict = 68% recession probability.", startStats: { stability: 68, military: 78, economy: 72, credibility: 80, global: 75, domestic: 62, coalition: 70, resolve: 65, fuel: 85, supply: 80, chest: 75, proxy: 60 }, fleets: [{ name: "USS Gerald R. Ford CSG", type: "Carrier Strike Group", u: 9, status: "deployed", front: "West Pacific", threat: "High", eta: 0, sup: 28, note: "On station. Strike-ready." }, { name: "USS Ronald Reagan CSG", type: "Carrier Strike Group", u: 9, status: "deployed", front: "South China Sea", threat: "High", eta: 0, sup: 22, note: "Resupply needed Day 22." }, { name: "USS Nimitz CSG", type: "Carrier Strike Group", u: 9, status: "standby", front: "Pearl Harbor", threat: "None", eta: 7, sup: 45, note: "7-day transit to Taiwan Strait." }, { name: "USS Truman CSG", type: "Carrier Strike Group", u: 9, status: "transit", front: "Indian Ocean", threat: "Medium", eta: 12, sup: 40, note: "12 days from theater." }, { name: "SSN Wolf Pack Alpha", type: "Submarine Squadron", u: 6, status: "covert", front: "Taiwan Strait", threat: "Critical", eta: 0, sup: 60, note: "Undetected. PLAN unaware." }, { name: "Makin Island ARG", type: "Amphibious Ready Group", u: 5, status: "standby", front: "Okinawa", threat: "Low", eta: 2, sup: 35, note: "2,200 Marines aboard." }, { name: "B-52H Strategic Wing", type: "Strategic Bombers", u: 12, status: "on-station", front: "Andersen AFB Guam", threat: "High", eta: 0, sup: 30, note: "Armed. 4hr sortie to Strait." }] },
  china: { id: "china", flag: "🇨🇳", name: "People's Republic of China", sub: "CMC War Cabinet", color: "#A32D2D", bd: "#F09595", bg: "#FCEBEB", tagline: "Race against coalition — reunification before the window closes", pressure: "Politburo hardliners · Economy -12% · Xi legitimacy · PLA insubordination · Fuel crisis Day 18", traits: ["Blockade master", "Economic leverage", "Info warfare", "Proxy network"], intel: "Operation Dongshan Phase 1 active. Blockade Day 3. Taiwan fuel 61%. US carrier 900km closing. PLAAF hits critical fuel Day 14. Economy -12%. Politburo 4-3 split.", startStats: { stability: 74, military: 86, economy: 68, credibility: 48, global: 52, domestic: 78, politburo: 72, pla: 82, fuel: 72, supply: 65, chest: 80, proxy: 75 }, fleets: [{ name: "PLAN Eastern Theater SAG", type: "Surface Action Group", u: 34, status: "blockade", front: "Taiwan Strait", threat: "Active", eta: 0, sup: 18, note: "CRITICAL: resupply needed Day 18." }, { name: "PLAN Southern Theater", type: "Surface Action Group", u: 22, status: "deployed", front: "South China Sea", threat: "Active", eta: 0, sup: 21, note: "Controlling Spratly approach." }, { name: "PLAN SSN/SSBN Fleet", type: "Submarine Force", u: 18, status: "covert", front: "Deep Pacific", threat: "Strategic", eta: 0, sup: 55, note: "2 SSBNs at alert." }, { name: "PLAAF Eastern Command", type: "Air Fleet", u: 280, status: "combat air patrol", front: "Median Line", threat: "Active", eta: 0, sup: 14, note: "CRITICAL: unsustainable Day 14." }, { name: "PLA Amphibious Fleet", type: "Amphibious Force", u: 46, status: "staging", front: "Fujian Coast", threat: "Imminent", eta: 1, sup: 30, note: "D-Day capable. 1-day crossing." }, { name: "PLAN North Sea Fleet", type: "Surface Group", u: 16, status: "alert", front: "Yellow Sea", threat: "Medium", eta: 0, sup: 25, note: "Watching USFK flank." }, { name: "Russian Arctic Convoy", type: "Logistics Convoy", u: 8, status: "transit", front: "Arctic Route", threat: "None", eta: 3, sup: 999, note: "Fuel en route. Arrives Day 3." }] },
  russia: { id: "russia", flag: "🇷🇺", name: "Russian Federation", sub: "Kremlin Security Council", color: "#534AB7", bd: "#AFA9EC", bg: "#EEEDFE", tagline: "Opportunist — maximum gain from others' war", pressure: "NATO watching eastern flank · Domestic economy strangled · Oligarch defection risk · Ukraine front active", traits: ["Energy weapon", "Arctic route", "AFRIC Corps", "Kaliningrad card"], intel: "Taiwan crisis is your window. NATO elevated but distracted. Arctic convoy generating $2.1B/month. China offered $340B for neutrality plus. Three oligarchs called — European assets freezing.", startStats: { stability: 60, military: 74, economy: 55, credibility: 40, global: 45, domestic: 62, oligarch: 68, nato: 72, fuel: 90, supply: 58, chest: 55, proxy: 72 }, fleets: [{ name: "Pacific Fleet", type: "Surface Group", u: 12, status: "standby", front: "Vladivostok", threat: "Low", eta: 3, sup: 30, note: "3-day transit to Korean Strait." }, { name: "Arctic Convoy Alpha", type: "Logistics Convoy", u: 8, status: "active", front: "Arctic to China", threat: "None", eta: 0, sup: 999, note: "$2.1B/month. USS Connecticut shadowing." }, { name: "Arctic Convoy Beta", type: "Logistics Convoy", u: 6, status: "standby", front: "Arctic secondary", threat: "Low", eta: 2, sup: 999, note: "Backup route. 48hr activation." }, { name: "SSBN Borei Squadron", type: "Strategic Submarine", u: 5, status: "patrol", front: "Arctic/Pacific", threat: "Strategic", eta: 0, sup: 90, note: "Nuclear deterrent. Silent running." }, { name: "AFRIC Corps", type: "Proxy Force", u: 15000, status: "standby", front: "Multiple theaters", threat: "Medium", eta: 3, sup: 45, note: "Deployable 72hrs." }, { name: "Kaliningrad Strike Force", type: "ISKANDER Brigade", u: 0, status: "standby", front: "Kaliningrad", threat: "Medium", eta: 0, sup: 999, note: "ISKANDER-M. Range: Poland, Baltics." }] },
  north_korea: { id: "north_korea", flag: "🇰🇵", name: "North Korea", sub: "State Affairs Commission", color: "#993C1D", bd: "#F0997B", bg: "#FAECE7", tagline: "Rogue wildcard — extract maximum from global chaos", pressure: "Kim loyalty · 3.2M starvation risk · General Pak coup threat · Fuel at 35 days", traits: ["Missile escalation", "Guam targeting", "Kim loyalty crisis", "Succession risk"], intel: "Washington: 2M MT food plus sanctions relief if quiet. Beijing: fuel plus Hwasong upgrade plus security guarantee if you coordinate. General Pak has 4 corps commanders. Grain reserves 14%.", startStats: { stability: 48, military: 72, economy: 32, credibility: 30, global: 25, domestic: 58, kim: 78, food: 45, fuel: 35, supply: 30, chest: 25, proxy: 40 }, fleets: [{ name: "KPA Strategic Rocket Forces", type: "ICBM/IRBM Units", u: 0, status: "on standby", front: "Mobile TEL dispersed", threat: "Strategic", eta: 0, sup: 999, note: "Hwasong-18. Continental range confirmed." }, { name: "KPA 4th Corps + Artillery", type: "Ground Forces", u: 120000, status: "forward deployed", front: "DMZ forward", threat: "High", eta: 0, sup: 15, note: "CRITICAL: 15-day supply only." }, { name: "KPA 2nd Corps (Pak)", type: "Ground Forces", u: 85000, status: "alert", front: "Central DMZ", threat: "High", eta: 0, sup: 12, note: "Gen. Pak forces. Loyalty uncertain." }, { name: "KPN Submarine Force", type: "Diesel Submarine", u: 22, status: "harbor", front: "East Sea", threat: "Low", eta: 1, sup: 20, note: "Fuel critically low — 20 days." }, { name: "Food Aid Pipeline", type: "Logistics Supply", u: 0, status: "inactive", front: "Pending deal", threat: "None", eta: 7, sup: 0, note: "Activates if food deal struck." }] },
  asean: { id: "asean", flag: "🌏", name: "ASEAN Bloc", sub: "Rotating Summit Chair", color: "#854F0B", bd: "#EF9F27", bg: "#FAEEDA", tagline: "Swing vote — Malacca leverage or economic ruin", pressure: "US/China split · Malaysia vs Philippines/Vietnam · Currency collapse · PLAN in Malacca", traits: ["Malacca leverage", "Swing vote", "Bloc fracture risk", "No hard power"], intel: "ASEAN summit fracturing. Philippines + Vietnam want US alignment. Malaysia + Indonesia lean neutral. Singapore playing both sides. Malacca = 40% global trade. Ringgit -22%, rupiah -26%.", startStats: { stability: 62, military: 45, economy: 70, credibility: 58, global: 65, domestic: 60, unity: 55, malacca: 80, fuel: 65, supply: 72, chest: 45, proxy: 35 }, fleets: [{ name: "Singapore RSS Taskforce", type: "Frigate/Corvette", u: 7, status: "combat alert", front: "Strait of Malacca", threat: "Medium", eta: 0, sup: 30, note: "Best equipped navy in SEA." }, { name: "Indonesian Navy TNI-AL", type: "Frigate/Patrol", u: 14, status: "standby", front: "Natuna Islands EEZ", threat: "High", eta: 1, sup: 25, note: "Natuna EEZ contested by China." }, { name: "Philippine Navy + EDCA", type: "Patrol + US Access", u: 9, status: "deployed", front: "West Philippine Sea", threat: "High", eta: 0, sup: 20, note: "Subic Bay + Clark AFB active." }, { name: "Royal Malaysian Navy", type: "Frigate Group", u: 6, status: "standby", front: "South China Sea", threat: "Medium", eta: 1, sup: 28, note: "Frozen pending cabinet decision." }, { name: "Vietnam People's Navy", type: "Coastal Defense", u: 11, status: "combat alert", front: "Paracel/Spratly", threat: "High", eta: 0, sup: 22, note: "Battle-hardened. Anti-PLAN." }, { name: "PLAN SAG HOSTILE", type: "PLAN Surface Group", u: 14, status: "approaching", front: "Southern Malacca", threat: "Critical", eta: 1, sup: 0, note: "HOSTILE. Shandong + 14 vessels." }, { name: "Malacca Control Node", type: "Strait Control", u: 0, status: "active", front: "Singapore node", threat: "None", eta: 0, sup: 999, note: "40% global trade. 60% China energy." }] },
  eu: { id: "eu", flag: "🇪🇺", name: "European Union", sub: "Council Emergency Presidency", color: "#3B6D11", bd: "#97C459", bg: "#EAF3DE", tagline: "Economic surgeon — ceasefire without firing a shot", pressure: "27-member splits · Germany 200B China trade · Baltic states want war · Russian energy blackmail", traits: ["Sanctions toolkit", "Diplomatic reach", "Energy vulnerable", "Financial leverage"], intel: "Emergency EU Council. Germany: 200B at stake. Baltics: Maximum pressure NOW. ECB: recession threshold Day 45. China halted rare earths to 8 EU members. Russia offering gas at a price.", startStats: { stability: 65, military: 38, economy: 78, credibility: 72, global: 82, domestic: 60, unity: 58, leverage: 74, fuel: 55, supply: 70, chest: 70, proxy: 45 }, fleets: [{ name: "FS Charles de Gaulle CSG", type: "Carrier Strike Group", u: 6, status: "standby", front: "Mediterranean", threat: "None", eta: 18, sup: 40, note: "18-day transit to Taiwan theater." }, { name: "EU Maritime Taskforce", type: "Frigate Squadron", u: 8, status: "standby", front: "Indian Ocean", threat: "None", eta: 14, sup: 35, note: "Joint FR/DE/NL command." }, { name: "French SSBN Deterrent", type: "Strategic Submarine", u: 3, status: "patrol", front: "Atlantic", threat: "None", eta: 0, sup: 90, note: "Nuclear deterrent. Non-deployable." }, { name: "German Frigate Group", type: "Frigate Group", u: 4, status: "standby", front: "Baltic Sea", threat: "Low", eta: 21, sup: 30, note: "Bundestag vote required." }] },
  un: { id: "un", flag: "UN", name: "United Nations", sub: "Secretary-General Crisis Cell", color: "#087C9A", bd: "#70C6D8", bg: "#E1F5F8", tagline: "Legitimacy is your hull; humanitarian access is your fleet", pressure: "P5 vetoes · refugee surge · aid corridors · peacekeeper safety", traits: ["Humanitarian corridors", "Ceasefire broker", "Legitimacy", "P5 management"], intel: "The Security Council is frozen, aid agencies are overloaded, and both blocs still need someone credible enough to host the room. Your power is process under fire.", startStats: { stability: 55, military: 5, economy: 50, credibility: 64, global: 78, domestic: 50, p5: 42, hum: 62, fuel: 50, supply: 60, chest: 40, proxy: 30 }, fleets: [{ name: "WFP Relief Convoy", type: "Relief Shipping", u: 9, status: "standby", front: "Singapore", threat: "High", eta: 4, sup: 45, note: "Food and medicine blocked pending corridor deal." }, { name: "UNMCC Liaison Cell", type: "Civil-Military Coordination", u: 0, status: "active", front: "Geneva", threat: "Medium", eta: 0, sup: 999, note: "Maintains deconfliction lines with all major commands." }, { name: "Peacekeeper Evacuation Lift", type: "Chartered Airlift", u: 18, status: "standby", front: "Okinawa", threat: "Medium", eta: 2, sup: 20, note: "Can evacuate observers or move medical teams." }] },
};

(FACTIONS as AnyRecord).us_rep = {
  ...(FACTIONS as AnyRecord).us_dem,
  id: "us_rep",
  name: "United States",
  sub: "Republican Administration",
  color: "#712B13",
  bd: "#F0997B",
  bg: "#FAECE7",
  tagline: "Deterrence hawk - strength without alliance panic",
  pressure: "Hawk pressure - allied anxiety - mandate politics - deterrence credibility",
  traits: ["Deterrence", "Forward posture", "Congressional mandate", "Alliance anxiety"],
  intel: "The Situation Room opens with hawks demanding visible force. Allies want protection, not a blank check for escalation. Your edge is speed; your danger is making partners fear the solution.",
  startStats: { ...(FACTIONS as AnyRecord).us_dem.startStats, credibility: 74, domestic: 60, coalition: 62, resolve: 74, chest: 72 },
};

const SCENARIOS = {
  us_dem: [
    { a: 1, t: "Taiwan Requests F-35 Deployment", b: "Taipei's defense minister: F-35Cs at Tainan Air Base within 24hrs plus a $4.2B emergency arms package including ATACMS, HIMARS, and Patriot PAC-3. Progressive caucus already drafting opposition. Beijing warns of grave consequences. Treasury warns the package could trigger China's T-bill dump.", i: "JCS: 72hr window before PLAAF establishes air dominance. China holds $847B in US bonds. Domestic approval: 58%.", c: [{ l: "Authorize full package — F-35s plus all weapons", tag: "MIL", e: { military: 12, credibility: 14, global: -8, domestic: -10, coalition: 10, chest: -8 }, o: "F-35Cs land at Tainan. ATACMS en route. China scrambles J-20s. Progressive caucus erupts. Markets fall 3%.", type: "neutral" }, { l: "F-35s yes, ATACMS no — calibrated escalation", tag: "MIL", e: { military: 8, credibility: 7, global: -4, domestic: -4, coalition: 6, chest: -4 }, o: "Calibrated escalation. Taiwan gets air capability. ATACMS withheld. China protests but doesn't cross to full war footing.", type: "good" }, { l: "Decline — propose joint exercise as signal only", tag: "DIP", e: { military: -5, credibility: -12, global: 5, domestic: 6, coalition: -8 }, o: "Taiwan's ministry goes public with its disappointment. China reads hesitation correctly.", type: "bad" }, { l: "UNSC emergency session before any arms decision", tag: "DIP", e: { military: -2, credibility: -3, global: 12, domestic: 5, coalition: 4 }, o: "China vetoes within 2 hours. You've bought 4 days. Progressives satisfied. JCS furious.", type: "neutral" }, { l: "Full package plus surge Nimitz CSG simultaneously", tag: "MIL", e: { military: 20, credibility: 8, global: -14, domestic: -12, coalition: -5, chest: -12, fuel: -8 }, o: "Maximum deterrence. Nimitz 7 days out. Markets fall 5%. NATO calls emergency session.", type: "neutral" }] },
    { a: 1, t: "Treasury Alert: China T-Bill Threat Is Real", b: "Your Treasury Secretary and Fed Chair have convened emergency: China pre-positioned mechanisms to dump $847B in US Treasuries within 48 hours. This would spike 10-yr yields to 8.4% and trigger a mortgage crisis.", i: "Fed models: T-bill dump equals US recession in 90 days at 74% probability. G7 currency coordination possible but requires 36 hours.", c: [{ l: "Pre-emptive Fed intervention — buy Treasuries, suppress yields", tag: "FIN", e: { economy: 8, chest: -15, domestic: 5, credibility: 3 }, o: "Fed balance sheet expands $600B. Inflation risk rises. Yield curve controlled. Fiscal ammunition depleted.", type: "neutral" }, { l: "G7 joint Treasury backstop — multilateral shield", tag: "FIN", e: { economy: 5, coalition: 15, credibility: 12, chest: -8 }, o: "UK, Japan, Germany co-backstop. China's financial weapon neutralized by collective defense.", type: "good" }, { l: "Threaten to freeze China's US-held assets preemptively", tag: "FIN", e: { economy: -5, credibility: 10, global: -8, chest: 5 }, o: "Escalatory but effective. China pauses T-bill dump. WTO accuses US of financial warfare.", type: "neutral" }, { l: "Do nothing — mutual destruction, call their bluff", tag: "FIN", e: { economy: -3, credibility: 5, domestic: -5 }, o: "China sells $200B as a signal. Yields spike to 5.8%. Markets wobble. You were partially wrong.", type: "bad" }] },
    { a: 1, t: "Japan Requests JSDF Activation Support", b: "Tokyo formally requesting a US-Japan Security Consultative Committee emergency session. Japan wants to activate JSDF for dynamic defense operations. Without Japan's basing, US Pacific operations lose 40% effectiveness.", i: "Japan's domestic Article 9 interpretation has limits. Japan needs to feel supported — but not pressured. Basing rights are everything.", c: [{ l: "Full public endorsement — announce US backs JSDF activation", tag: "MIL", e: { military: 12, coalition: 14, credibility: 8, global: -5 }, o: "Japan activates JSDF. China condemns militarization. JSDF joins maritime patrols.", type: "good" }, { l: "Quiet support — let Japan lead domestically", tag: "DIP", e: { coalition: 10, credibility: 5, military: 5 }, o: "Japan feels supported without US fingerprints. Smart. Takes 4 days longer.", type: "good" }, { l: "Request Japan handle Korea watch while US focuses Taiwan Strait", tag: "MIL", e: { coalition: 8, military: 6, global: 3 }, o: "Division of labor. Japan accepts reluctantly. Efficient but feels sidelined.", type: "neutral" }, { l: "Push Japan into trilateral Taiwan-US-Japan framework", tag: "DIP", e: { coalition: 12, credibility: 10, global: -8, domestic: -5 }, o: "Unprecedented. Diplomatically explosive. Militarily significant.", type: "neutral" }] },
    { a: 2, t: "Progressive Caucus Holds Budget Hostage", b: "35 House progressives blocking the $48B emergency defense supplemental. Their demand: no kinetic action without UNSC authorization or allied supermajority. Senate Republicans are threatening to attach an ATACMS authorization to any budget deal.", i: "Without supplemental: INDOPACOM readiness degrades 30% by Day 20. With Republican ATACMS rider: China views it as de facto war authorization.", c: [{ l: "Accept progressive framework — UNSC first or allied supermajority", tag: "DIP", e: { domestic: 16, credibility: 6, military: -10, global: 8, coalition: -6 }, o: "Budget passes. Operationally constrained but politically stable.", type: "neutral" }, { l: "Negotiate: replace UNSC with 5-ally consensus", tag: "DIP", e: { domestic: 10, credibility: 8, military: -4, coalition: 6 }, o: "8 progressives fold. Budget passes 221-208. Operational flexibility preserved.", type: "good" }, { l: "Invoke emergency presidential authority — bypass Congress", tag: "MIL", e: { domestic: -20, credibility: 4, military: 10, coalition: 8, resolve: 12 }, o: "Constitutional crisis. Speaker files suit. INDOPACOM gets funded. Approval -12pts.", type: "bad" }, { l: "Accept Republican ATACMS rider — signal China deliberately", tag: "MIL", e: { domestic: -8, military: 14, credibility: 5, coalition: 4, global: -10 }, o: "Budget passes with ATACMS authorization embedded. China escalates patrol activity.", type: "neutral" }] },
    { a: 2, t: "India Refuses Coalition — Offers a Side Deal", b: "New Delhi declared neutrality. Won't join sanctions, will continue Russian oil, denies Andaman Islands base access. But India's RAW has quietly offered complete PLAN naval movement intelligence in exchange for a $35B defense technology package.", i: "Indian Ocean supply route to China: 34% of PLAN fuel. Intel deal: complete PLAN movements tracked. Defense package: F-414 engines, semiconductor fab access.", c: [{ l: "Accept intel deal — $35B technology for PLAN movement data", tag: "INT", e: { coalition: -3, military: 12, credibility: 5, chest: -12 }, o: "India stays neutral publicly. But PLAN movements now fully tracked. US submarines reposition accordingly.", type: "good" }, { l: "Push harder — offer Andaman base access for military alignment", tag: "MIL", e: { coalition: 8, military: 15, chest: -15, credibility: 3 }, o: "Modi refuses publicly but accepts a joint patrol arrangement. Functionally aligned without saying so.", type: "neutral" }, { l: "Accept neutrality — keep India as a future option", tag: "DIP", e: { coalition: -5, credibility: 6, global: 5 }, o: "India stays clean. QUAD partially intact. No intel pipeline but relationship preserved.", type: "neutral" }, { l: "Sanction India alongside China for crisis enablement", tag: "ECO2", e: { coalition: -25, global: -15, credibility: -12, economy: -10 }, o: "Catastrophic. QUAD collapses. India publicly aligns with China-Russia bloc.", type: "bad" }] },
    { a: 2, t: "Allied Burden-Sharing Crisis", b: "UK, Australia, Canada and France demanding a formal Allied Command structure. Germany refuses any military operation. France wants co-lead — meaning Paris has a veto. Australia is offering 3 destroyers. The price is shared command.", i: "Without allied cost-sharing, US pays 100% of $2.4B/month operation cost. Domestically unsustainable after 6 months.", c: [{ l: "Accept shared command — AUKUS Plus framework", tag: "DIP", e: { coalition: 20, economy: 10, credibility: 12, military: -5, domestic: 8 }, o: "Historic AUKUS Plus activated. France co-leads. Germany provides logistics. Credibility surge.", type: "good" }, { l: "US leads, allies support — INDOPACOM retains command", tag: "MIL", e: { coalition: -5, military: 8, credibility: 0, economy: -8 }, o: "US retains control. Allies frustrated. Australia withdraws 1 destroyer.", type: "neutral" }, { l: "Demand Germany join or EU gets no NATO coverage", tag: "DIP", e: { coalition: -10, global: -5, credibility: -5, domestic: 5 }, o: "Berlin furious. France mediates. Three-week delay in coalition formation.", type: "bad" }, { l: "Accept France co-command, quietly keep nuclear authority", tag: "MIL", e: { coalition: 12, military: 5, credibility: 5, economy: 8 }, o: "France gets the title. US keeps real control. Alliance holds.", type: "good" }] },
    { a: 3, t: "SWIFT Exclusion Plus Saudi PetroYuan Threat", b: "Treasury recommends full SWIFT exclusion. But Saudi Arabia warned: if China is excluded from SWIFT, Riyadh shifts all petrodollar settlement to yuan. This could cost the US reserve currency status.", i: "SWIFT exclusion: cuts China's dollar access 94% in 30 days. PetroYuan risk: shifts $1.8T annual oil settlement from dollar to yuan.", c: [{ l: "Full SWIFT exclusion — accept PetroYuan risk", tag: "FIN", e: { economy: -18, credibility: 10, global: -10, coalition: 6, chest: -5 }, o: "China's dollar access collapses. Saudi Arabia shifts $200B in oil settlement to yuan. Dollar weakens 8%.", type: "neutral" }, { l: "Partial SWIFT — military and dual-use finance only", tag: "FIN", e: { economy: -8, credibility: 7, global: 2, coalition: 8, chest: -2 }, o: "Surgical. Saudi Arabia satisfied. China still hurt. EU joins on partial.", type: "good" }, { l: "Coordinate G7 — multilateral SWIFT action", tag: "FIN", e: { economy: -10, credibility: 16, global: 12, coalition: 14, chest: -5 }, o: "G7 unanimous. China faces coordinated exclusion. Takes 3 weeks.", type: "good" }, { l: "Hold SWIFT — use threat as negotiating leverage", tag: "FIN", e: { economy: 3, credibility: -6, global: 5, coalition: -4 }, o: "You have kept your biggest economic weapon in reserve. The threat loses credibility the longer you wait.", type: "neutral" }, { l: "Sanction Saudi Arabia for threatening PetroYuan shift", tag: "FIN", e: { economy: -22, credibility: -5, global: -18, chest: -15, fuel: -10 }, o: "Saudi Arabia follows through on PetroYuan. Oil spikes to $195/barrel. Strategic miscalculation.", type: "bad" }] },
    { a: 3, t: "APAC Currency Crisis — Your Allies Are Drowning", b: "Ringgit -22%. Rupiah -26%. Philippines peso -18%. Vietnam dong -15%. These are your coalition partners. China is offering each of them a bilateral yuan swap.", i: "Malaysia's PM: We cannot hold alignment if our economy collapses. Indonesia has already taken a meeting with the Chinese ambassador.", c: [{ l: "Emergency $120B APAC Currency Stabilization Fund", tag: "FIN", e: { economy: -18, coalition: 22, global: 15, credibility: 14, chest: -18 }, o: "Game-changing. ASEAN bloc firmly in your camp. Malaysia and Indonesia decline China's yuan swap.", type: "good" }, { l: "G20 joint fund — share burden with EU and Japan", tag: "FIN", e: { economy: -8, coalition: 14, global: 12, credibility: 10, chest: -8 }, o: "EU and Japan co-fund. ASEAN partially stabilized. Takes 2 weeks.", type: "good" }, { l: "IMF SDRs only — no bilateral US commitment", tag: "FIN", e: { economy: 0, coalition: 5, global: 3, credibility: 2 }, o: "IMF fast-tracks $45B. Buys 3 weeks. But Malaysia takes China's yuan swap anyway.", type: "neutral" }, { l: "Let markets correct — maintain sanctions discipline", tag: "FIN", e: { economy: 5, coalition: -18, global: -12, credibility: -8 }, o: "Malaysia and Indonesia accept Chinese yuan swaps. Coalition loses two critical ASEAN anchors.", type: "bad" }] },
    { a: 4, t: "Strike Authorization — Dongsha Island Radar Complex", b: "INDOPACOM has a 14-hour window. Strike package: PLA early warning radar on Dongsha Island plus PLAN SAM batteries. CIA estimate: 60-180 civilian casualties.", i: "Military window: 14 hours. After that, PLAAF reinforcements from Fuzhou arrive. China has pre-delegated authority to theater commanders if attacked.", c: [{ l: "Full kinetic strike — radar plus SAM batteries, authorize now", tag: "STR", strike: true, e: { military: 22, credibility: -12, global: -18, coalition: -10, domestic: -15, chest: -10 }, o: "Both targets destroyed. Taiwan air corridor restored. China's theater commanders activate pre-delegated authority.", type: "neutral" }, { l: "Radar only — no SAM batteries, limit civilian exposure", tag: "STR", strike: true, e: { military: 13, credibility: -4, global: -8, coalition: -5, domestic: -8, chest: -5 }, o: "Surgical. Radar dark. PLAN loses coordination 48 hours. China protests formally but does not escalate.", type: "good" }, { l: "NSA cyber strike only — Operation OBSIDIAN", tag: "INT", e: { military: 8, credibility: 6, global: 0, coalition: 3, chest: -2 }, o: "Radar networks disrupted 72hrs. Deniable. Taiwan airspace partially cleared.", type: "good" }, { l: "Deny strike — negotiate ceasefire instead", tag: "DIP", e: { military: -5, credibility: -6, global: 8, coalition: 5, domestic: 5 }, o: "No escalation. Taiwan's military position deteriorates. PLAN advances patrol line.", type: "bad" }] },
    { a: 4, t: "North Korea Activates — Two-Front Nightmare", b: "NSA confirms 4 KPA corps moved to forward DMZ positions. Pyongyang test-fired 2 Hwasong-15 MRBMs over the Sea of Japan. USFK commander requesting a carrier group redeployment. Moving assets to Korea thins your Taiwan posture by 30%.", i: "USFK: KPA can cross the DMZ in 6 hours. Without THAAD reinforcement, Seoul is within artillery range.", c: [{ l: "Hold Taiwan — USFK handles Korea with existing assets", tag: "MIL", e: { military: -6, coalition: -5, domestic: -8, credibility: 3 }, o: "USFK braces. Seoul nervous. China tests the gap immediately. Taiwan window intact but Korea risk grows.", type: "neutral" }, { l: "Emergency THAAD reinforcement plus B-52 rotation, no redeployment", tag: "MIL", e: { military: 6, economy: -12, coalition: 6, credibility: 8, chest: -10 }, o: "Both theaters reinforced without redeployment. Expensive. B-52s flying Guam to Korea and Taiwan simultaneously.", type: "good" }, { l: "Back-channel to China: joint pressure on Pyongyang", tag: "DIP", e: { credibility: 10, global: 12, coalition: -3, military: -3 }, o: "Unprecedented. China agrees — they do not want NK going rogue either.", type: "good" }, { l: "Offer Kim food aid through China as intermediary", tag: "DIP", e: { credibility: -6, domestic: -10, global: -5, coalition: -5, chest: -5 }, o: "NK stands down. Critics call it appeasement. Three Senate Republicans introduce impeachment resolution.", type: "bad" }] },
    { a: 4, t: "PLAN Amphibious Fleet Is Underway", b: "Satellite imagery confirms: all 46 vessels of PLA amphibious assault fleet have departed Fujian coast staging areas. They are underway. NSC estimates Taipei could be under fire in 72 hours. The President is on the secure line with Taiwan's President right now.", i: "PLA amphibious operation success probability without US intervention: 61%. With 2 carrier groups: 23%. Time to deploy Nimitz from Pearl Harbor: 7 days — too late.", c: [{ l: "Surge ALL available carrier groups — maximum intervention", tag: "STR", strike: true, e: { military: 20, credibility: 5, global: -15, coalition: 5, domestic: -12, chest: -18, fuel: -12 }, o: "Everything moves. Markets collapse 11%. China elevates nuclear posture. Taiwan has a fighting chance.", type: "neutral" }, { l: "Establish maritime exclusion zone — block the fleet", tag: "MIL", e: { military: 15, credibility: 8, global: -10, coalition: 8, domestic: -8, chest: -10 }, o: "US declares maritime exclusion zone around Taiwan. PLAN fleet halts. Standoff at sea.", type: "good" }, { l: "Emergency UN Security Council plus media exposure", tag: "DIP", e: { credibility: 12, global: 18, coalition: 10, military: -5 }, o: "China vetoes UNSC. But 140 nations watching live. PLAN fleet slows. International pressure is real.", type: "neutral" }, { l: "Call Xi directly — emergency bilateral to halt the operation", tag: "DIP", e: { credibility: 8, global: 12, coalition: 5, military: -3 }, o: "Xi takes the call. Operation is paused for 48 hours. Back-channel opens.", type: "neutral" }] },
    { a: 5, t: "Malacca Strait — ASEAN Forces Your Hand", b: "Indonesia and Malaysia formally announced: Malacca Strait will be closed to all military traffic within 48 hours unless ceasefire framework agreed. PLAN has moved a surface action group toward Malacca.", i: "Malacca closure: China fuel -62% in 14 days. US Pacific logistics hit 30%, rerouting adds 9 days per convoy. Oil +$35/barrel.", c: [{ l: "Endorse ASEAN closure — maximum pressure on China", tag: "DIP", e: { coalition: 16, global: 12, credibility: 8, economy: -12, military: -6, fuel: -8 }, o: "ASEAN bloc unified. China's fuel crisis accelerates. Your Pacific logistics rerouted.", type: "good" }, { l: "Quietly support while publicly calling for civilian shipping continuity", tag: "DIP", e: { coalition: 10, global: 6, credibility: 4, economy: -4 }, o: "Plausible deniability. ASEAN acts. China suspects. Your logistics minimally disrupted.", type: "good" }, { l: "Oppose ASEAN closure — US Pacific logistics take priority", tag: "MIL", e: { coalition: -18, global: -10, credibility: -12, military: 6 }, o: "ASEAN furious. Malaysia and Indonesia pivot toward China neutrality.", type: "bad" }, { l: "Offer to negotiate a military transit corridor for both sides", tag: "DIP", e: { credibility: 10, global: 8, coalition: 5, military: -3 }, o: "Creative third option. ASEAN accepts. China gets limited access. US gets full access.", type: "good" }] },
    { a: 5, t: "Iran Activates — Hormuz Shadow Play", b: "Iran has announced defensive exercises near the Strait of Hormuz, shadowing US and allied tankers. This is opportunistic activation — testing your bandwidth. Pulling even one destroyer group to Hormuz weakens the Taiwan theater.", i: "Hormuz disruption would spike global oil +$40/barrel. Your domestic economy takes an immediate hit.", c: [{ l: "Deploy carrier Truman to Hormuz — separate deterrence", tag: "MIL", e: { military: -8, economy: 5, coalition: 3, domestic: -10 }, o: "Iran backs down. Taiwan theater weakened for 3 weeks while Truman transits.", type: "neutral" }, { l: "Coordinate with Gulf allies — Saudi and UAE handle Hormuz", tag: "DIP", e: { coalition: 5, economy: 3, military: 0, credibility: 5 }, o: "Efficient. Saudi Arabia surges naval presence. You stay focused on Taiwan. Oil markets calm.", type: "good" }, { l: "Ignore Iran — call the bluff", tag: "MIL", e: { military: 0, economy: -12, credibility: -5 }, o: "Iran mines one tanker approach. Oil price spikes. You were wrong to ignore it.", type: "bad" }, { l: "Back-channel Iran: sanctions relief for Hormuz quiet", tag: "DIP", e: { economy: 8, credibility: -8, domestic: -12, coalition: -5 }, o: "Oil stabilizes. Republicans call it treason. Three senators demand impeachment hearings.", type: "bad" }] },
    { a: 5, t: "China's Economy Is Collapsing — Offer an Off-Ramp?", b: "Intelligence reports: China's GDP has contracted 18% annualized. Shanghai protests are returning. Xi's internal approval: 58%. Moderates in the Politburo are circulating a peace framework memo. This is the best opportunity for a negotiated settlement since the crisis began.", i: "Window: 5-7 days before hardliners consolidate. Switzerland has offered to host emergency talks.", c: [{ l: "Offer comprehensive peace framework — Taiwan autonomy", tag: "DIP", e: { credibility: 20, global: 25, coalition: 15, economy: 12, domestic: 10, chest: 8 }, o: "Switzerland talks open. Both sides come to the table. The outline of a 25-year Taiwan autonomy deal emerges.", type: "good" }, { l: "Maintain maximum pressure — do not give China an easy out", tag: "MIL", e: { military: 5, credibility: -8, global: -8, economy: -10, domestic: 8 }, o: "You are right that their position is weakening. But the moderates lose the Politburo debate. Hardliners recommit.", type: "neutral" }, { l: "Accept EU mediation offer — let Brussels run the talks", tag: "DIP", e: { credibility: 12, global: 14, coalition: 8, economy: 6 }, o: "EU takes the chair in Geneva. Both sides accept EU neutrality. You have gained political distance.", type: "good" }, { l: "Secret bilateral with Xi — define red lines privately", tag: "DIP", e: { credibility: 8, global: 10, coalition: -5, domestic: 5 }, o: "Quiet meeting produces a verbal framework. Risky if it leaks. But the most direct path to a deal.", type: "good" }] },
    { a: 6, t: "Taiwan Requests Evacuation Protocol", b: "Taiwan's President sends a back-channel: she requests US Navy assets to pre-position for evacuation of government leadership if Taipei falls. Complying signals abandonment. Refusing risks losing Taiwan's democratic government to PLA capture.", i: "PLA D-Day probability: 64% within 72 hours. USS Bataan ARG is 2 days away from Taiwan.", c: [{ l: "Pre-position USS Bataan — quiet, undisclosed", tag: "MIL", e: { credibility: 8, military: 5, coalition: 5 }, o: "Quiet preparation. Taiwan's president reassured. Plausible deniability intact.", type: "good" }, { l: "Refuse — publicly commit to Taiwan's defense to the end", tag: "MIL", e: { credibility: 18, military: 10, domestic: 8, coalition: 8, economy: -12 }, o: "Bold and binding. Taiwan morale surges. If Taipei falls, US takes the full reputational catastrophe.", type: "neutral" }, { l: "Negotiate ceasefire immediately — call Xi directly", tag: "DIP", e: { credibility: -8, global: 20, coalition: -10, economy: 12 }, o: "Crisis de-escalation. Taiwan's status ambiguous. History will debate wisdom vs. capitulation.", type: "neutral" }, { l: "Surge all carriers — full escalation dominance", tag: "STR", strike: true, e: { military: 22, economy: -25, domestic: -18, coalition: 5, global: -20 }, o: "Maximum force. China backs down from amphibious assault. You are at the edge of a shooting war.", type: "neutral" }, { l: "Emergency UNGA session — internationalise the moment", tag: "DIP", e: { credibility: 10, global: 18, coalition: 10, military: -5 }, o: "134 nations vote for ceasefire. China ignores it — but is completely diplomatically isolated.", type: "good" }] },
    { a: 6, t: "The Final 72 Hours — Choose Your Legacy", b: "Day 31. Taiwan intact. PLAN pulled back 40km. Coalition cohesion at 68%. China's economy in technical recession. Your NSA hands you three options. IMF warned: another 30 days of conflict equals global recession 81% probability.", i: "China has privately signaled through Switzerland they will accept a negotiated framework. Politburo hardliner faction lost 2 votes.", c: [{ l: "BLUE: Comprehensive 25-year Taiwan autonomy framework", tag: "DIP", e: { credibility: 26, global: 32, coalition: 22, domestic: 16, economy: 14, chest: 5 }, o: "Both sides sign under immense EU pressure. Taiwan preserved de facto indefinitely. Nobel committee calls. Markets surge 12%.", type: "good" }, { l: "AMBER: Managed ceasefire — freeze positions, 18-month review", tag: "DIP", e: { credibility: 10, global: 13, coalition: 9, domestic: 6, economy: 9 }, o: "Guns silent. No permanent solution. Taiwan survives for now. History will debate whether deferral was wisdom.", type: "neutral" }, { l: "RED: Full PLAN withdrawal demanded — no deal until China leaves", tag: "MIL", e: { military: 6, credibility: 8, domestic: 12, global: -12, economy: -15, coalition: -5 }, o: "You do not settle. War of attrition continues. Taiwan holds. Both economies hemorrhage.", type: "neutral" }, { l: "NUCLEAR ULTIMATUM: withdraw in 48hrs or full strike package", tag: "STR", strike: true, e: { military: 15, credibility: -6, global: -22, domestic: 5, economy: -22, coalition: -12 }, o: "China elevates nuclear signaling three levels. Your allies call asking you to stand down.", type: "bad" }] },
  ],
  china: [
    { a: 1, t: "Politburo Split — Tighten or Negotiate?", b: "Standing Committee divided 4-3. Hardliners want tighter blockade and D-Day in 14 days. Moderates warn of Western sanctions coalition. Taiwan's fuel reserves at 61% — 18 days to economic strangulation. US carrier group 900km and closing.", i: "PLAN assessment: full fuel depletion achievable in 18 days. US CSG arrives in 5-6 days. Window is closing.", c: [{ l: "Tighten blockade — intercept all vessels including humanitarian", tag: "MIL", e: { military: 13, economy: -10, credibility: -9, global: -13, politburo: 9, pla: 5 }, o: "PLAN stops a WHO-flagged vessel. US calls it an act of war. EU sanctions committee convenes emergency session.", type: "neutral" }, { l: "Humanitarian corridors — control the global narrative", tag: "DIP", e: { credibility: 13, global: 11, politburo: -9, pla: -3, economy: 4 }, o: "Soft face. EU sanctions pause. Moderate faction strengthened. Admiral Chen is publicly furious.", type: "good" }, { l: "Simultaneous cyber offensive on Taiwan's power grid", tag: "INT", e: { military: 11, credibility: -7, global: -6, pla: 9 }, o: "Taiwan's northern grid flickers. Deniable. US Cyber Command on maximum alert.", type: "neutral" }, { l: "One Country Two Systems Plus — back-channel offer through Malaysia", tag: "DIP", e: { credibility: 9, global: 16, politburo: -13, military: -5, pla: -8 }, o: "DPP publicly rejects with contempt. But three KMT legislators are privately interested.", type: "neutral" }] },
    { a: 1, t: "BRI Leverage — Southeast Asia UN Votes", b: "Indonesia, Malaysia, Thailand, and Pakistan wavering on UNGA votes. China holds significant BRI debt over all four. A phone call from Xi could tip them all to abstain — giving you a 60-day diplomatic shield.", i: "If all four abstain, US resolution fails in UNGA. If Malaysia votes with US, the coalition narrative solidifies against China.", c: [{ l: "Direct BRI debt leverage — invoke terms explicitly", tag: "ECO2", e: { global: -8, economy: 5, credibility: -10, politburo: 5 }, o: "Quiet coercion works. Indonesia abstains. The tactic leaks — debt trap headlines everywhere.", type: "neutral" }, { l: "Offer BRI debt relief in exchange for support", tag: "ECO2", e: { economy: -12, global: 12, credibility: 10 }, o: "Generous optics. Southeast Asia swings toward neutrality. Expensive but clean.", type: "good" }, { l: "Ignore SEA diplomacy — military momentum is your argument", tag: "MIL", e: { military: 5, global: -12, credibility: -5 }, o: "Malaysia votes with US. ASEAN alignment shifts against China.", type: "bad" }, { l: "ASEAN-China Economic Solidarity Fund — $200B commitment", tag: "ECO2", e: { economy: -18, global: 20, credibility: 15, politburo: -5 }, o: "Bold and genuine. ASEAN neutrality largely secured. US regional influence weakens structurally.", type: "good" }] },
    { a: 2, t: "PLAN Resupply Crisis — The 18-Day Deadline", b: "Admiral Chen's blockade fleet has reached Day 18. Fuel, food, and ammunition resupply needed or combat readiness degrades 40% over the next 7 days. Three options: Russian Arctic convoy, Iranian-flagged tankers, or coastal resupply exposed to US submarine attack.", i: "US SSN Wolf Pack is in covert position in the Taiwan Strait. Any surface resupply convoy faces interdiction risk.", c: [{ l: "Russian Arctic convoy — negotiate immediate fuel transfer", tag: "SUP", e: { supply: 15, fuel: 20, military: 5, credibility: -8, global: -8 }, o: "Russia delivers. PLAN combat readiness sustained. The China-Russia axis is publicly visible.", type: "neutral" }, { l: "Iranian-flagged tankers — plausible deniability route", tag: "SUP", e: { supply: 10, fuel: 15, military: 3, credibility: -3 }, o: "Works for 8 days. US intelligence confirms Iranian flags but cannot prove Chinese connection publicly.", type: "good" }, { l: "Domestic coastal resupply — accept US submarine interdiction risk", tag: "SUP", e: { supply: 8, fuel: 10, military: -5, pla: -5 }, o: "First coastal convoy intercepted by USS Connecticut. Two PLAN destroyers damaged. Resupply interrupted.", type: "bad" }, { l: "Accelerate D-Day timeline — attack before resupply crisis hits", tag: "STR", strike: true, e: { military: 10, fuel: -12, supply: -5, pla: 15, politburo: 5, economy: -15 }, o: "You advance the amphibious timeline 6 days. The operation begins before the fuel crisis hits — but before optimal positioning.", type: "neutral" }] },
    { a: 2, t: "PLA Insubordination — Admiral Pushes for D-Day", b: "Admiral Chen Weiming has sent a communication directly to Xi, bypassing CMC protocols: The window closes in 5 days. Any delay risks amphibious capability degradation. I request immediate D-Day authorization. He has the backing of 3 of 5 CMC members.", i: "CMC internal vote: 3-2 for immediate assault. Chen has the Eastern Theater, the amphibious fleet, and the PLAAF Eastern Command.", c: [{ l: "Authorize D-Day — 5-day window, let Chen execute", tag: "STR", strike: true, e: { military: 16, pla: 18, politburo: 6, economy: -22, credibility: -22, global: -28 }, o: "Operation Dongshan begins. 800 PLAN vessels and 46 amphibious ships cross the median line.", type: "neutral" }, { l: "Relieve Admiral Chen immediately — assert Party control over PLA", tag: "MIL", e: { pla: -16, politburo: 9, credibility: 5, military: -6 }, o: "Chen is arrested at PLAN Eastern Theater HQ. PLA loyalty shaken. Xi's authority reasserted at significant cost.", type: "neutral" }, { l: "Promote Chen — assign expanded authority, delay D-Day", tag: "DIP", e: { pla: 9, politburo: -4, military: 4 }, o: "Political genius. Chen feels honored. D-Day delayed 10 days. CMC dynamics shift.", type: "good" }, { l: "Call CMC emergency vote — let the collective decide", tag: "DIP", e: { pla: 5, politburo: -5, credibility: -3, military: 5 }, o: "Vote goes 3-2 for delay. Chen accepts. You look slightly weakened.", type: "neutral" }] },
    { a: 3, t: "Shanghai Protests — Economic Pain Hits Home", b: "Spontaneous protests in Shanghai, Chengdu, Wuhan. Export orders down 34%. Factory workers unpaid for 7 weeks. Social media shows crowds before censors act — 8 minutes of footage, 340 million views before deletion. Xi's internal approval polling: 58%, down from 87%.", i: "If domestic unrest reaches Tier 2 cities, PLA domestic deployment necessary — drawing 3 divisions from Taiwan operation. Economic cost so far: $1.4T.", c: [{ l: "MSS emergency powers plus economic stimulus simultaneously", tag: "INT", e: { stability: 16, credibility: -10, global: -10, politburo: 6, economy: -12, pla: 4 }, o: "Protests suppressed. $300B stimulus deployed. Workers receive partial back pay. UN Human Rights Council convenes.", type: "neutral" }, { l: "Xi national address — The Century of Humiliation ends now", tag: "DIP", e: { stability: 16, credibility: 9, politburo: 9, pla: 11, domestic: 8 }, o: "Nationalist rally effect. Approval rebounds to 74% in 48 hours. Factory workers who have not been paid are now donating to the military fund.", type: "good" }, { l: "Emergency $600B economic stimulus — prioritize domestic stabilization", tag: "FIN", e: { economy: -22, stability: 14, credibility: 5, politburo: -4, chest: -20 }, o: "Workers receive back pay. War chest seriously depleted. Military timeline must accelerate.", type: "neutral" }, { l: "Accelerate military operations — external victory resolves internal politics", tag: "MIL", e: { military: 9, stability: -9, economy: -16, global: -9, pla: 6 }, o: "Classic authoritarian gamble. If Taiwan falls in 14 days, the protests become celebrations. If it drags to Day 45 — regime crisis.", type: "neutral" }] },
    { a: 4, t: "DF-21D Strike Authorization — USS Gerald R. Ford", b: "PLAN sensors have targeting solution on USS Gerald R. Ford. CMC presents the option: DF-21D carrier killer strike. 74% hit probability. If successful, US power projection in the Pacific is crippled for 18 months.", i: "Xi Jinping has sole authority. Strike window: 6 hours. US carrier is launching additional air defense patrols — the window closes.", c: [{ l: "Authorize DF-21D strike — eliminate the carrier threat", tag: "STR", strike: true, e: { military: 26, credibility: -36, global: -32, economy: -26, pla: 16, politburo: 6 }, o: "Gerald Ford hit amidships. US President addresses Congress. NATO Article 4 consultations called. The world has entered a new phase.", type: "bad" }, { l: "Warning shot — splash DF-21D 40km short of Ford", tag: "MIL", e: { military: 13, credibility: -10, global: -11, pla: 9, stability: -8 }, o: "Missile splashes 40km off Ford's bow. US DEFCON elevated to 2. The message is unmistakable: you can hit it.", type: "neutral" }, { l: "Stand down — pursue emergency diplomatic channel through Switzerland", tag: "DIP", e: { military: -5, credibility: 8, global: 13, politburo: -9, pla: -9 }, o: "Restraint shown. Moderate faction strengthened. Switzerland activates back-channel.", type: "good" }, { l: "Cyberattack INDOPACOM communications plus GPS spoofing instead", tag: "INT", e: { military: 11, credibility: -5, global: -7, pla: 6 }, o: "Ford task force loses coordinated targeting for 8 hours. GPS spoofing affects two guided-missile destroyers.", type: "neutral" }] },
    { a: 5, t: "North Korea Activation — Coordinate or Contain?", b: "Kim Jong-un has sent a private message: We are ready to move. KPA corps are at the DMZ. A synchronized North Korean move would split US attention catastrophically — but it could also trigger a nuclear exchange that ends the entire operation.", i: "If KPA moves, USFK repositions — weakening Taiwan theater by 30%. Risk: nuclear escalation ladder.", c: [{ l: "Activate NK — coordinate DMZ pressure", tag: "MIL", e: { military: 15, global: -20, credibility: -15, pla: 8, economy: -10 }, o: "KPA activates. US attention splits 25%. Taiwan window opens. Nuclear threshold approaches.", type: "neutral" }, { l: "Tell Kim to stand down — you do not need his mess", tag: "DIP", e: { military: -3, credibility: 8, global: 5, politburo: -3 }, o: "Kim is furious but complies. You avoid nuclear escalation. US stays focused at full strength.", type: "good" }, { l: "Use NK as a threat — signal coordination without activating", tag: "DIP", e: { military: 8, global: -8, credibility: -3, politburo: 5 }, o: "Psychological pressure. US diverts 15% attention to Korea monitoring. Effective without nuclear risk.", type: "good" }, { l: "Offer Kim energy and food for missile tests only — no ground troops", tag: "ECO2", e: { economy: -5, military: 5, global: -10, credibility: -5 }, o: "NK test-fires 3 missiles. US attention splits 20%. NK fed. No ground troops.", type: "neutral" }] },
    { a: 6, t: "Endgame: Taipei Falls or Deal is Made", b: "Operation Dongshan is T-minus 24 hours from full amphibious execution — or you call it off permanently. Taiwan's defenses degraded 58%. US carriers 380km out. The Politburo is in session. This decision defines China's next century.", i: "D-Day success probability: 61% without US intervention. 18% with. EU ceasefire offer on table.", c: [{ l: "Execute Dongshan — launch the full amphibious invasion", tag: "STR", strike: true, e: { military: 21, economy: -32, credibility: -32, global: -32, pla: 22, politburo: 11, chest: -25 }, o: "800 PLAN vessels and 46 amphibious ships cross. The world's largest amphibious operation begins.", type: "neutral" }, { l: "Accept EU ceasefire — 25yr autonomy framework", tag: "DIP", e: { credibility: 21, global: 21, economy: 16, pla: -13, politburo: -11, chest: 8 }, o: "Historic compromise. Economy begins recovering. Hardliners feel betrayed. But Xi survives politically.", type: "good" }, { l: "Permanent naval blockade — Taiwan under indefinite siege", tag: "MIL", e: { military: 11, credibility: -9, global: -13, pla: 11, politburo: 6, economy: -8 }, o: "You do not invade. You do not withdraw. Taiwan is permanently economically strangled. Frozen conflict — Beijing style.", type: "neutral" }, { l: "Withdraw to pre-crisis positions — declare exercise concluded", tag: "DIP", e: { credibility: 5, global: 11, pla: -22, politburo: -22, domestic: -16 }, o: "Face-saving retreat. The world sees through it. Xi's position is shaken. But war is avoided.", type: "neutral" }] },
  ],
  russia: [
    { a: 1, t: "The Kremlin's Opening — What Is Your Angle?", b: "Taiwan Strait has erupted. NATO elevated but stretched. Options: maximum energy leverage, mediator play, Kaliningrad distraction, pure neutrality auction. China offered $340B for neutrality plus. Three oligarchs called asking you to please not start anything.", i: "NATO attention: 70% Taiwan. Window for opportunistic action: 10-14 days. USS Connecticut shadowing your Arctic convoy.", c: [{ l: "Maximum energy leverage — cut EU gas 40%, flood China at premium", tag: "ECO2", e: { economy: 22, credibility: -11, global: -16, nato: 16, oligarch: -8 }, o: "EU scrambles for LNG. China pays $40/bbl premium. $8B/month additional revenue.", type: "neutral" }, { l: "Offer to mediate — position Russia as indispensable peacemaker", tag: "DIP", e: { credibility: 16, global: 11, nato: -11, oligarch: 6 }, o: "Both sides accept back-channel within 48hrs. Moscow suddenly relevant in ways it has not been in a decade.", type: "good" }, { l: "Kaliningrad activation — ISKANDER exercises toward Poland", tag: "MIL", e: { military: 9, nato: 22, credibility: -13, global: -16, oligarch: -11 }, o: "NATO goes to full eastern readiness. US diverts 15% attention to Europe. But NATO is now fully activated.", type: "bad" }, { l: "Pure neutrality auction — extract maximum from both sides", tag: "DIP", e: { economy: 11, credibility: 6, global: 6, oligarch: 11, nato: -5 }, o: "Classic Russian auction. Both sides pay. Oligarchs delighted. Most profitable opening.", type: "good" }, { l: "Formal China alignment — announce Russia-China strategic partnership", tag: "MIL", e: { economy: 16, credibility: -16, global: -20, nato: 22, oligarch: -15 }, o: "China-Russia axis formalized. Western sanctions expand massively. NATO emergency summit.", type: "neutral" }] },
    { a: 1, t: "Arctic Convoy — USS Connecticut Is Shadowing", b: "US intelligence confirmed USS Connecticut SSN is shadowing your Arctic fuel convoy. If US interdicts, China loses 40% emergency fuel resupply and Russia loses $2.1B/month. Chinese ambassador called: We are counting on you.", i: "Arctic convoy: 8 ships, $340M per run. USS Connecticut can interdict without surfacing. Pacific Fleet escort: 3-day transit.", c: [{ l: "Pacific Fleet escort — deploy warships to protect the convoy", tag: "MIL", e: { economy: 10, military: 6, nato: 8, credibility: -5 }, o: "USS Connecticut backs off when it sees escort. China gets supply. Tension rises but no shooting.", type: "neutral" }, { l: "Activate Route Beta — switch convoy to secondary Arctic path", tag: "LOG", e: { economy: 7, supply: 8, fuel: 5, nato: -3 }, o: "Secondary route activated. 2 extra days. US does not have Connecticut positioned there. Clean workaround.", type: "good" }, { l: "Iranian tanker chain — route Chinese fuel through Iranian ships", tag: "LOG", e: { economy: 8, credibility: -5, proxy: 8 }, o: "Iran activates flagged tankers. Plausible deniability. 5 days longer. China gets fuel.", type: "neutral" }, { l: "Announce the convoy publicly — dare the US to interdict", tag: "MIL", e: { economy: 5, credibility: 8, nato: 12, global: -5 }, o: "US faces international scrutiny if it interdicts a civilian fuel convoy. Connecticut backs down.", type: "neutral" }, { l: "Abandon the convoy — avoid a shooting incident", tag: "LOG", e: { economy: -15, credibility: -8, proxy: -5, oligarch: -8 }, o: "China loses fuel supply. Ambassador calls furiously. Russia loses $340M revenue.", type: "bad" }] },
    { a: 2, t: "AFRIC Corps Deployment — Three Options Open", b: "Three deployment windows have converged. (1) Ukraine eastern front: 72hr surge while NATO is distracted. (2) Central Africa cobalt mining: $15B contract needs protection. (3) Red Sea: seize Djibouti-adjacent port to threaten US logistics. Only one deployment.", i: "NATO attention at 60% Taiwan. AFRIC Corps: 15,000 troops deployable in 72hrs.", c: [{ l: "Ukraine surge — advance in Zaporizhzhia while NATO is distracted", tag: "MIL", e: { military: 16, nato: 26, credibility: -16, global: -21, economy: -5, oligarch: -9 }, o: "Dramatic advance. NATO emergency session. US pivots 20% attention to Europe. Land gained — encirclement accelerated.", type: "neutral" }, { l: "Central Africa cobalt — secure $15B mining revenue", tag: "ECO2", e: { economy: 16, military: 3, credibility: -5, global: -8 }, o: "Cobalt reserves secured. 3 Western mining companies expelled. Long-term revenue stream established.", type: "good" }, { l: "Red Sea port seizure — threaten US Horn of Africa logistics", tag: "PRX", e: { proxy: 15, military: 5, credibility: -10, global: -12, nato: 8 }, o: "US Horn logistics disrupted. AFRICOM scrambles. Second front ties down US attention.", type: "neutral" }, { l: "Hold all forces — preserve optionality for the endgame", tag: "DIP", e: { military: -3, credibility: 5, oligarch: 9, nato: -5 }, o: "Disciplined restraint. Oligarchs approve. You preserve every option.", type: "good" }] },
    { a: 2, t: "North Korea Is Calling — Coordinate or Contain?", b: "Kim Jong-un sent a private message: We are ready to move at the DMZ. Your support will ensure success. A synchronized NK move would split US attention — but could spiral into a nuclear exchange. You have unique influence over both Kim and Beijing.", i: "If KPA activates: US splits attention 25%, Taiwan window opens, nuclear threshold rises significantly.", c: [{ l: "Encourage NK activation — coordinate with Beijing to split US attention", tag: "PRX", e: { proxy: 15, military: -3, credibility: -12, global: -16, nato: 8 }, o: "NK activates. US attention splits 25%. Nuclear signaling rises to Level 3. China is nervous.", type: "neutral" }, { l: "Tell Kim to stand down — do not want nuclear escalation", tag: "DIP", e: { credibility: 8, global: 8, proxy: -5, nato: -5 }, o: "Kim frustrated but complies. Nuclear escalation prevented. US thanks you privately.", type: "good" }, { l: "Use NK as a threat — tell US you cannot guarantee Kim without concessions", tag: "DIP", e: { credibility: 5, economy: 8, nato: -8, proxy: 5 }, o: "US offers partial sanction relief to get you to calm Kim. Nuclear coercion through proxy.", type: "good" }, { l: "Send Pacific Fleet to Korean Strait — ambiguous positioning", tag: "MIL", e: { military: 8, nato: 12, credibility: -5, global: -8 }, o: "Pacific Fleet moves to Korean Strait. US, Japan, South Korea on maximum alert.", type: "neutral" }] },
    { a: 3, t: "Oligarch Ultimatum — 180B in European Assets Freezing", b: "Three key oligarchs: 180B in European assets freezing under expanding secondary sanctions. They want a decision: commit to China or de-escalate. Simultaneously, Iran proposed a Russia-China-Iran energy triangle worth $800B annually — completely outside Western financial architecture.", i: "Oligarch assets: 180B European vs 55B Chinese. Triangle: $800B annual flow outside SWIFT.", c: [{ l: "Accept Russia-China-Iran energy triangle — full commitment", tag: "FIN", e: { economy: 18, oligarch: -12, credibility: -13, global: -16, nato: 11 }, o: "Triangle activates. $800B in energy trade outside Western finance. Eurasian financial bloc born.", type: "neutral" }, { l: "Begin de-escalation — open secret US back-channel for oligarch assets", tag: "DIP", e: { economy: -5, credibility: 11, global: 9, nato: -13, oligarch: 6 }, o: "Washington channel opens. Partial sanction relief. Oligarchs protect 120B in European assets.", type: "good" }, { l: "Nationalize all oligarch European-exposed assets", tag: "ECO2", e: { economy: -11, oligarch: -22, stability: 9, military: 5 }, o: "Oligarchs cannot defect because they have nothing left to defect with.", type: "neutral" }, { l: "Offer oligarchs protection: fund Arctic-China infrastructure", tag: "ECO2", e: { economy: 9, oligarch: 13, military: 3, nato: 5 }, o: "Oligarchs fund Arctic Silk Road in exchange for state protection. Aligned through self-interest.", type: "good" }, { l: "Allow select oligarchs to defect in exchange for intelligence", tag: "INT", e: { oligarch: -8, credibility: 10, global: 8, nato: -8 }, o: "Three oligarchs defect with intelligence on Russian operations. Western goodwill and a de-escalation signal.", type: "neutral" }] },
    { a: 3, t: "Resupply Crisis — Overextended on All Fronts", b: "Logistics command flagged a critical problem: maintaining Ukraine front, Arctic convoy escorts, AFRIC Corps, and Pacific Fleet simultaneously is exceeding logistics capacity by 40%. Something will break in 10 days unless you prioritize.", i: "Overextended 40%. Fuel reserves dropping 3%/week. Budget at 60% remaining.", c: [{ l: "Prioritize Ukraine plus Arctic — let Africa and Pacific go quiet", tag: "LOG", e: { supply: 10, fuel: 8, military: 5, proxy: -10, global: -5 }, o: "Ukraine front maintained. China's fuel protected. AFRIC winds down. Two-front focus.", type: "good" }, { l: "Prioritize Arctic plus Pacific — protect China supply above all", tag: "LOG", e: { supply: 12, economy: 10, military: -5, proxy: -8, nato: -5 }, o: "China's supply fully protected. Ukraine front degrades 20%. NATO notices reduced pressure.", type: "neutral" }, { l: "Emergency fuel rationing — reduce all fronts 20%", tag: "LOG", e: { supply: 5, fuel: 12, military: -8, economy: -5 }, o: "Across-the-board reduction. Nothing collapses immediately. 30 days bought at the cost of capability.", type: "neutral" }, { l: "Emergency war budget — authorize $80B additional spending", tag: "FIN", e: { chest: -20, military: 10, supply: 8, fuel: 6, domestic: -8 }, o: "All fronts maintained. Domestic economy hit. Oligarchs alarmed.", type: "neutral" }] },
    { a: 4, t: "Germany Offers a Private Deal", b: "German Chancellor reached out: Can you give a private commitment that Russia will not exploit this crisis on the eastern flank? Germany is the EU's swing vote on every sanction measure. Private reassurance could pull Germany toward SWIFT neutrality — worth 40B in blocked sanctions.", i: "German private commitment: blocks most aggressive SWIFT measures. Cost: constrains Kaliningrad and Ukraine front for 90 days.", c: [{ l: "Give Germany private reassurance — extract SWIFT neutrality", tag: "DIP", e: { credibility: 10, economy: 12, nato: -8, military: -5 }, o: "Germany blocks aggressive SWIFT measures. Russia saves 40B. Eastern front constrained 90 days.", type: "good" }, { l: "Ignore Germany — keep all military options open", tag: "MIL", e: { military: 5, nato: 8, credibility: -5, economy: -8 }, o: "Germany votes with US on SWIFT. 40B in additional sanctions pass.", type: "neutral" }, { l: "Public reassurance speech — announce Russian defensive posture", tag: "DIP", e: { credibility: 8, global: 6, nato: -10, military: -8, oligarch: 5 }, o: "Speech lands well. Markets stabilize. Hawks in Moscow are furious.", type: "neutral" }, { l: "Counter-demand: Germany drops SWIFT AND withdraws NATO troops from Poland", tag: "DIP", e: { credibility: -8, nato: 5, global: -5 }, o: "Germany refuses publicly. Relations deteriorate. You have overplayed.", type: "bad" }] },
    { a: 5, t: "Korea Crisis — North Korea Is Moving", b: "Kim Jong-un sent a private message: We are ready to move at the DMZ. Your support will ensure success. A synchronized NK move would split US attention — but could spiral into a nuclear exchange.", i: "If KPA activates: US splits attention 25%, Taiwan window opens, nuclear threshold rises significantly.", c: [{ l: "Encourage NK activation — coordinate with Beijing", tag: "PRX", e: { proxy: 15, military: -3, credibility: -12, global: -16, nato: 8 }, o: "NK activates. US attention splits 25%. Nuclear signaling rises to Level 3.", type: "neutral" }, { l: "Tell Kim to stand down — do not want nuclear escalation", tag: "DIP", e: { credibility: 8, global: 8, proxy: -5, nato: -5 }, o: "Kim frustrated but complies. Nuclear escalation prevented. US thanks you privately.", type: "good" }, { l: "Use NK as threat — tell US you cannot guarantee Kim without concessions", tag: "DIP", e: { credibility: 5, economy: 8, nato: -8, proxy: 5 }, o: "US offers partial sanction relief to get you to calm Kim. Nuclear coercion through proxy.", type: "good" }, { l: "Send Pacific Fleet to Korean Strait — ambiguous positioning", tag: "MIL", e: { military: 8, nato: 12, credibility: -5, global: -8 }, o: "Pacific Fleet moves to Korean Strait. US, Japan, South Korea on maximum alert.", type: "neutral" }] },
    { a: 6, t: "Russia's Endgame — 72 Hours to Cash In", b: "The Taiwan crisis is resolving. You have played every side. NATO attention split for 4 weeks. China owes you $340B. US calling about Ukraine. Europe energy-dependent. Leverage at absolute maximum — for exactly the next 72 hours.", i: "Leverage: maximum right now, declining in 72hrs. Realistically extract 1-2 major concessions.", c: [{ l: "Demand Ukraine recognition plus sanctions removal as peace price", tag: "DIP", e: { credibility: 6, global: -11, nato: -22, economy: 16, oligarch: 16 }, o: "Audacious. EU protests. But US needs you to close the Taiwan deal. Partial Donbas recognition and 40% sanctions relief achieved.", type: "good" }, { l: "Permanent China energy partnership — 1T 30yr contract plus Arctic sovereignty", tag: "ECO2", e: { economy: 26, credibility: 4, global: 4, nato: 0, oligarch: 11 }, o: "Long-term economic security. Russia becomes China's indispensable energy supplier for a generation.", type: "good" }, { l: "Demand all 4 — Ukraine, Arctic, energy, Iran protection", tag: "DIP", e: { credibility: -11, global: -8, nato: 6, oligarch: -5 }, o: "You have overplayed. US refuses. EU refuses. China does not care. You walk away with nothing but enemies.", type: "bad" }, { l: "Stay permanently ambiguous — the auction never closes", tag: "DIP", e: { credibility: 9, global: 6, oligarch: 6, nato: 0, economy: 5 }, o: "Never close the auction. Every actor must court you forever. Most strategically durable outcome.", type: "good" }, { l: "Peace conference broker — architect of the ceasefire", tag: "DIP", e: { credibility: 15, global: 12, nato: -10, economy: 8, oligarch: 8 }, o: "Russia hosts ceasefire talks in Moscow. Both sides grudgingly accept. History remembers the broker.", type: "good" }] },
  ],
  north_korea: [
    { a: 1, t: "Two Superpowers Calling — Run the Auction", b: "Two calls waiting. Washington: 2M MT food plus $4.2B sanctions relief if quiet. Beijing: fuel (3 months), Hwasong-18 guidance upgrade, formal security guarantee if you coordinate. General Pak is watching. 3.2 million face starvation. Hwasong-18 is ready.", i: "Food crisis: 3.2M at risk. Fuel: 35-day reserve. Any DPRK move splits US attention 25-30%. Auction value decreases as crisis resolves.", c: [{ l: "Take Washington's offer — food plus sanctions relief, stand-down", tag: "DIP", e: { economy: 16, domestic: 13, kim: -5, credibility: 9, military: -3, food: 20 }, o: "People are fed. Generals grumble. US relaxes Korea watch. Regime stability bought at cost of military prestige.", type: "good" }, { l: "Take Beijing's offer — fuel plus upgrade plus security guarantee", tag: "MIL", e: { military: 16, economy: 9, kim: 11, credibility: -11, global: -13, fuel: 25 }, o: "PLA coordination activated. US attention splits 25%. Military loyal and fueled. You are now China's instrument.", type: "neutral" }, { l: "Run the auction — take food from US, fuel from China, commit to neither", tag: "DIP", e: { economy: 21, kim: 6, credibility: -5, global: -3, food: 15, fuel: 15 }, o: "Brilliant if it holds. Both sides angry. Both keep paying for 10 days before they compare notes.", type: "good" }, { l: "Reject both — test-fire Hwasong-18 over Japan immediately", tag: "MIL", e: { military: 19, credibility: -16, global: -21, kim: 16, food: -8, fuel: -8 }, o: "Tokyo emergency alert. Both call within 4 minutes. Your leverage just tripled — your food and fuel crisis just worsened.", type: "neutral" }, { l: "Demand written security guarantees from BOTH sides first", tag: "DIP", e: { credibility: 6, kim: 9, global: 6, food: -5 }, o: "Sophisticated play. Both sides engage seriously. Diplomatic status elevated.", type: "good" }] },
    { a: 1, t: "Fuel Crisis — 35-Day Reserve Running Out", b: "Logistics commander: fuel reserves at 35 days. KPA's DMZ forward deployment burns fuel at 3x peacetime rate. KPN submarine force needs fuel within 20 days or becomes combat-ineffective. Artillery brigade at 60% fuel.", i: "Military fuel: 35-day reserve. KPN subs: 20-day deadline. KPA artillery: 60% fuel now.", c: [{ l: "Request emergency fuel from China — accept dependency", tag: "LOG", e: { fuel: 25, supply: 10, credibility: -5, kim: 5 }, o: "China delivers 90-day fuel reserve in 72 hours. Price: 15,000 NK workers for Chinese infrastructure.", type: "neutral" }, { l: "Scale back forward deployment — reduce fuel burn", tag: "LOG", e: { fuel: 15, military: -8, kim: -5 }, o: "Fuel crisis eased. Generals grumble. General Pak marks this as weakness.", type: "neutral" }, { l: "Accept US fuel-for-denuclearization-talks offer", tag: "DIP", e: { fuel: 20, credibility: 8, economy: 5, kim: -8, military: -5 }, o: "US delivers limited fuel in exchange for IAEA talks. Historic first engagement. Generals furious.", type: "neutral" }, { l: "Seize South Korean fishing vessels — extort fuel", tag: "MIL", e: { fuel: 10, credibility: -15, global: -12, kim: 8 }, o: "Seoul quietly provides fuel to get vessels back. Media discovers in 3 weeks.", type: "bad" }, { l: "Emergency domestic rationing — civilians sacrifice for military", tag: "LOG", e: { fuel: 18, food: -8, domestic: -10, kim: 3 }, o: "Civilian fuel ration halved. Military reserves extended 20 days. Public anger builds.", type: "neutral" }] },
    { a: 2, t: "General Pak's Ultimatum — Coup Risk", b: "General Pak Jongsu, 2nd Corps Commander, submitted a formal assessment: The window to demonstrate DPRK's strategic relevance is closing. I request action authorization within 10 days. He has loyalty of 4 corps commanders and the Strategic Rocket Forces Chief.", i: "4 corps = 120,000 troops at DMZ. Strategic Rocket Forces Chief controls ICBMs. Coup risk activates below 60% Kim loyalty.", c: [{ l: "Authorize limited DMZ provocation — satisfy the generals", tag: "MIL", e: { military: 9, kim: 16, credibility: -9, global: -11, food: -6, fuel: -5 }, o: "KPA advances patrol positions 2km. Seoul mobilizes. USFK DefCon 3. Generals satisfied.", type: "neutral" }, { l: "Promote Pak — Supreme Commander title, neutralize with honor", tag: "DIP", e: { kim: 11, military: -3, credibility: 4 }, o: "Classic neutralization. Pak accepts the honor. Coup risk neutralized.", type: "good" }, { l: "Arrest Pak for treason — iron control", tag: "MIL", e: { kim: 19, military: -5, credibility: -5, domestic: -11 }, o: "Generals fall in line. Two corps commanders quietly contact each other. Fear-based loyalty has a half-life.", type: "neutral" }, { l: "Give Pak command of missile test — let him be the escalation face", tag: "MIL", e: { kim: 13, military: 9, credibility: -11, global: -13, fuel: -3 }, o: "Pak oversees a Hwasong-17 test. Generals ecstatic. Both superpowers call with new offers.", type: "neutral" }, { l: "Secret authorization: Pak plans but does not execute yet", tag: "DIP", e: { kim: 8, military: 5, credibility: 2 }, o: "Pak feels included. Planning begins. Execution deferred. 2 weeks bought.", type: "good" }] },
    { a: 2, t: "Food Crisis — 3.2 Million at Starvation Risk", b: "WFP assessment smuggled in: 3.2 million face acute starvation this quarter. Grain reserves at 14% of normal. Hamgyong Province has reported starvation deaths. Military gets priority rations. Kim loyalty correlates directly to food security.", i: "Kim loyalty: -8 per 10% food security drop. Military rations protected for 15 more days.", c: [{ l: "Accept emergency UN humanitarian access — WFP enters DPRK", tag: "DIP", e: { food: 26, credibility: 11, kim: -5, global: 9 }, o: "WFP enters DPRK. People are fed. Security agencies see a dangerous precedent.", type: "good" }, { l: "China emergency food loan — 10,000 NK workers for construction", tag: "ECO2", e: { food: 19, economy: 5, kim: 6, credibility: -3 }, o: "China delivers. Workers depart for Manchuria. Sovereignty partially compromised. People eat.", type: "neutral" }, { l: "Military prioritization — army eats, civilians halved again", tag: "MIL", e: { food: -16, kim: 9, military: 5, domestic: -21 }, o: "Military loyalty secured. Civilian deaths continue. Long-term regime fragility accelerating.", type: "bad" }, { l: "Extort South Korea — food aid or we shell Yeonpyeong Island", tag: "MIL", e: { food: 11, credibility: -16, global: -16, military: 9, kim: 11, fuel: -3 }, o: "Seoul quietly delivers 800,000 tons of rice. Media discovers in 2 months.", type: "neutral" }, { l: "Broadcast food shortage — solicit global humanitarian aid", tag: "DIP", e: { food: 14, credibility: 5, global: 8, domestic: 5, kim: -3 }, o: "International community responds with $800M in aid. Kim's narrative complicated. Millions fed.", type: "neutral" }] },
    { a: 3, t: "Hwasong-18 Readiness — Window or Warning?", b: "Strategic Rocket Forces commander delivered a readiness briefing: Hwasong-18 ICBM at full combat readiness. Three targeting packages prepared: Guam (Andersen AFB, 60 B-52s plus B-21s), Okinawa (US Marine assets), Japanese mainland (psychological maximum).", i: "Guam strike: eliminates 60% US Pacific air power. Retaliation probability if launched: 80% within 24hrs. Window: 5-7 days.", c: [{ l: "Announce Guam targeting achieved — maximum threat without launch", tag: "MIL", e: { military: 13, credibility: -13, global: -16, kim: 16 }, o: "Both superpowers call within 6 minutes. Leverage at absolute maximum. Do not fire — just aim publicly.", type: "good" }, { l: "Test-fire toward Guam — intentional ocean splash 200km short", tag: "MIL", e: { military: 11, credibility: -16, global: -21, kim: 13, fuel: -5 }, o: "Missile splashes 200km from Guam. Tokyo and Seoul emergency alerts. Emergency talks begin.", type: "neutral" }, { l: "Stand down — accept US emergency concessions offer", tag: "DIP", e: { food: 16, economy: 13, credibility: 9, kim: -5, military: -8 }, o: "US offers 3M tons food, $8B asset unfreeze, removal from State Sponsor of Terrorism list.", type: "good" }, { l: "Sell targeting data to China — give them the Guam strike option", tag: "INT", e: { proxy: 12, economy: 8, credibility: -8, kim: 5 }, o: "China receives Guam targeting data. Strategic gift. But you have given away your most valuable intelligence asset.", type: "neutral" }] },
    { a: 3, t: "Military Resupply Crisis — KPA Cannot Sustain This", b: "Logistics command critical alert: KPA's forward DMZ deployment burns supplies at 5x peacetime. Ammunition at 45%. Fuel for 4th Corps artillery runs out in 12 days. Without resupply, the credible threat collapses.", i: "KPA 4th Corps: 12-day fuel remaining. Ammunition: 45%. Without resupply in 12 days, forward threat posture collapses.", c: [{ l: "Emergency China resupply — accept any terms Beijing offers", tag: "LOG", e: { supply: 18, fuel: 20, credibility: -8, kim: 8, proxy: -5 }, o: "China delivers emergency resupply within 4 days. Price: NK agrees to stand down after crisis.", type: "neutral" }, { l: "Extort South Korea — resupply or we advance the patrol line", tag: "LOG", e: { supply: 12, fuel: 12, credibility: -15, global: -14, kim: 10 }, o: "Seoul complies quietly. Fuel and food delivered. International condemnation when it leaks.", type: "neutral" }, { l: "Scale back deployment — reduce fuel burn", tag: "LOG", e: { fuel: 15, supply: 8, military: -10, kim: -8 }, o: "Fuel crisis eased. Generals furious. General Pak escalates internal pressure campaign.", type: "neutral" }, { l: "Negotiate US resupply for denuclearization-talks pipeline", tag: "DIP", e: { supply: 14, fuel: 12, credibility: 8, kim: -6, economy: 6 }, o: "US provides limited resupply in exchange for IAEA observer agreement.", type: "good" }, { l: "Operational pause — all forces stand down for maintenance", tag: "LOG", e: { fuel: 20, supply: 15, credibility: -5, kim: -5, military: -5 }, o: "Maintenance pause announced. Fuel crisis averted. Leverage reduced. Force preserved.", type: "good" }] },
    { a: 4, t: "Joint China-NK Military Coordination Offer", b: "Beijing sent a CMC officer with a classified proposal: synchronized military operations. China's amphibious D-Day is T-minus 14 days. If NK activates the DMZ simultaneously, US attention splits. China offering: 6 months fuel, 200,000 tons food, mutual defense treaty. Price: locked into China's timeline.", i: "Joint operation: increases China's D-Day success from 58% to 74%. NK commitment: DMZ activation on Day 14.", c: [{ l: "Accept joint operation — commit to Day 14 DMZ activation", tag: "MIL", e: { military: 14, kim: 12, credibility: -12, global: -16, fuel: 20, food: 15 }, o: "Joint operation activated. China's success probability rises. But if it fails, NK is exposed.", type: "neutral" }, { l: "Accept the supplies — decline the timeline commitment", tag: "DIP", e: { food: 18, fuel: 18, credibility: -3, kim: 8 }, o: "Supplies accepted. Timeline rejected. China frustrated but delivers anyway.", type: "good" }, { l: "Counter-demand: mutual defense treaty signed by Xi personally", tag: "DIP", e: { credibility: 6, kim: 10, global: 3, fuel: 8 }, o: "Xi signs. First formal China-NK mutual defense treaty since the 1960s. Historic.", type: "good" }, { l: "Reject China — make counteroffer to the US instead", tag: "DIP", e: { credibility: 8, economy: 10, fuel: 10, food: 12, kim: -5 }, o: "US responds with a significant package. You have used China's offer to extract more from Washington.", type: "good" }] },
    { a: 5, t: "The Guam Decision — Final Card", b: "Strategic Rocket Forces commander confirmed targeting solution on Andersen AFB Guam — 60 B-52s, 12 B-21 Raiders. A strike cripples US Pacific air power for 18 months. Also triggers the most dangerous 24 hours since the Cuban Missile Crisis. Decision window: 4 hours.", i: "Guam strike success: 84%. US retaliation within 24hrs: 80%. DPRK military destroyed in retaliation: 60-80%. Regime survival post-retaliation: 35%.", c: [{ l: "Strike Guam — maximum escalation, accept retaliation risk", tag: "STR", strike: true, e: { military: 21, credibility: -42, global: -42, kim: 11, food: -22, domestic: -32 }, o: "Andersen AFB destroyed. US retaliates within 4 hours. DPRK military largely eliminated. History judges this audacity or suicide.", type: "bad" }, { l: "Announce Guam targeting achieved publicly — threat without launch", tag: "MIL", e: { military: 13, credibility: -13, global: -16, kim: 16 }, o: "Both superpowers call within 6 minutes. Do not fire — just aim publicly.", type: "good" }, { l: "Accept emergency US concessions — stand down", tag: "DIP", e: { food: 16, economy: 13, credibility: 9, kim: -5, military: -8 }, o: "US delivers massive concessions. Generals disappointed. Regime survives and thrives.", type: "good" }, { l: "Test-fire toward Guam — ocean splash 200km short", tag: "MIL", e: { military: 10, credibility: -16, global: -21, kim: 12, fuel: -5 }, o: "Maximum psychological pressure without triggering retaliation. Emergency talks begin.", type: "neutral" }] },
    { a: 6, t: "Kim's Legacy — What Does North Korea Look Like After?", b: "Taiwan crisis concluding. You have survived, extracted concessions, maintained regime stability through food and fuel crises, and demonstrated DPRK's nuclear capability. The highest strategic moment in DPRK history since 1953.", i: "Ending determined by: kim, food, economy, military, credibility.", c: [{ l: "Declare Supreme Victory — DPRK deterred two superpowers", tag: "DIP", e: { kim: 21, credibility: 11, domestic: 16, global: 6 }, o: "State media at maximum output. Kim's strategic genius narrative complete.", type: "good" }, { l: "Negotiate permanent denuclearization — historic normalization", tag: "DIP", e: { credibility: 26, global: 26, food: 21, economy: 21, kim: -5 }, o: "Nixon-to-China moment. Nobel Prize discussions. North Korea joins the global community.", type: "good" }, { l: "Accelerate nuclear program — test 7th nuclear device", tag: "MIL", e: { military: 16, kim: 16, credibility: -16, global: -21, food: -11, fuel: -8 }, o: "7th nuclear test conducted. Both superpowers increase sanctions. People pay the price.", type: "neutral" }, { l: "Begin Kim Ju-ae succession preparation", tag: "DIP", e: { kim: 9, domestic: 9, credibility: 4, stability: 11 }, o: "Kim Ju-ae publicly elevated. Dynasty's continuity secured.", type: "neutral" }, { l: "Extract final concessions — denuclearization talks for $50B package", tag: "DIP", e: { credibility: 15, economy: 18, food: 12, fuel: 10, kim: 5 }, o: "$50B in aid and investment committed. Denuclearization talks begin.", type: "good" }] },
  ],
  asean: [
    { a: 1, t: "ASEAN Emergency Summit — Fracturing in Real Time", b: "Emergency summit called. Philippines plus Vietnam: US alignment. Malaysia plus Indonesia: Neutral — 42% of exports to China. Singapore: playing both sides. Thailand: missing entirely. China's $80B offer expires 72 hours. US security guarantee window: 48 hours.", i: "Bloc unity determines your leverage in ALL future decisions. Currency crisis: ringgit -22%, rupiah -26%.", c: [{ l: "Formal US alignment — invoke ASEAN-US Enhanced Defense Cooperation", tag: "DIP", e: { credibility: 13, global: 9, military: 11, economy: -13, unity: -16 }, o: "Philippines and Vietnam ecstatic. Malaysia walks out. Indonesia files formal protest. China announces counter-measures.", type: "neutral" }, { l: "Formal neutrality — ASEAN as sovereign non-aligned bloc", tag: "DIP", e: { credibility: 9, global: 16, economy: 5, unity: 13, malacca: 6 }, o: "Both superpowers accept. Malacca leverage preserved. No military exposure.", type: "good" }, { l: "Accept China's $80B infrastructure offer — economic alignment", tag: "ECO2", e: { economy: 21, credibility: -11, global: -9, unity: -9, malacca: -6 }, o: "Indonesia and Malaysia satisfied. Philippines formally requests US bilateral treaty.", type: "neutral" }, { l: "Propose ASEAN-chaired peace talks — Kuala Lumpur ceasefire venue", tag: "DIP", e: { credibility: 16, global: 19, unity: 11, economy: 3 }, o: "Both sides accept within 24 hours. ASEAN is suddenly the most important diplomatic venue on Earth.", type: "good" }, { l: "Emergency ASEAN leaders call — 48 hours to forge bloc position", tag: "DIP", e: { credibility: 5, global: 5, unity: 8, economy: -2 }, o: "Leaders convene by video. Hard-fought compromise: ASEAN takes neutrality with economic conditionality.", type: "neutral" }] },
    { a: 1, t: "Malacca Strait — Your Most Powerful Card", b: "Singapore PM Lee calls at 2am: We can close Malacca. Hurts China most — fuel imports drop 62%. But also hits US logistics 30%, spikes oil $35/bbl, and Malaysia's PM says he'll resign if we close without his vote. PLAN pre-positioned SAG at southern entrance.", i: "Malacca closure: China fuel -62% in 14 days. US logistics plus 9-day rerouting. Oil plus $35/bbl.", c: [{ l: "Full closure — both sides barred, ASEAN enforces collectively", tag: "MIL", e: { malacca: 21, credibility: 16, global: 13, economy: -16, unity: -6 }, o: "Both superpowers furious simultaneously. Oil spikes to $180/bbl. ASEAN taken seriously for first time in 50-year history.", type: "neutral" }, { l: "Selective closure — China barred, US and allies permitted", tag: "MIL", e: { malacca: 16, credibility: 9, economy: -21, unity: -13, global: 0 }, o: "China's fuel crisis accelerates. China announces sanctions on all 10 ASEAN members simultaneously.", type: "neutral" }, { l: "Malacca as bargaining chip — ceasefire in 7 days or closure activates", tag: "DIP", e: { malacca: 11, credibility: 19, global: 16, unity: 9, economy: 5 }, o: "Brilliant coercive diplomacy. Both sides rush to the table. ASEAN creates a real deadline.", type: "good" }, { l: "Keep Malacca open — economic disruption too high", tag: "ECO2", e: { economy: 9, malacca: -6, credibility: -9, global: -5, unity: 5 }, o: "Trade revenue preserved. Biggest leverage card surrendered. China moves patrol line 20km south.", type: "neutral" }] },
    { a: 2, t: "ASEAN Military Logistics Gap — No Unified Command", b: "Defense ministers report: ASEAN has no unified military supply chain, no joint logistics command, no coordinated fuel reserve. If hostilities reach ASEAN waters, each navy operates independently with 20-28 day supply windows.", i: "ASEAN military effectiveness: 45% of potential if unified. Combined supply reserve: 22 days.", c: [{ l: "Emergency ASEAN Joint Logistics Command — Singapore anchors it", tag: "LOG", e: { supply: 18, military: 12, unity: 10, economy: -8, chest: -8 }, o: "Singapore commits logistics infrastructure. First unified ASEAN military logistics in history.", type: "good" }, { l: "Bilateral logistics with US — EDCA-based supply chain", tag: "LOG", e: { supply: 14, military: 10, unity: -8, economy: -3 }, o: "Philippines and Vietnam get US logistics support. Malaysia and Indonesia refuse.", type: "neutral" }, { l: "Emergency supply purchase from Australia — neutral procurement", tag: "LOG", e: { supply: 12, fuel: 10, chest: -10, credibility: 5 }, o: "Australia provides fuel, munitions, food through commercial contracts. Neutral. Expensive. Works.", type: "neutral" }, { l: "Accept China's logistics support — supplies with strings", tag: "LOG", e: { supply: 15, fuel: 12, unity: -10, credibility: -8, malacca: -5 }, o: "China provides logistics to Malaysia and Indonesia navies. The adversary fills the gap.", type: "bad" }, { l: "Prioritize Malacca defense — concentrate all resources at the chokepoint", tag: "LOG", e: { supply: 8, malacca: 12, military: 5, unity: 5, economy: -5 }, o: "Malacca defense fully resourced. Other ASEAN naval fronts deprioritized.", type: "neutral" }] },
    { a: 2, t: "Vietnam-Philippines Bilateral US Deal — Bloc or Bust?", b: "Philippines and Vietnam negotiated a bilateral US security arrangement without ASEAN approval. US warships rotating through Subic Bay and Cam Ranh Bay. Indonesia is furious. Singapore PM's private note: The bloc survives if you absorb this. It dies if you fight it.", i: "If ASEAN cannot contain the bilateral, Malaysia and Indonesia will seek bilateral arrangements with China — ending the bloc permanently.", c: [{ l: "Endorse the bilateral — formalize under ASEAN umbrella", tag: "DIP", e: { credibility: 11, global: 9, unity: -11, military: 9, economy: -5 }, o: "You co-opt the bilateral. ASEAN remains nominally unified. Indonesia dissents loudly but stays.", type: "neutral" }, { l: "Emergency leaders summit — force a bloc decision by vote", tag: "DIP", e: { unity: 16, credibility: 9, global: 5, economy: -3 }, o: "All 10 leaders convene. 3-day marathon. Hard-fought compromise. Bloc survives with new rules.", type: "good" }, { l: "Negotiate parallel China-Malaysia bilateral to balance", tag: "DIP", e: { economy: 11, credibility: -5, unity: -9, global: -5 }, o: "ASEAN formally split: Philippines/Vietnam/Singapore with US vs Malaysia/Indonesia with China.", type: "neutral" }, { l: "Invoke ASEAN Charter — formally censure the Philippines", tag: "DIP", e: { credibility: -9, unity: 5, global: -5, military: -5 }, o: "Philippines ignores the censure. Vietnam refuses to sign. ASEAN authority further undermined.", type: "bad" }] },
    { a: 3, t: "Currency Crisis — Your Economies Are Drowning", b: "Day 10. Ringgit -22%, Rupiah -26%, Peso -18%, Dong -15%. Foreign reserves burning at $8B/week. China offering yuan swaps individually — at the cost of ASEAN alignment.", i: "Malaysia's PM: We cannot hold this alignment if our economy collapses. Indonesia has already taken a meeting with the Chinese ambassador.", c: [{ l: "Unified ASEAN Currency Defense Fund — Singapore and Thailand anchor it", tag: "FIN", e: { economy: -5, unity: 21, credibility: 11, global: 9, malacca: 5 }, o: "Singapore commits $80B, Thailand $30B. ASEAN demonstrates financial solidarity.", type: "good" }, { l: "Accept US dollar stabilization — strategic alignment as the price", tag: "FIN", e: { economy: 14, credibility: 5, global: 5, unity: -5, malacca: 3 }, o: "Dollar pegs stabilize currencies within 48 hours. US strategic influence increases structurally.", type: "neutral" }, { l: "Accept China yuan swaps — let each country decide", tag: "FIN", e: { economy: 11, credibility: -5, global: -5, unity: 3, malacca: -5 }, o: "Currencies stabilize. Each country individually aligned with China's financial system.", type: "neutral" }, { l: "Emergency IMF SDRs — neutral, multilateral", tag: "FIN", e: { economy: 8, credibility: 5, global: 9, unity: 8 }, o: "IMF fast-tracks $55B in SDRs. Clean. Takes 2 weeks. Vietnam and Philippines stabilized.", type: "good" }, { l: "ASEAN emergency fiscal coordination — tax China-linked assets", tag: "FIN", e: { economy: 6, unity: 12, credibility: 8, global: 5, malacca: 3 }, o: "Coordinated fiscal response across all members. Small but demonstrative.", type: "good" }] },
    { a: 4, t: "PLAN Enters Malacca — Military Standoff Now", b: "PLAN Shandong carrier group plus 14-vessel SAG moved into southern Malacca approach. Singapore RSS at combat alert. Indonesia TNI-AL mobilizing. Malaysia frozen pending political authorization. US asking you to formally deny China transit rights.", i: "PLAN SAG: Shandong plus 14 vessels plus 2 submarines. Combined ASEAN naval force: 47 vessels. PLAN wins direct engagement. ASEAN plus US wins diplomatically.", c: [{ l: "Joint ASEAN-US Malacca Defense Coalition — all 5 navies plus US escort", tag: "MIL", e: { military: 16, credibility: 11, economy: -11, unity: -5, malacca: 16 }, o: "All 5 navies activate. US destroyers enter Malacca alongside ASEAN ships. PLAN backs down after 18 hours.", type: "good" }, { l: "UNCLOS emergency filing — legal challenge to PLAN", tag: "DIP", e: { credibility: 11, global: 9, malacca: 9, unity: 5 }, o: "ICJ grants provisional order within 36 hours. PLAN transit continues but is now internationally illegal.", type: "good" }, { l: "Negotiate Malacca Transit Framework — civilian yes, military notification required", tag: "DIP", e: { credibility: 11, global: 9, malacca: 9, unity: 5 }, o: "PLAN accepts notification framework. Standoff deescalated with face-saving compromise.", type: "good" }, { l: "Prepare Malacca mining as escalation option", tag: "MIL", e: { military: 8, malacca: 8, credibility: 5, unity: 3, economy: -5 }, o: "Mining preparation begins. PLAN intelligence detects it. They slow their approach.", type: "neutral" }, { l: "Allow PLAN transit — avoid confrontation, protect economies", tag: "MIL", e: { economy: 5, credibility: -13, malacca: -11, military: -5, unity: -9 }, o: "PLAN transits. China moves patrol line 30km south. ASEAN demonstrated it will not enforce sovereignty.", type: "bad" }] },
    { a: 5, t: "Post-War Economic Recovery — ASEAN's Survival Plan", b: "Day 22. Military confrontation passing but ASEAN economies devastated. Total damage: $840B across the bloc. Three proposals: China-funded BRI recovery, US-backed economic architecture, or independent ASEAN recovery fund.", i: "China BRI plus $200B pro-China strings. US Marshall Plan plus $150B strategic alignment. ASEAN independent $80B no strings.", c: [{ l: "ASEAN Independent Recovery Fund — no external strings", tag: "FIN", e: { economy: 10, unity: 18, credibility: 14, chest: -12, global: 8 }, o: "ASEAN finances its own recovery. Smaller and slower. But bloc emerges with genuine economic sovereignty.", type: "good" }, { l: "Accept China BRI Recovery Package — $200B in reconstruction", tag: "ECO2", e: { economy: 21, unity: -5, credibility: -8, malacca: -5, global: -5 }, o: "Economic windfall. BRI 2.0 transforms ASEAN infrastructure. Political independence quietly eroded.", type: "neutral" }, { l: "US Recovery Architecture — $150B with strategic alignment", tag: "ECO2", e: { economy: 16, credibility: 8, global: 8, unity: -8, malacca: 3 }, o: "US-backed recovery accelerates. ASEAN economies stabilize quickly. Strategic alignment now visible.", type: "neutral" }, { l: "Mixed approach — partial BRI plus partial US plus ASEAN bond issuance", tag: "FIN", e: { economy: 14, unity: 5, credibility: 6, global: 4, chest: -5 }, o: "Pragmatic hedge. ASEAN maintains leverage with both superpowers.", type: "good" }] },
    { a: 6, t: "ASEAN Endgame — The Bloc's Place in the New World", b: "Taiwan crisis winding down. ASEAN has been the most consequential neutral actor — or has fractured into bilaterals. The two superpowers need ASEAN's endorsement for any settlement to be legitimate.", i: "Ending determined by: unity, malacca, economy in that order.", c: [{ l: "ASEAN Economic and Security Sovereignty Pact — neither bloc", tag: "ECO2", e: { economy: 16, unity: 16, credibility: 13, global: 11, malacca: 6 }, o: "Historic. ASEAN declares permanent economic and security independence. A genuine third pole in global geopolitics.", type: "good" }, { l: "Join US-led Democratic Pacific Arc formally", tag: "DIP", e: { credibility: 11, military: 11, economy: -5, unity: -11, global: 9 }, o: "Security guaranteed by US nuclear umbrella. China relationship permanently altered.", type: "neutral" }, { l: "Accept China's post-crisis BRI Renewal — $200B", tag: "ECO2", e: { economy: 21, credibility: -9, unity: 5, malacca: -5, global: -5 }, o: "Economic windfall. BRI 2.0 transforms ASEAN infrastructure. Political independence quietly eroded.", type: "neutral" }, { l: "Propose permanent ASEAN-chaired Asia-Pacific Forum", tag: "DIP", e: { credibility: 19, global: 21, unity: 19, economy: 5, malacca: 11 }, o: "Visionary. ASEAN creates the defining multilateral institution of the 21st century and permanently chairs it.", type: "good" }, { l: "Demand ASEAN Security Council seat as price of endorsing settlement", tag: "DIP", e: { credibility: 14, global: 16, unity: 14, economy: 3, malacca: 8 }, o: "Bold ask. US supports it. China agrees reluctantly. ASEAN gets formal institutional power.", type: "good" }] },
  ],
  eu: [
    { a: 1, t: "Emergency Council — 27 Nations, Zero Consensus", b: "Germany: 200B in China exports. Baltic states: Maximum pressure NOW. France: EU must lead mediation. Poland: activating eastern flank. Hungary: blocking the agenda. ECB warns: recession threshold Day 45.", i: "China halted rare earths to 8 EU members. Every day without consensus costs 4B in market uncertainty.", c: [{ l: "Maximum sanctions — full economic decoupling, override Hungary via QMV", tag: "ECO2", e: { credibility: 19, economy: -26, global: 11, unity: -18, leverage: 15 }, o: "Historic unanimity minus Hungary. China retaliates — rare earth crisis begins.", type: "neutral" }, { l: "Targeted financial plus tech sanctions — preserve trade", tag: "ECO2", e: { credibility: 9, economy: -7, global: 6, unity: 6, leverage: 10 }, o: "Compromise achieved. Germany satisfied. Baltics grudgingly accept.", type: "good" }, { l: "Formal EU neutrality — position as indispensable mediator", tag: "DIP", e: { credibility: -2, global: 19, economy: 6, unity: 11, leverage: 18 }, o: "EU positions as the only neutral great power. Both sides accept. Brussels suddenly the most important city.", type: "good" }, { l: "QMV override on Hungary — force maximum sanctions", tag: "ECO2", e: { credibility: 6, unity: -22, economy: -11, global: 6, leverage: 8 }, o: "Unprecedented. Hungary threatens to veto every EU measure for 5 years. Legal crisis within the EU itself.", type: "bad" }, { l: "Flexible coordination — member states act individually", tag: "DIP", e: { credibility: -6, unity: 9, economy: -3, global: 4, leverage: 3 }, o: "EU holds internally. Looks divided externally. France on arms. Germany on finance. Baltics on full sanctions.", type: "neutral" }] },
    { a: 2, t: "US Demands EU Military Commitment", b: "Washington formally requested EU naval assets in the Taiwan Strait. France's Charles de Gaulle is 18 days transit from theater. Paris will deploy — for a price: EU gets co-veto on escalation decisions. Germany says any deployment must go through EU Council vote.", i: "Charles de Gaulle: 18 days transit. EU military contribution would shift coalition dynamics significantly.", c: [{ l: "Accept France's price — EU gets Indo-Pacific co-veto, deploy Charles de Gaulle", tag: "MIL", e: { credibility: 11, military: 13, global: 6, unity: -8, leverage: 22 }, o: "Historic. EU carrier in the Taiwan Strait in 18 days. France gets what it wanted.", type: "good" }, { l: "Logistical and intelligence support only — no combat role", tag: "MIL", e: { credibility: 5, military: 4, unity: 6, leverage: 9 }, o: "Safe. EU provides refueling, intelligence sharing, logistics. No combat exposure.", type: "neutral" }, { l: "Refuse military contribution — pure mediator role only", tag: "DIP", e: { credibility: -8, global: 11, unity: 13, leverage: 5 }, o: "EU preserves complete neutrality. Moral authority maximized. US privately furious.", type: "neutral" }, { l: "Offer German frigates only — avoid French carrier complications", tag: "MIL", e: { credibility: 6, military: 6, unity: 4, leverage: 8 }, o: "Bundestag votes 389-241 for deployment. 4 German frigates join the coalition.", type: "neutral" }] },
    { a: 3, t: "SWIFT Plus Saudi PetroYuan — Financial Chess Match", b: "US pushing for EU SWIFT coordination against China. But Saudi Arabia privately warned: if China is excluded from SWIFT, Riyadh will shift oil settlement to yuan. EU holds a unique card: both sides trust you to manage the financial settlement infrastructure.", i: "EU banks carry 24% of China's dollar-clearing. Without EU coordination, SWIFT impact reduced 60%. Saudi PetroYuan launch would destabilize EU financial reserves.", c: [{ l: "Full EU SWIFT coordination — join the US regardless of Saudi threat", tag: "FIN", e: { economy: -19, credibility: 13, global: 11, unity: -11, leverage: 16 }, o: "Historic economic weapon. Saudi Arabia follows through — $150B in oil settlement shifts to yuan.", type: "neutral" }, { l: "EU-controlled financial ceasefire mechanism — Brussels in the middle", tag: "FIN", e: { credibility: 11, leverage: 18, global: 13, economy: -4, unity: 5 }, o: "Innovative. EU creates a crisis financial instrument. Both sides must route emergency transactions through Brussels.", type: "good" }, { l: "Coordinate with Saudi Arabia — joint EU-Saudi financial neutrality", tag: "FIN", e: { credibility: 8, economy: 5, global: 8, leverage: 14, unity: 3 }, o: "EU and Saudi Arabia jointly refuse SWIFT escalation. Oil markets stabilize. Dollar protected.", type: "good" }, { l: "Partial SWIFT — military finance only, exempt energy and trade", tag: "FIN", e: { economy: -6, credibility: 7, global: 5, unity: 6, leverage: 9 }, o: "Surgical. Germany satisfied. Saudi Arabia satisfied. China still constrained on military finance.", type: "good" }] },
    { a: 4, t: "Arms Embargo — Parliament vs Council", b: "European Parliament passed non-binding resolution to lift EU arms embargo on Taiwan. Now the Council decides. France opposes (Airbus 8B contracts). Baltic states passionately support. Taiwan needs MBDA air defense systems immediately — US production backlogged 18 months.", i: "Only EU can deliver Taiwan air defense systems in time. China's red line: any EU arms transfer to Taiwan.", c: [{ l: "Lift embargo — authorize EU arms to Taiwan", tag: "MIL", e: { credibility: 12, military: 8, global: 5, unity: -12, economy: -5 }, o: "Unprecedented. MBDA systems en route to Taipei. China expels EU ambassadors.", type: "neutral" }, { l: "Allow third-country transit — Czech/Polish stockpiles via Japan", tag: "MIL", e: { credibility: 6, military: 5, unity: 3, leverage: 5 }, o: "Legal grey area exploited. Plausible deniability. Effective.", type: "good" }, { l: "Maintain embargo — use the threat as leverage", tag: "DIP", e: { credibility: 10, global: 12, leverage: 15 }, o: "Smart. China agrees to a Geneva ceasefire round. The threat did more than a transfer would.", type: "good" }, { l: "Full rejection — prioritize EU-China normalization", tag: "ECO2", e: { credibility: -18, economy: 8, unity: -8, global: -10 }, o: "Capitulation. Progressive member states threaten Council walkout.", type: "bad" }] },
    { a: 6, t: "Geneva Peace Conference — EU Chairs the World", b: "Both China and US accepted EU mediation. You are hosting talks in Geneva. Your draft: Permanent Ceasefire plus Autonomous Taiwan within Chinese Cultural Framework. 72 hours before both sides walk.", i: "This is the EU's moment. The framework's success defines the post-crisis international order.", c: [{ l: "Force signatures — push through the ambiguous framework", tag: "DIP", e: { credibility: 26, global: 32, leverage: 22, unity: 16, economy: 13 }, o: "Historic. Both sides sign. Ambiguity holds. Taiwan de facto independent indefinitely. EU's finest hour.", type: "good" }, { l: "SWIFT ultimatum — 48hrs to China or exclusion executes", tag: "FIN", e: { credibility: 13, economy: -5, global: 11, leverage: 16, unity: -3 }, o: "Financial coercion works. China signs basic ceasefire within 36 hours.", type: "good" }, { l: "Invite Taiwan's President to Geneva in person", tag: "DIP", e: { credibility: 16, global: 19, unity: -9, leverage: 8 }, o: "Taiwan's President arrives. China storms out — but returns 6 hours later. Precedent set.", type: "neutral" }, { l: "Pause — demand US-China bilateral first, EU facilitates", tag: "DIP", e: { credibility: 5, global: 8, unity: 6, leverage: -5 }, o: "Talks stall 3 weeks. EU loses the chair. Bilateral produces a worse deal.", type: "neutral" }] },
  ],
};

const FABLE_SCENARIO_EXPANSIONS: AnyRecord = {
  us_dem: [
    { a: 1, t: "Progressive Caucus Demands a War Powers Pledge", b: "A bloc of House progressives will support emergency funding only if the White House promises no kinetic action without either allied supermajority support or a UN vote. INDOPACOM warns that legal caution could become operational paralysis.", i: "The Fable reference framed this as the domestic price of coalition leadership: legitimacy buys endurance, but every guardrail slows deterrence.", c: [{ l: "Accept a five-ally consensus rule", tag: "DIP", e: { domestic: 10, coalition: 7, global: 5, military: -4, credibility: 4 }, o: "The supplemental survives. The war room gets constraints, but allied capitals trust the process.", type: "good" }, { l: "Keep presidential freedom of action", tag: "MIL", e: { military: 9, resolve: 8, domestic: -14, coalition: -4, credibility: 2 }, o: "The fleet gets speed. Congress gets angry. Cable news gets the rest of the evening.", type: "neutral" }, { l: "Trade the pledge for a larger funding bill", tag: "FIN", e: { chest: 8, military: 6, domestic: 5, credibility: -3 }, o: "A messy bargain passes. The footnotes are ugly, but the ships get fuel.", type: "neutral" }] },
    { a: 3, t: "War-Risk Insurance Freezes Commercial Lift", b: "Underwriters have withdrawn cover from civilian hulls entering the Western Pacific. Most of your logistics rides commercial ships. Without a guarantee, ammunition and parts sit safely on the wrong side of the ocean.", i: "Fable's logistics pool makes the point cleanly: money can solve logistics, but only if you spend before the shortage becomes readiness collapse.", c: [{ l: "State indemnity guarantee for critical cargo", tag: "FIN", e: { chest: -8, supply: 9, fuel: 4, coalition: 3 }, o: "The state becomes insurer of last resort. Hulls sail again, and accountants start sweating.", type: "good" }, { l: "Naval escort corridors", tag: "LOG", e: { supply: 7, military: 4, fuel: -5, global: -3 }, o: "Grey hulls bracket civilian shipping. It works, and everyone can see it working.", type: "neutral" }, { l: "Defer resupply and preserve cash", tag: "LOG", e: { supply: -9, military: -5, chest: 5 }, o: "You saved money by spending readiness. That bill comes due faster than expected.", type: "bad" }] },
  ],
  china: [
    { a: 1, t: "Politburo 4-3", b: "The Standing Committee is split: four members demand that the timetable hold regardless of cost, three want an off-ramp before sanctions bite. A leak would turn policy disagreement into a test of Xi's authority.", i: "The reference version gives China a race-against-time opening with real internal pressure, not just external deterrence.", c: [{ l: "Hold the timetable and tighten discipline", tag: "POL", e: { politburo: 8, resolve: 9, domestic: 5, economy: -6, global: -5 }, o: "The room falls in line. Markets do not. Nobody mistakes resolve for comfort.", type: "neutral" }, { l: "Authorize a private off-ramp channel", tag: "DIP", e: { politburo: -5, credibility: 6, global: 8, economy: 4, pla: -4 }, o: "Moderates breathe. Theater commanders complain. The exit door exists, quietly.", type: "good" }, { l: "Leak hawkish unity to frighten Taipei", tag: "INT", e: { credibility: 5, pla: 6, global: -9, economy: -4 }, o: "The leak lands. It also convinces investors that Beijing is choosing pain.", type: "neutral" }] },
    { a: 4, t: "Strike Window Over Dongsha", b: "Theater command asks permission to neutralize a radar complex and associated air-defense batteries. The military case is clean; the civilian-harm estimate is not.", i: "Adapted from Fable's strike council idea: a strike choice should be tempting, costly, and legible.", c: [{ l: "Authorize full strike package", tag: "STR", strike: true, e: { military: 18, pla: 8, global: -18, economy: -7, fuel: -5 }, o: "The corridor opens by force. Every foreign ministry in the region starts drafting at once.", type: "neutral" }, { l: "Cyber and electronic attack only", tag: "INT", e: { military: 8, credibility: 4, global: -3, pla: -2 }, o: "The screens go dark without craters. The army calls it half-measure; diplomats call it useful.", type: "good" }, { l: "Delay for a ceasefire probe", tag: "DIP", e: { global: 8, economy: 4, military: -6, pla: -6 }, o: "The window narrows. The room calms. Nobody is sure which mattered more.", type: "neutral" }] },
  ],
  russia: [
    { a: 1, t: "The Neutrality Auction", b: "Beijing offers a vast energy contract for neutrality-plus. Washington hints at phased sanctions relief for genuine restraint. Both sides think they are the only bidder.", i: "Russia's best Fable material is transactional: the player should feel the leverage and the danger of getting caught selling it twice.", c: [{ l: "Play both bids quietly", tag: "FIN", e: { economy: 10, oligarch: 8, credibility: -5, nato: 6 }, o: "The auction works until someone reads the other invoice.", type: "neutral" }, { l: "Take China's energy contract", tag: "ECO2", e: { economy: 15, chest: 8, nato: 10, global: -6 }, o: "Pipelines become policy. Europe notices the signature before the ink dries.", type: "neutral" }, { l: "Trade restraint for sanctions relief", tag: "DIP", e: { economy: 7, credibility: 9, nato: -8, oligarch: 3 }, o: "Washington hates rewarding you. That is how you know the offer has value.", type: "good" }] },
    { a: 3, t: "Arctic Convoy Shadowed", b: "A Russian fuel convoy bound for Chinese ports is being shadowed by a US submarine. Insurance rates surge, Beijing demands an escort, and the Kremlin sees both revenue and risk.", i: "A logistics event with Russian flavor: the convoy is cash flow, leverage, and a tripwire.", c: [{ l: "Escort openly with Pacific Fleet ships", tag: "MIL", e: { economy: 8, credibility: 6, nato: 8, fuel: -3 }, o: "The convoy arrives under a flag show. NATO planners add another red line to the board.", type: "neutral" }, { l: "Pause convoy and demand a premium", tag: "FIN", e: { chest: 10, economy: 4, credibility: -3, oligarch: 5 }, o: "Beijing pays for certainty. The delay says Moscow still controls the tap.", type: "good" }, { l: "Cancel and posture as mediator", tag: "DIP", e: { global: 9, credibility: 8, economy: -8, oligarch: -6 }, o: "The peacemaker costume fits poorly, but the room still lets you in.", type: "neutral" }] },
  ],
  north_korea: [
    { a: 1, t: "Food for Quiet", b: "Washington offers grain and limited sanctions relief if Pyongyang stays quiet. Beijing offers fuel and missile technology if you coordinate pressure. General Pak is counting corps commanders.", i: "Fable's North Korea opening is a survival bargain with coup risk under the table.", c: [{ l: "Accept food through a deniable channel", tag: "DIP", e: { food: 14, economy: 5, kim: -4, credibility: 3 }, o: "The warehouses fill. The generals ask why the Americans are feeding the nation.", type: "neutral" }, { l: "Take Beijing's fuel and missile package", tag: "MIL", e: { fuel: 14, military: 9, kim: 5, global: -8, food: -3 }, o: "Launch crews cheer. Farmers do not.", type: "neutral" }, { l: "Play both sides and purge Pak's network", tag: "POL", e: { kim: 12, domestic: -6, military: 5, food: -5, credibility: -4 }, o: "The palace is quieter by dawn. So are several barracks.", type: "bad" }] },
    { a: 4, t: "Missile Over Japan", b: "A Hwasong launch path over Japan would prove relevance, raise your price, and risk pulling US bombers away from Taiwan. It would also make every ally in the region less patient.", i: "War/strike text adapted from Fable: escalation as bargaining, not just spectacle.", c: [{ l: "Launch over Japan at high altitude", tag: "STR", strike: true, e: { military: 12, kim: 8, global: -14, food: -6, economy: -4 }, o: "The missile flies. Sirens answer. Your price rises, and so does the chance of a mistake.", type: "neutral" }, { l: "Conduct a coastal engine test instead", tag: "MIL", e: { military: 5, kim: 3, global: -4 }, o: "Enough signal for the generals. Not enough to empty Tokyo shelters.", type: "good" }, { l: "Announce restraint in exchange for aid verification", tag: "DIP", e: { food: 10, credibility: 6, global: 6, kim: -3 }, o: "Aid agencies enter under watch. Restraint becomes a commodity.", type: "good" }] },
  ],
  asean: [
    { a: 1, t: "Rotating Chair, Splitting Bloc", b: "Philippines and Vietnam want open US alignment. Malaysia and Indonesia want neutrality. Singapore is playing both boards. A leaked draft says ASEAN has forty-eight hours before members cut separate deals.", i: "This preserves the current ASEAN survival mode while importing Fable's sharper bloc-fracture pressure.", c: [{ l: "Emergency leaders summit with binding communique", tag: "DIP", e: { unity: 15, credibility: 8, economy: -3, malacca: 4 }, o: "Ten leaders stay in the room long enough to remember why ASEAN exists.", type: "good" }, { l: "Let members pursue bilateral security deals", tag: "DIP", e: { military: 8, unity: -12, economy: 3, credibility: -6 }, o: "Everyone gets flexibility. The bloc gets thinner.", type: "neutral" }, { l: "Declare strict neutrality and bar foreign basing", tag: "POL", e: { unity: 6, global: 5, military: -6, malacca: -4 }, o: "Neutrality calms some capitals and terrifies others.", type: "neutral" }] },
    { a: 3, t: "Currency Defense or Yuan Swaps", b: "Ringgit, rupiah, peso, and dong are all under pressure. China is offering bilateral yuan swap lines with political strings. The IMF can help, but not quickly enough to save every cabinet.", i: "Financial market event adapted from Fable's ASEAN currency crisis.", c: [{ l: "Create an ASEAN currency defense fund", tag: "FIN", e: { unity: 18, credibility: 10, economy: -4, chest: -8, malacca: 4 }, o: "Singapore and Thailand anchor the fund. ASEAN looks expensive, serious, and alive.", type: "good" }, { l: "Accept neutral IMF emergency SDRs", tag: "FIN", e: { economy: 8, global: 8, unity: 6, credibility: 4 }, o: "Clean, multilateral, slower than panic. Good enough to keep ministers seated.", type: "good" }, { l: "Let members take yuan swaps individually", tag: "FIN", e: { economy: 9, unity: -8, credibility: -6, malacca: -5 }, o: "Currencies stabilize while sovereignty leaks sideways.", type: "neutral" }] },
    { a: 4, t: "PLAN Enters the Malacca Approach", b: "A Chinese surface group is approaching southern Malacca. Singapore is at combat alert, Indonesia is mobilizing, and Malaysia is waiting for cabinet authorization.", i: "This is the strongest Fable ASEAN military beat: the chokepoint becomes the board.", c: [{ l: "Joint ASEAN-US escort coalition", tag: "MIL", e: { military: 14, malacca: 16, credibility: 9, unity: -5, economy: -8 }, o: "The ships form up. China slows. ASEAN has become a hard-power sentence.", type: "good" }, { l: "UNCLOS filing plus emergency notification regime", tag: "DIP", e: { credibility: 12, global: 10, malacca: 9, unity: 5 }, o: "Law moves faster than anyone expected. The transit is now politically expensive.", type: "good" }, { l: "Allow transit to avoid market panic", tag: "ECO2", e: { economy: 5, malacca: -12, credibility: -10, unity: -6 }, o: "Markets exhale. Sovereignty does not.", type: "bad" }] },
  ],
  un: [
    { a: 1, t: "Security Council Deadlock", b: "The first emergency session collapses into veto threats. Aid agencies need access, Taiwan wants recognition language, China wants sovereignty language, and Washington wants time.", i: "UN play is about threading legitimacy through impossible wording.", c: [{ l: "Draft humanitarian-only language", tag: "HUM", e: { hum: 10, p5: 4, global: 7, credibility: 4 }, o: "Nobody loves the text. That is why it passes the first procedural hurdle.", type: "good" }, { l: "Name aggression directly", tag: "POL", e: { credibility: 9, global: 4, p5: -10, hum: -3 }, o: "The speech is quoted everywhere. The convoy still waits.", type: "neutral" }, { l: "Move talks to a closed Geneva format", tag: "DIP", e: { p5: 8, credibility: 5, global: 5, hum: -2 }, o: "The cameras leave. The bargaining starts.", type: "good" }] },
    { a: 2, t: "Relief Corridor Bargain", b: "WFP, WHO, and ICRC can move supplies if both sides accept a notification corridor. The military commands fear it will become an intelligence channel.", i: "Logistics with UN flavor: convoys are not just supplies, they are legitimacy in motion.", c: [{ l: "Publish corridor manifests in real time", tag: "LOG", e: { hum: 13, credibility: 8, p5: 3, supply: 5 }, o: "Transparency lowers suspicion. It also makes every delay visible.", type: "good" }, { l: "Use neutral ASEAN ports as staging hubs", tag: "LOG", e: { hum: 10, global: 8, supply: 7, chest: -4 }, o: "Singapore and Jakarta become the humanitarian hinge of the crisis.", type: "good" }, { l: "Accept military inspection at both ends", tag: "MIL", e: { p5: 7, hum: -4, credibility: -3 }, o: "The corridor opens late and narrow. Every box has a witness.", type: "neutral" }] },
    { a: 5, t: "Ceasefire Window", b: "After weeks of pressure, both sides want a pause they can deny wanting. A monitored ceasefire could work if the UN can supply observers fast enough.", i: "Imported from Fable's endgame pool: ceasefire should be a phase, not a cutscene.", c: [{ l: "Deploy observer mission with ASEAN monitors", tag: "DIP", e: { credibility: 14, global: 12, hum: 8, p5: 4, chest: -5 }, o: "The mission is thin but real. A pause becomes a structure.", type: "good" }, { l: "Demand signatures before observers move", tag: "POL", e: { credibility: 6, p5: -5, hum: -6 }, o: "Legally tidy. Operationally late.", type: "bad" }, { l: "Accept ambiguous letters of assurance", tag: "DIP", e: { global: 10, hum: 9, credibility: -2, p5: 5 }, o: "The paperwork is ugly. The guns get quieter.", type: "neutral" }] },
  ],
};

const SUDDEN = [
  { id: "typhoon", icon: "🌀", t: "Super Typhoon Maksa — Cat 5", d: "Taiwan Strait impassable 72hrs. All naval ops suspended. Supply convoys halted.", e: { military: -8, stability: -5, economy: -3, fuel: -5 } },
  { id: "iran_hormuz", icon: "🛢️", t: "Iran Activates — Hormuz Warning Shots", d: "Iran naval assets near Hormuz. Oil spikes $35/bbl. 35% of world LNG at risk.", e: { economy: -12, fuel: -8, supply: -6 } },
  { id: "market", icon: "📉", t: "APAC Market Collapse — Circuit Breakers", d: "Hang Seng -26%, Nikkei -19%. $4.2T wiped. Global financial system under stress.", e: { economy: -18, chest: -12, stability: -8 } },
  { id: "nk_test", icon: "☢️", t: "NK Hwasong-18 Test — Over Japan", d: "ICBM overflies Japan. Tokyo emergency alert. B-52s scramble from Guam.", e: { military: -5, credibility: -8 } },
  { id: "defect", icon: "🎖️", t: "PLA Admiral Defects with Op Data", d: "Rear Admiral Li Mengxian defects with complete PLAN order of battle.", e: { military: 8, credibility: 8 } },
  { id: "tsmc", icon: "💻", t: "TSMC Production Halted", d: "Taiwan semiconductor supply to Apple, NVIDIA halted. Global tech supply chain collapsing.", e: { economy: -15, chest: -10, supply: -12 } },
  { id: "resupply_fail", icon: "📦", t: "Critical Resupply Convoy Attacked", d: "Logistics convoy intercepted. Fuel and munitions lost. Front-line units report critical shortage.", e: { military: -10, fuel: -12, supply: -10 } },
  { id: "deepfake", icon: "🎭", t: "Deepfake Nuclear Order — 900M Views", d: "AI-generated video of world leader ordering nuclear strikes goes viral. Three nations raise alert.", e: { credibility: -12, global: -10, stability: -8 } },
  { id: "japan_elect", icon: "🗳️", t: "Japan Snap Election — Coalition Collapses", d: "PM resigns. JSDF deployment authorization suspended for 6 weeks.", e: { military: -8, stability: -5 } },
  { id: "supply_interdict", icon: "🚢", t: "US Submarine Interdicts PLAN Convoy", d: "SSN Wolf Pack intercepts PLAN fuel convoy. Two PLAN destroyers damaged.", e: { supply: -14, fuel: -10 } },
  { id: "russia_escalate", icon: "⚡", t: "Russia Escalates — Kaliningrad ISKANDER Exercise", d: "Russian ISKANDER missiles begin exercises pointed at Warsaw. NATO goes to DEFCON equivalent.", e: { global: -10, credibility: -8 } },
  { id: "oil_spike", icon: "🛢️", t: "Oil Reaches $200/barrel — Global Recession Imminent", d: "Brent crude hits $200/bbl. IMF declares global recession has begun. Emergency G20 called.", e: { economy: -20, fuel: -10, chest: -8, stability: -10 } },
];

const SUDDEN_CRISIS_EFFECTS: AnyRecord = {
  typhoon: { shippingInsuranceCost: 8, foodInflation: 5, humanitarianDamage: 3 },
  iran_hormuz: { oilShock: 16, shippingInsuranceCost: 6, financialContagion: 4 },
  market: { financialContagion: 16, mediaPanic: 8, publicTrust: -5 },
  nk_test: { escalationLevel: 8, nuclearRisk: 12, mediaPanic: 6 },
  defect: { cyberDisruption: 3, mediaPanic: -3, allianceCohesion: 3 },
  tsmc: { semiconductorSupply: -18, financialContagion: 8, mediaPanic: 5 },
  resupply_fail: { shippingInsuranceCost: 10, escalationLevel: 5, warWeariness: 4 },
  deepfake: { cyberDisruption: 16, mediaPanic: 14, publicTrust: -8, nuclearRisk: 4 },
  japan_elect: { allianceCohesion: -12, globalStability: -5, mediaPanic: 5 },
  supply_interdict: { escalationLevel: 6, shippingInsuranceCost: 7, oilShock: 4 },
  russia_escalate: { escalationLevel: 10, nuclearRisk: 7, allianceCohesion: -5 },
  oil_spike: { oilShock: 18, financialContagion: 10, foodInflation: 6, globalStability: -6 },
};

function suddenEligible(e, crisis: StatMap) {
  if (e.id === "oil_spike") return crisis.oilShock >= 45 || crisis.financialContagion >= 50;
  if (e.id === "market") return crisis.financialContagion >= 38 || crisis.mediaPanic >= 45;
  if (e.id === "tsmc") return crisis.semiconductorSupply <= 65 || crisis.cyberDisruption >= 42;
  if (e.id === "deepfake") return crisis.cyberDisruption >= 35 || crisis.mediaPanic >= 50;
  if (e.id === "nk_test" || e.id === "russia_escalate") return crisis.escalationLevel >= 38 || crisis.nuclearRisk >= 30;
  if (e.id === "resupply_fail" || e.id === "supply_interdict") return crisis.shippingInsuranceCost >= 40 || crisis.escalationLevel >= 35;
  if (e.id === "iran_hormuz") return crisis.oilShock >= 36 || crisis.escalationLevel >= 45;
  return true;
}

function pickSuddenEvent(used: Set<string>, crisis: StatMap) {
  const available = SUDDEN.filter(e => !used.has(e.id));
  const reactive = available.filter(e => suddenEligible(e, crisis));
  const pool = reactive.length ? reactive : available;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

const LIFE_BASE_STATS: StatMap = { cash: 52, debt: 28, monthlyIncome: 55, jobSecurity: 58, careerCapital: 45, familyStability: 58, health: 72, stress: 34, morale: 62, foodSupply: 50, fuelAccess: 48, medicineAccess: 54, housingSecurity: 58, internetAccess: 72, legalRisk: 18, migrationReadiness: 34, reputation: 50, emergencyPreparedness: 42 };
const LIFE_SPAWNS: AnyRecord = {
  kl_pj: { id: "kl_pj", name: "Kuala Lumpur/PJ", note: "Family obligations, car dependence, and price shocks all matter.", stats: { cash: -2, debt: 4, fuelAccess: -5, familyStability: 5, housingSecurity: 3 }, markets: { food: 116, fuel: 144, rent: 112, medicine: 116, usd: 111, jobs: 60 } },
  singapore: { id: "singapore", name: "Singapore", note: "Orderly, expensive, resilient, and heavily watched.", stats: { cash: 8, monthlyIncome: 8, housingSecurity: -6, internetAccess: 8, legalRisk: -4 }, markets: { food: 112, fuel: 138, rent: 132, medicine: 118, usd: 104, jobs: 72 } },
  taipei: { id: "taipei", name: "Taipei", note: "Closest to the storm, best information, highest daily risk.", stats: { stress: 14, migrationReadiness: 8, foodSupply: -7, fuelAccess: -9, morale: -5 }, markets: { food: 138, fuel: 168, rent: 116, medicine: 142, usd: 118, jobs: 48 } },
  hong_kong: { id: "hong_kong", name: "Hong Kong", note: "Finance nerves, migration channels, and legal exposure collide.", stats: { cash: 5, careerCapital: 6, legalRisk: 7, migrationReadiness: 8, housingSecurity: -7 }, markets: { food: 126, fuel: 150, rent: 148, medicine: 128, usd: 112, jobs: 58 } },
  shanghai: { id: "shanghai", name: "Shanghai/Shenzhen", note: "Factory chains, censorship risk, and tech layoffs move fast.", stats: { monthlyIncome: 8, internetAccess: -6, legalRisk: 8, jobSecurity: -5, careerCapital: 8 }, markets: { food: 122, fuel: 142, rent: 130, medicine: 124, usd: 116, jobs: 54 } },
  manila: { id: "manila", name: "Manila", note: "Family networks matter. Prices move fast.", stats: { cash: -8, familyStability: 9, debt: 8, foodSupply: -4, reputation: 3 }, markets: { food: 128, fuel: 152, rent: 104, medicine: 126, usd: 112, jobs: 55 } },
  jakarta: { id: "jakarta", name: "Jakarta", note: "Fuel, logistics, and informal markets dominate.", stats: { fuelAccess: -7, foodSupply: -3, legalRisk: 3, emergencyPreparedness: 4 }, markets: { food: 122, fuel: 160, rent: 98, medicine: 121, usd: 109, jobs: 58 } },
  tokyo: { id: "tokyo", name: "Tokyo", note: "Safe infrastructure, expensive rent, and Korea/Taiwan anxiety.", stats: { cash: 3, housingSecurity: -4, emergencyPreparedness: 6, stress: 5 }, markets: { food: 118, fuel: 148, rent: 138, medicine: 116, usd: 108, jobs: 66 } },
  seoul: { id: "seoul", name: "Seoul", note: "Cyber alerts and missile anxiety shadow a strong job market.", stats: { internetAccess: 5, stress: 8, migrationReadiness: 4, jobSecurity: 2 }, markets: { food: 120, fuel: 146, rent: 124, medicine: 118, usd: 109, jobs: 64 } },
  dubai: { id: "dubai", name: "Dubai", note: "Cash opportunity, visa precarity, and oil money in the same room.", stats: { cash: 10, monthlyIncome: 10, legalRisk: 4, migrationReadiness: 10, familyStability: -4 }, markets: { food: 124, fuel: 112, rent: 142, medicine: 124, usd: 101, jobs: 70 } },
  london: { id: "london", name: "London", note: "Finance exposure, high rent, and strong institutions.", stats: { careerCapital: 9, cash: 4, housingSecurity: -9, debt: 4, legalRisk: -2 }, markets: { food: 124, fuel: 156, rent: 154, medicine: 112, usd: 107, jobs: 62 } },
  new_york: { id: "new_york", name: "New York", note: "Markets, media panic, rent, and career upside are all amplified.", stats: { careerCapital: 12, cash: 5, debt: 7, housingSecurity: -10, stress: 7 }, markets: { food: 126, fuel: 150, rent: 160, medicine: 130, usd: 100, jobs: 66 } },
};

const LIFE_ROLES: AnyRecord = {
  finance: { id: "finance", name: "Finance Worker", sector: "Finance", income: 74, note: "Markets pay well until they do not.", stats: { cash: 10, monthlyIncome: 14, jobSecurity: -4, stress: 8, careerCapital: 8, debt: 4 }, event: "Your desk is asked to price Taiwan exposure before markets reopen.", roleChoice: { l: "Hedge client books and ask for crisis bonus", tag: "FIN", e: { cash: 10, careerCapital: 6, stress: 6, reputation: 2 }, m: { usd: 3 }, o: "You look useful when everyone else looks scared." } },
  tech: { id: "tech", name: "Tech Worker", sector: "Technology", income: 68, note: "Semiconductors and cloud outages decide your week.", stats: { monthlyIncome: 10, internetAccess: 8, careerCapital: 9, jobSecurity: -2, stress: 3 }, event: "Your product lead freezes the roadmap and asks who can keep systems alive.", roleChoice: { l: "Volunteer for crisis reliability work", tag: "CYB", e: { careerCapital: 9, jobSecurity: 5, stress: 6, internetAccess: 2 }, m: { jobs: 2 }, o: "The pager owns your night, but leadership learns your name." } },
  cyber: { id: "cyber", name: "Cybersecurity Consultant", sector: "Cybersecurity", income: 72, note: "Every bank and port suddenly wants you.", stats: { monthlyIncome: 12, careerCapital: 10, stress: 6, legalRisk: 3, internetAccess: 7 }, event: "A bank asks for an emergency incident-response retainer by midnight.", roleChoice: { l: "Take the retainer and sleep later", tag: "CYB", e: { cash: 12, careerCapital: 8, stress: 8, reputation: 4 }, m: { jobs: 3 }, o: "You become expensive because the alternative is worse." } },
  compliance: { id: "compliance", name: "Bank Risk/Compliance Officer", sector: "Banking", income: 64, note: "Sanctions, liquidity, and regulators all land on your desk.", stats: { monthlyIncome: 8, jobSecurity: 7, stress: 7, legalRisk: -2, careerCapital: 5 }, event: "Regulators request an emergency sanctions and liquidity attestation.", roleChoice: { l: "Build the control room spreadsheet yourself", tag: "FIN", e: { jobSecurity: 8, careerCapital: 6, stress: 7, legalRisk: -4 }, m: { jobs: 1 }, o: "It is dull, vital, and politically protective." } },
  civil: { id: "civil", name: "Civil Servant", sector: "Government", income: 50, note: "Stable pay, public pressure, low upside.", stats: { monthlyIncome: -2, jobSecurity: 12, reputation: 5, legalRisk: -4, stress: 3 }, event: "Your ministry opens a public hotline for shortages and evacuation rumors.", roleChoice: { l: "Take hotline command and coordinate agencies", tag: "POL", e: { reputation: 8, jobSecurity: 5, stress: 6, morale: 3 }, m: { jobs: 1 }, o: "People yell because they think someone is finally listening." } },
  port: { id: "port", name: "Port/Logistics Worker", sector: "Logistics", income: 54, note: "Container delays become your personal economy.", stats: { monthlyIncome: 2, jobSecurity: 4, fuelAccess: -2, emergencyPreparedness: 5, health: -2 }, event: "A container backlog turns into an overnight overtime call.", roleChoice: { l: "Work the port surge and secure supply favors", tag: "LOG", e: { cash: 7, foodSupply: 7, fuelAccess: 4, stress: 5, health: -3 }, m: { food: -2 }, o: "The work is hard, but your pantry gets less theoretical." } },
  nurse: { id: "nurse", name: "Nurse", sector: "Healthcare", income: 52, note: "Trusted, exhausted, exposed to shortages.", stats: { health: -4, stress: 9, monthlyIncome: 1, medicineAccess: 7, reputation: 12, jobSecurity: 10 }, event: "Hospital triage asks you to take another double shift.", roleChoice: { l: "Work the double shift and trade favors for medicine", tag: "CARE", e: { health: -7, stress: 8, cash: 5, medicineAccess: 8, reputation: 9 }, m: { medicine: -2 }, o: "You are exhausted, but your name opens pharmacy doors." } },
  business: { id: "business", name: "Small Business Owner", sector: "Retail", income: 48, note: "Cashflow is survival. Reputation is collateral.", stats: { cash: 5, debt: 10, jobSecurity: -8, reputation: 6, stress: 7 }, event: "Suppliers demand cash up front before the next shipment.", roleChoice: { l: "Prepay inventory and raise prices carefully", tag: "DEAL", e: { cash: -8, foodSupply: 5, reputation: -2, careerCapital: 5, stress: 4 }, m: { food: 3 }, o: "You keep shelves stocked and customers suspicious." } },
  journalist: { id: "journalist", name: "Journalist", sector: "Media", income: 42, note: "Truth, access, and legal risk wrestle daily.", stats: { monthlyIncome: -6, careerCapital: 8, reputation: 8, legalRisk: 8, stress: 5 }, event: "An editor wants verified footage from a restricted port zone.", roleChoice: { l: "Verify the story through safe sources", tag: "INT", e: { reputation: 8, careerCapital: 5, legalRisk: -2, stress: 4 }, m: { usd: 1 }, o: "You publish slower, cleaner, and harder to discredit." } },
  student: { id: "student", name: "Student", sector: "Education", income: 28, note: "Low cash, high optionality, fragile housing.", stats: { cash: -12, debt: 12, monthlyIncome: -18, careerCapital: 8, migrationReadiness: 6, housingSecurity: -4 }, event: "Your university shifts classes online and opens emergency aid forms.", roleChoice: { l: "Apply for aid and build a remote portfolio", tag: "WORK", e: { cash: 5, careerCapital: 8, internetAccess: 4, stress: 3 }, m: { jobs: 1 }, o: "You turn disruption into proof that you can work anywhere." } },
  migrant: { id: "migrant", name: "Migrant Worker", sector: "Essential Labor", income: 34, note: "Remittances, documents, and housing risk dominate.", stats: { cash: -8, monthlyIncome: -10, familyStability: 10, housingSecurity: -8, legalRisk: 8, migrationReadiness: -4 }, event: "Your dorm manager warns that work permits may be checked after curfew.", roleChoice: { l: "Avoid the raid and protect documents", tag: "HOME", e: { legalRisk: -8, stress: 5, cash: -3, migrationReadiness: 5 }, m: { jobs: -1 }, o: "You lose a shift and keep your papers." } },
  crypto: { id: "crypto", name: "Crypto Speculator", sector: "Crypto", income: 44, note: "Volatility can save you or eat the floor.", stats: { cash: 8, debt: 6, monthlyIncome: -6, legalRisk: 6, stress: 8, careerCapital: -2 }, event: "A stablecoin depeg creates a violent arbitrage window.", roleChoice: { l: "Arbitrage the depeg with strict stop-loss", tag: "FIN", e: { cash: 12, stress: 7, legalRisk: 4, reputation: -3 }, m: { usd: 4 }, o: "The trade works because you exit before becoming the exit." } },
};

const LIFE_PHILOSOPHIES: AnyRecord = {
  protector: { id: "protector", name: "Protect the People Close to Me", stats: { familyStability: 10, foodSupply: 4, cash: -4, reputation: 2, emergencyPreparedness: 4 }, note: "Family and friends before upside." },
  opportunist: { id: "opportunist", name: "Chaos Is a Ladder", stats: { cash: 10, reputation: -6, legalRisk: 7, morale: 2, careerCapital: 4 }, note: "Find the spread, take the spread." },
  civic: { id: "civic", name: "Hold the Community Together", stats: { reputation: 10, morale: 4, foodSupply: -3, stress: 3, familyStability: 3 }, note: "Mutual aid beats panic." },
  exit: { id: "exit", name: "Prepare an Exit Route", stats: { migrationReadiness: 14, cash: -2, familyStability: -2, emergencyPreparedness: 8, legalRisk: -2 }, note: "Keep documents ready and options open." },
};

const LIFE_LOCAL_EVENTS: AnyRecord[] = [
  { t: "Rolling Blackout", d: "District power cuts expand from two hours to all evening. Refrigerated food and remote work are both at risk.", e: { morale: -4, foodSupply: -3, internetAccess: -6 }, m: { fuel: 3, food: 2 } },
  { t: "Bank Queue Shock", d: "ATMs limit withdrawals. Rumors spread that two regional banks are delaying transfers.", e: { morale: -3, cash: -3, legalRisk: 2 }, m: { usd: 5, jobs: -2 } },
  { t: "Fuel Ration Line", d: "Taxi fleets and delivery riders queue overnight. Police warn against hoarding.", e: { fuelAccess: -7, stress: 4, foodSupply: -2 }, m: { fuel: 8, food: 2 } },
  { t: "Clinic Shortage", d: "Insulin, antibiotics, and blood pressure medicine are suddenly hard to find.", e: { health: -4, morale: -2, medicineAccess: -8 }, m: { medicine: 7 } },
  { t: "Port Delay", d: "Container inspections triple. Fresh goods sit in port while prices jump in wet markets.", e: { foodSupply: -5, cash: -2, jobSecurity: -2 }, m: { food: 6, jobs: -1 } },
  { t: "Curfew Rumor", d: "The government denies a curfew while quietly putting police near transit hubs.", e: { morale: -3, legalRisk: 5, stress: 4 }, m: { rent: 1, usd: 2 } },
  { t: "Evacuation Chat Flood", d: "Private chats fill with routes, visa agents, and bad information. The loudest advice is not the safest.", e: { migrationReadiness: 2, stress: 5, cash: -2 }, m: { usd: 3, rent: 2 } },
  { t: "Community Aid Table", d: "Neighbors set up a shared supply table downstairs. It works only if enough people contribute.", e: { reputation: 3, morale: 2, foodSupply: -2 }, m: { food: -1 } },
];

const LIFE_ACTIONS: AnyRecord[] = [
  { l: "Work overtime", tag: "WORK", strategy: "money", e: { cash: 10, monthlyIncome: 1, jobSecurity: 3, stress: 8, health: -4, familyStability: -3 }, m: { jobs: 1 }, o: "You trade body and time for cashflow." },
  { l: "Negotiate debt holiday", tag: "FIN", strategy: "money", e: { cash: 4, debt: -9, reputation: -2, legalRisk: 2, stress: 3 }, m: { usd: 1 }, o: "You buy breathing room, but lenders remember." },
  { l: "Emergency freelance sprint", tag: "WORK", strategy: "career", e: { cash: 8, careerCapital: 6, jobSecurity: 2, stress: 7, internetAccess: -3 }, m: { jobs: 1 }, o: "A short contract becomes both income and proof of competence." },
  { l: "Build crisis skills", tag: "WORK", strategy: "career", e: { careerCapital: 11, jobSecurity: 4, cash: -3, stress: 4, internetAccess: -2 }, m: { jobs: 1 }, o: "It does not solve today, but it changes who can hire you tomorrow." },
  { l: "Buy supplies", tag: "HOME", strategy: "supplies", e: { cash: -9, foodSupply: 11, medicineAccess: 4, emergencyPreparedness: 7 }, m: { food: 2, medicine: 1 }, o: "Your shelves look less dramatic and more useful." },
  { l: "Repair home fallback kit", tag: "HOME", strategy: "supplies", e: { emergencyPreparedness: 10, housingSecurity: 4, fuelAccess: 3, cash: -6, morale: -1 }, m: { rent: 1 }, o: "The apartment becomes less fragile even if it is not comfortable." },
  { l: "Help family logistics", tag: "CARE", strategy: "family", e: { cash: -6, familyStability: 12, morale: 4, reputation: 3, stress: 3 }, m: {}, o: "Someone close to you sleeps better tonight." },
  { l: "Join community aid", tag: "CARE", strategy: "community", e: { reputation: 11, morale: 6, foodSupply: -4, stress: 3, familyStability: 4 }, m: { food: -1 }, o: "The network becomes part of your emergency kit." },
  { l: "Take a real recovery day", tag: "HEAL", strategy: "health", e: { health: 10, stress: -12, morale: 5, cash: -5, jobSecurity: -3 }, m: {}, o: "You stop the slide before your body makes the decision for you." },
  { l: "Clinic and medicine run", tag: "HEAL", strategy: "health", e: { health: 8, medicineAccess: 8, cash: -7, stress: 2, legalRisk: -1 }, m: { medicine: 2 }, o: "You spend money now to avoid paying with health later." },
  { l: "Apply overseas", tag: "DIP", strategy: "migration", e: { migrationReadiness: 12, cash: -6, stress: 5, familyStability: -2, careerCapital: 2 }, m: { usd: 2 }, o: "Forms, scans, references, and one more possible door." },
  { l: "Secure documents and exit cash", tag: "DIP", strategy: "migration", e: { migrationReadiness: 9, legalRisk: -4, emergencyPreparedness: 3, cash: -8, morale: -2 }, m: { usd: 2 }, o: "You reduce the chance that panic ruins the exit window." },
  { l: "Grey-market supply deal", tag: "DEAL", strategy: "grey", e: { cash: -4, foodSupply: 10, fuelAccess: 8, legalRisk: 8, reputation: -4, stress: 5 }, m: { food: -2, fuel: -2 }, o: "It solves a real shortage by creating a different kind of exposure." },
  { l: "Take risky opportunity", tag: "DEAL", strategy: "grey", e: { cash: 14, careerCapital: 5, stress: 9, legalRisk: 9, reputation: -4 }, m: { usd: 3 }, o: "It pays because not everyone would touch it." },
];

const LIFE_LENGTHS = [14, 30, 45, 60];

const ENDINGS = {
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

function getEnding(fid, st, context: AnyRecord = {}) {
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

function buildQ(fid) {
  const scenarioBase = SCENARIOS[fid] || (fid === "us_rep" ? SCENARIOS.us_dem : []);
  const expansionBase = FABLE_SCENARIO_EXPANSIONS[fid] || (fid === "us_rep" ? FABLE_SCENARIO_EXPANSIONS.us_dem : []);
  const pool = [...scenarioBase, ...expansionBase];
  const byA = {};
  pool.forEach(s => { if (!byA[s.a]) byA[s.a] = []; byA[s.a].push(s); });
  const q = [];
  [1, 2, 3, 4, 5, 6].forEach(a => q.push(...sfl(byA[a] || [])));
  return q;
}

const lc = (v, max = 100) => Math.max(0, Math.min(max, Math.round(v)));
const lifeRiskHigh = (k) => ["debt", "stress", "legalRisk"].includes(k);
const lifeStatMax = (k) => ["cash", "debt", "monthlyIncome"].includes(k) ? 180 : 100;
const lifeLabel = (k) => ({ cash: "Cash", debt: "Debt", monthlyIncome: "Monthly Income", jobSecurity: "Job Security", careerCapital: "Career Capital", familyStability: "Family Stability", health: "Health", stress: "Stress", morale: "Morale", foodSupply: "Food Supply", fuelAccess: "Fuel Access", medicineAccess: "Medicine Access", housingSecurity: "Housing Security", internetAccess: "Internet Access", legalRisk: "Legal Risk", migrationReadiness: "Migration Readiness", reputation: "Reputation", emergencyPreparedness: "Emergency Preparedness" }[k] || k);
const lifeApplyStats = (s, e = {}) => {
  const n = { ...s };
  Object.entries(e).forEach(([k, v]) => { n[k] = lc((n[k] ?? 50) + Number(v), lifeStatMax(k)); });
  return n;
};
const lifeApplyMarkets = (m, e = {}) => {
  const n = { ...m };
  Object.entries(e).forEach(([k, v]) => { n[k] = Math.max(20, Math.min(260, Math.round((n[k] ?? 100) + Number(v)))); });
  return n;
};
function buildLifeProfile(draft) {
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
const mergeEffect = (base = {}, extra = {}) => {
  const out = { ...base };
  Object.entries(extra).forEach(([k, v]) => { out[k] = Number(out[k] || 0) + Number(v); });
  return out;
};
const cloneLifeAction = (a: AnyRecord): AnyRecord => ({ ...a, e: { ...(a.e || {}) }, m: { ...(a.m || {}) } });
const actionByStrategy = (strategy: string, alt = 0) => LIFE_ACTIONS.filter(a => a.strategy === strategy)[alt] || LIFE_ACTIONS.find(a => a.strategy === strategy) || LIFE_ACTIONS[0];
const recoveryStrategiesFor = (stats: StatMap) => {
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
function contextualizeLifeAction(action: AnyRecord, profile: AnyRecord, crisis: StatMap, stats: StatMap) {
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
function buildLifeChoices(day, profile, crisis, stats) {
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
function buildLifeEvent(day, profile, currentStats = profile.stats) {
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
function resolveLifeChoice(stats, markets, event, choice, day) {
  const c = event.crisis || {};
  const drift = { food: rnd(0, 3) + Math.round((c.oilShock || 0) / 25), fuel: rnd(-1, 5) + Math.round((c.oilShock || 0) / 18), rent: rnd(0, 2) + Math.round((c.refugeePressure || 0) / 40), medicine: rnd(0, 3) + Math.round((c.humanitarianDamage || 0) / 28), usd: rnd(-2, 5) + Math.round((c.financialContagion || 0) / 35), jobs: -rnd(0, 2) - Math.round((c.financialContagion || 0) / 45) };
  const ns = lifeApplyStats(lifeApplyStats(lifeApplyStats(stats, event.local.e), event.pressure), choice.e);
  const nm = lifeApplyMarkets(lifeApplyMarkets(lifeApplyMarkets(markets, event.local.m), drift), choice.m);
  const preview = Object.entries(choice.e || {}).slice(0, 5).map(([k, v]) => `${Number(v) > 0 ? "+" : ""}${v} ${lifeLabel(k)}`).join(", ");
  const entry = `Day ${day}: ${event.local.t}. ${choice.l}. ${choice.o}${preview ? ` Consequences: ${preview}.` : ""}`;
  return { stats: ns, markets: nm, entry };
}
function lifeStrategyNote(counts: AnyRecord = {}) {
  const top = Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  if (!top || Number(top[1]) <= 0) return "";
  const labels = { money: "cash and debt triage", career: "career recovery", family: "family stabilization", community: "community aid", health: "health and stress recovery", supplies: "supplies and preparedness", migration: "migration planning", grey: "grey-market risk-taking" };
  return `Your most repeated recovery strategy was ${labels[top[0]] || top[0]} (${top[1]} choices).`;
}
function getLifeEnding(profile, stats, context: AnyRecord = {}) {
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

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  root: { fontFamily: "var(--font-sans)", background: "linear-gradient(180deg,#f4f7f8 0%,#e8eef0 48%,#f7f7f4 100%)", minHeight: "100vh", color: "var(--color-text-primary)" },
  shell: { width: "min(1120px,100%)", margin: "0 auto", padding: "16px 14px" },
  card: { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", boxShadow: "0 8px 24px rgba(20,35,45,0.06)" },
  panel: { background: "rgba(255,255,255,0.86)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", boxShadow: "0 10px 32px rgba(20,35,45,0.07)" },
  muted: { color: "var(--color-text-secondary)" },
  tiny: { fontSize: "9px" },
  small: { fontSize: "11px" },
  med: { fontSize: "13px" },
};

const SAVE_KEY = "strait-protocol-2030-campaign-v2";
const MEMORY_SAVE: AnyRecord = {};
const storageGet = (k: string) => typeof localStorage !== "undefined" ? localStorage.getItem(k) : MEMORY_SAVE[k] || null;
const storageSet = (k: string, v: string) => { if (typeof localStorage !== "undefined") localStorage.setItem(k, v); else MEMORY_SAVE[k] = v; };
const storageRemove = (k: string) => { if (typeof localStorage !== "undefined") localStorage.removeItem(k); else delete MEMORY_SAVE[k]; };
const saveSet = (s?: Set<string>) => Array.from(s || []);
const restoreSet = (a?: string[]) => new Set(a || []);
const fmtEntries = (obj: AnyRecord = {}, limit = 8) => Object.entries(obj).slice(0, limit).map(([k, v]) => `${k}: ${v}`).join(", ");
const downloadText = (name: string, text: string) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};
const warSummaryText = (state: AnyRecord) => {
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
const lifeSummaryText = (state: AnyRecord) => {
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
const whyWarChoice = (chosen: AnyRecord, crisis: StatMap = {}) => {
  if (!chosen) return "";
  const pressure = Object.keys(chosen.pressureDelta || {}).length ? "Faction pressure moved because this response matched or strained your faction's internal politics." : "";
  const crisisHit = Object.entries(chosen.crisisDelta || {}).filter(([, v]) => Number(v) !== 0).map(([k]) => CRISIS_META[k]?.label || k).slice(0, 3).join(", ");
  const risk = chosen.c.type === "bad" ? "This was a high-risk response; the payoff came with structural damage." : chosen.c.type === "good" ? "This was a stabilizing response; it traded speed or resources for resilience." : "This was a trade-off response; it solved one pressure while moving another.";
  const nuclear = (crisis.nuclearRisk || 0) >= 50 ? " Nuclear risk is now high enough to color later events and endings." : "";
  return `${risk} ${pressure} ${crisisHit ? `It directly affected ${crisisHit}.` : ""}${nuclear}`.trim();
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function Tag({ tag, strike = false }: AnyRecord) {
  const col = tc(tag);
  return (
    <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "8px", fontWeight: 600, whiteSpace: "nowrap", background: col.bg, color: col.tx, border: `0.5px solid ${col.bd}`, flexShrink: 0, marginTop: "2px" }}>
      {strike ? "⚡STRIKE" : tag}
    </span>
  );
}

function StatBar({ label, value }: AnyRecord) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "6px", padding: "4px 6px", textAlign: "center", border: `0.5px solid ${vBg(value)}` }}>
      <div style={{ fontSize: "8px", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "1px" }}>{label}</div>
      <div style={{ fontSize: "15px", fontWeight: 500, color: vC(value) }}>{value}</div>
      <div style={{ height: "2px", borderRadius: "1px", background: "var(--color-border-tertiary)", marginTop: "2px" }}>
        <div style={{ height: "2px", borderRadius: "1px", width: `${value}%`, background: vC(value), transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function PressureMetric({ id, value, meta }: AnyRecord) {
  const color = pressureC(meta, value);
  const bg = pressureBg(meta, value);
  const status = meta?.riskHigh ? (value < 35 ? "Contained" : value < 65 ? "Watch" : "Critical") : (value >= 65 ? "Strong" : value >= 40 ? "Fragile" : "Weak");
  return (
    <div style={{ background: bg, border: `0.5px solid ${color}`, borderRadius: "var(--border-radius-md)", padding: "6px 7px", minHeight: "55px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "baseline" }}>
        <div style={{ fontSize: "8px", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.2 }}>{meta?.label || id}</div>
        <div style={{ fontSize: "14px", fontWeight: 800, color }}>{value}</div>
      </div>
      <div style={{ height: "3px", borderRadius: "999px", background: "rgba(255,255,255,0.65)", overflow: "hidden", margin: "4px 0 3px" }}>
        <div style={{ width: `${value}%`, height: "3px", borderRadius: "999px", background: color }} />
      </div>
      <div style={{ fontSize: "8px", color, fontWeight: 700 }}>{status}</div>
    </div>
  );
}

function CrisisTile({ id, value }: AnyRecord) {
  const meta = CRISIS_META[id] || { label: id };
  const color = crisisC(id, value);
  const bg = crisisBg(id, value);
  const status = meta.goodHigh ? (value >= 65 ? "Strong" : value >= 40 ? "Fragile" : "Weak") : (value < 35 ? "Low" : value < 65 ? "Elevated" : "Severe");
  return (
    <div style={{ background: bg, border: `0.5px solid ${color}`, borderRadius: "var(--border-radius-md)", padding: "6px 7px", minHeight: "54px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "baseline", marginBottom: "3px" }}>
        <div style={{ fontSize: "8px", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.2 }}>{meta.label}</div>
        <div style={{ fontSize: "14px", fontWeight: 800, color }}>{value}</div>
      </div>
      <div style={{ height: "3px", borderRadius: "999px", background: "rgba(255,255,255,0.65)", overflow: "hidden", marginBottom: "3px" }}>
        <div style={{ width: `${value}%`, height: "3px", borderRadius: "999px", background: color }} />
      </div>
      <div style={{ fontSize: "8px", color, fontWeight: 700 }}>{status}</div>
    </div>
  );
}

function StrategicDashboard({ F, fid, stats, crisis, counts }: AnyRecord) {
  const identity = factionMeta(fid);
  const pressureKeys = factionPressureKeys(fid);
  const posture = strategicPosture(fid, stats, crisis);
  const used = Object.entries(counts).filter(([, v]) => Number(v) > 0);
  return (
    <div style={{ padding: "9px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "rgba(255,255,255,0.72)" }}>
      <div style={{ maxWidth: "1120px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "8px" }}>
        <div style={{ ...S.card, padding: "10px", border: `1px solid ${F.bd}` }}>
          <div style={{ fontSize: "9px", color: F.color, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>Strategic Posture</div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--color-text-primary)", marginTop: "3px" }}>{posture}</div>
          <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", lineHeight: 1.45, marginTop: "5px" }}>{F.tagline}</div>
          <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)", lineHeight: 1.45, marginTop: "5px" }}>{identity.mechanic}</div>
        </div>
        <div style={{ ...S.card, padding: "10px" }}>
          <div style={{ fontSize: "9px", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: "6px" }}>Faction Pressure</div>
          <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)", lineHeight: 1.45, marginBottom: "7px" }}>{identity.why}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: "5px" }}>
            {pressureKeys.map(k => <PressureMetric key={k} id={k} value={stats[k]} meta={identity.stats[k]} />)}
          </div>
        </div>
        <div style={{ ...S.card, padding: "10px" }}>
          <div style={{ fontSize: "9px", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: "6px" }}>Decision Mix</div>
          {used.length === 0 ? <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}>No doctrine established yet.</div> : used.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "10px", color: "var(--color-text-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)", padding: "4px 0" }}>
              <span>{k}</span><b style={{ color: "var(--color-text-primary)" }}>{v as number}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActProgress({ act, day, F }: AnyRecord) {
  return (
    <div style={{ padding: "7px 14px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <div style={{ maxWidth: "1120px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "4px" }}>
        {[1, 2, 3, 4, 5, 6].map(a => (
          <div key={a} style={{ border: `0.5px solid ${a === act ? F.bd : "var(--color-border-tertiary)"}`, background: a < act ? "#EAF3DE" : a === act ? F.bg : "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", padding: "5px 6px", minHeight: "42px" }}>
            <div style={{ fontSize: "8px", color: a <= act ? F.color : "var(--color-text-tertiary)", fontWeight: 800, textTransform: "uppercase" }}>Act {a}</div>
            <div style={{ fontSize: "9px", color: "var(--color-text-secondary)", lineHeight: 1.25 }}>{ACTS[a]}</div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: "1120px", margin: "5px auto 0", fontSize: "9px", color: "var(--color-text-tertiary)", textAlign: "right" }}>Day {day}/45</div>
    </div>
  );
}

function WarRoomSidePanel({ log, timeline }: AnyRecord) {
  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <div style={{ ...S.panel, padding: "11px", maxHeight: "260px", overflow: "auto" }}>
        <div style={{ fontSize: "9px", fontWeight: 800, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Crisis Timeline</div>
        {timeline.length === 0 ? <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", lineHeight: 1.55 }}>No turning points recorded yet. Major decisions, fleet orders, and crisis chains will appear here once the campaign starts bending history.</div> : timeline.slice().reverse().map((t, i) => (
          <div key={i} style={{ borderTop: "0.5px solid var(--color-border-tertiary)", padding: "6px 0" }}>
            <div style={{ fontSize: "9px", color: "#854F0B", fontWeight: 800 }}>D{t.day} · Act {t.act} · {t.title}</div>
            <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", lineHeight: 1.45 }}>{t.body}</div>
          </div>
        ))}
      </div>
      <div style={{ ...S.panel, padding: "11px", maxHeight: "300px", overflow: "auto" }}>
        <div style={{ fontSize: "9px", fontWeight: 800, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>War Room Log</div>
        {log.length === 0 ? <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", lineHeight: 1.55 }}>No decisions recorded yet. Your choices, blocked fleet orders, sudden events, and consequence notes will collect here.</div> : log.slice().reverse().map((l, i) => (
          <div key={i} style={{ fontSize: "10px", color: "var(--color-text-secondary)", lineHeight: 1.5, borderTop: "0.5px solid var(--color-border-tertiary)", padding: "6px 0" }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function CampaignControls({ mode, canLoad, message, onSave, onLoad, onClear, onExport, onRestart }: AnyRecord) {
  const btn = (label, fn, disabled = false, tone = "plain") => (
    <button onClick={fn} disabled={disabled} style={{ fontSize: "9px", padding: "5px 8px", borderRadius: "var(--border-radius-md)", border: `0.5px solid ${tone === "danger" ? "#F09595" : tone === "good" ? "#97C459" : "var(--color-border-tertiary)"}`, background: disabled ? "var(--color-background-secondary)" : tone === "danger" ? "#FCEBEB" : tone === "good" ? "#EAF3DE" : "var(--color-background-primary)", color: disabled ? "var(--color-text-tertiary)" : tone === "danger" ? "#A32D2D" : tone === "good" ? "#3B6D11" : "var(--color-text-secondary)", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "var(--font-sans)" }}>{label}</button>
  );
  return (
    <div style={{ padding: "6px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "rgba(255,255,255,0.72)" }}>
      <div style={{ maxWidth: "1120px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)", lineHeight: 1.35 }}><b style={{ color: "var(--color-text-secondary)" }}>{mode}</b>{message ? ` - ${message}` : ""}</div>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {btn("Save", onSave, false, "good")}
          {btn("Load", onLoad, !canLoad)}
          {btn("Clear Save", onClear, !canLoad, "danger")}
          {btn("Export Summary", onExport)}
          {btn("Restart", onRestart, false, "danger")}
        </div>
      </div>
    </div>
  );
}

function FleetCard({ fl }: AnyRecord) {
  const isCrit = fl.threat === "Critical" || fl.threat === "Imminent" || fl.status === "approaching";
  return (
    <div style={{ ...S.card, padding: "5px 8px", border: `0.5px solid ${isCrit ? "#F09595" : "var(--color-border-tertiary)"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1px" }}>
        <span style={{ fontSize: "9px", fontWeight: 500, color: "var(--color-text-primary)" }}>{fl.name}</span>
        {fl.u > 0 && <span style={{ fontSize: "8px", color: "var(--color-text-tertiary)" }}>{fl.u > 999 ? `${Math.round(fl.u / 1000)}k` : fl.u}u</span>}
      </div>
      <div style={{ fontSize: "8px", color: "var(--color-text-tertiary)", marginBottom: "3px" }}>{fl.type}</div>
      <div style={{ display: "flex", gap: "2px", flexWrap: "wrap", marginBottom: "2px" }}>
        <span style={{ fontSize: "8px", padding: "0 4px", borderRadius: "4px", background: thrBg(fl.threat), color: stC(fl.status), border: "0.5px solid currentColor" }}>{fl.status}</span>
        <span style={{ fontSize: "8px", padding: "0 4px", borderRadius: "4px", background: thrBg(fl.threat), color: thrC(fl.threat), border: `0.5px solid ${thrC(fl.threat)}` }}>⚠{fl.threat}</span>
        <span style={{ fontSize: "8px", padding: "0 4px", borderRadius: "4px", background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)", border: "0.5px solid var(--color-border-tertiary)" }}>{fl.front}</span>
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        {fl.eta > 0 && <span style={{ fontSize: "8px", color: "#BA7517" }}>🕐{fl.eta}d ETA</span>}
        <span style={{ fontSize: "8px", color: supC(fl.sup), fontWeight: 500 }}>📦{fl.sup >= 999 ? "∞" : fl.sup + "d"}</span>
      </div>
      {fl.note && <div style={{ fontSize: "8px", color: "var(--color-text-tertiary)", marginTop: "2px", fontStyle: "italic", lineHeight: 1.3 }}>{fl.note}</div>}
    </div>
  );
}

// ─── SCREENS ─────────────────────────────────────────────────────────────────
function FleetOpsCard({ fl, onAction, commandPoints = FLEET_COMMAND_POINTS_PER_DAY, orderedToday = false }: AnyRecord) {
  const isCrit = fl.threat === "Critical" || fl.threat === "Imminent" || fl.status === "approaching";
  const actions = ["Deploy", "Hold", "Resupply", "Escort", "Shadow", "Interdict", "Retreat", "Strike Ready"];
  return (
    <div style={{ ...S.card, padding: "7px 8px", border: `0.5px solid ${isCrit ? "#F09595" : "var(--color-border-tertiary)"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1px", gap: "6px" }}>
        <span style={{ fontSize: "9px", fontWeight: 650, color: "var(--color-text-primary)" }}>{fl.name}</span>
        {fl.u > 0 && <span style={{ fontSize: "8px", color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>{fl.u > 999 ? `${Math.round(fl.u / 1000)}k` : fl.u}u</span>}
      </div>
      <div style={{ fontSize: "8px", color: "var(--color-text-tertiary)", marginBottom: "3px" }}>{fl.type}</div>
      <div style={{ display: "flex", gap: "2px", flexWrap: "wrap", marginBottom: "3px" }}>
        <span style={{ fontSize: "8px", padding: "0 4px", borderRadius: "4px", background: thrBg(fl.threat), color: stC(fl.status), border: "0.5px solid currentColor" }}>{fl.status}</span>
        <span style={{ fontSize: "8px", padding: "0 4px", borderRadius: "4px", background: thrBg(fl.threat), color: thrC(fl.threat), border: `0.5px solid ${thrC(fl.threat)}` }}>Risk {fl.threat}</span>
        <span style={{ fontSize: "8px", padding: "0 4px", borderRadius: "4px", background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)", border: "0.5px solid var(--color-border-tertiary)" }}>{fl.location || fl.front}</span>
      </div>
      <div style={{ fontSize: "8px", color: "var(--color-text-secondary)", marginBottom: "3px" }}>Mission: {fl.mission}</div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "8px", color: "#BA7517" }}>ETA {fl.eta || 0}d</span>
        <span style={{ fontSize: "8px", color: supC(fl.sup), fontWeight: 600 }}>Supply {fl.sup >= 999 ? "open" : fl.sup + "d"}</span>
        <span style={{ fontSize: "8px", color: riskC(100 - fl.fuel), fontWeight: 600 }}>Fuel {fl.fuel}%</span>
        <span style={{ fontSize: "8px", color: vC(fl.readiness), fontWeight: 600 }}>Ready {fl.readiness}%</span>
      </div>
      {fl.note && <div style={{ fontSize: "8px", color: "var(--color-text-tertiary)", marginTop: "2px", fontStyle: "italic", lineHeight: 1.3 }}>{fl.note}</div>}
      {orderedToday && <div style={{ fontSize: "8px", color: "#854F0B", marginTop: "3px", fontWeight: 650 }}>Orders issued today</div>}
      <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", marginTop: "5px" }}>
        {actions.map(a => {
          const cost = fleetActionCost(a);
          const blocked = orderedToday || cost > commandPoints || !!fleetStatusBlockReason(fl, a);
          return (
          <button key={a} disabled={blocked} title={blocked ? orderedToday ? "This fleet already received orders today" : cost > commandPoints ? "No Fleet Command Points remaining" : "Action unavailable due to fleet status" : `${cost} Fleet Command Point${cost === 1 ? "" : "s"}`} onClick={() => onAction(a)} style={{ fontSize: "8px", padding: "2px 5px", borderRadius: "5px", border: `0.5px solid ${blocked ? "var(--color-border-tertiary)" : "#185FA5"}`, background: blocked ? "var(--color-background-secondary)" : "var(--color-background-primary)", color: blocked ? "var(--color-text-tertiary)" : "var(--color-text-secondary)", cursor: blocked ? "not-allowed" : "pointer", opacity: blocked ? 0.58 : 1, fontFamily: "var(--font-sans)" }}>
            {a}{cost > 1 ? ` ${cost}` : ""}
          </button>
          );
        })}
      </div>
    </div>
  );
}

function FactionScreen({ onPick }: AnyRecord) {
  return (
    <div style={S.shell}>
      <div style={{ ...S.panel, padding: "16px", marginBottom: "12px" }}>
        <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text-primary)", marginBottom: "4px" }}>STRAIT PROTOCOL: 2030</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
          {["Taiwan Strait Crisis", "6 Factions", "6 Acts", "Day 45"].map(x => <span key={x} style={{ fontSize: "9px", padding: "3px 8px", borderRadius: "999px", background: "#E6F1FB", color: "#185FA5", border: "0.5px solid #85B7EB", fontWeight: 600 }}>{x}</span>)}
        </div>
        <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", lineHeight: 1.65 }}>Choose your faction. Each plays a different strategic game with its own win conditions, pressures, fleets, and crisis tools.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "10px" }}>
        {Object.values(FACTIONS).map(f => (
          <div key={f.id} onClick={() => onPick(f.id)}
            style={{ ...S.card, padding: "13px", border: `1px solid ${f.bd}`, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = f.bg; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--color-background-primary)"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start", marginBottom: "2px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: f.color }}>{f.flag} {f.name}</div>
              <span style={{ fontSize: "8px", padding: "2px 6px", borderRadius: "999px", background: f.bg, color: f.color, border: `0.5px solid ${f.bd}`, whiteSpace: "nowrap" }}>PLAY</span>
            </div>
            <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)", marginBottom: "5px" }}>{f.sub}</div>
            <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", marginBottom: "6px", lineHeight: 1.4 }}>{f.tagline}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginBottom: "5px" }}>
              {f.traits.map(t => <span key={t} style={{ fontSize: "8px", padding: "1px 6px", borderRadius: "8px", border: `0.5px solid ${f.bd}`, color: f.color, background: f.bg }}>{t}</span>)}
            </div>
            <div style={{ fontSize: "8px", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>{f.pressure}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MainMenu({ onWar, onLife, canLoad, onLoad, onClear, saveMessage }: AnyRecord) {
  const modeCard = (title, eyebrow, body, accent, bg, onClick, chips) => (
    <button onClick={onClick}
      style={{ ...S.panel, cursor: "pointer", padding: "18px", textAlign: "left", fontFamily: "var(--font-sans)", minHeight: "210px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 44px rgba(20,35,45,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(20,35,45,0.07)"; }}
    >
      <div>
        <div style={{ fontSize: "9px", color: accent, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "8px" }}>{eyebrow}</div>
        <div style={{ fontSize: "22px", fontWeight: 750, color: "var(--color-text-primary)", marginBottom: "8px" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.65, maxWidth: "36em" }}>{body}</div>
      </div>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "18px" }}>
        {chips.map(x => <span key={x} style={{ fontSize: "9px", padding: "3px 8px", borderRadius: "999px", background: bg, border: `0.5px solid ${accent}`, color: accent, fontWeight: 600 }}>{x}</span>)}
      </div>
    </button>
  );
  return (
    <div style={{ ...S.shell, paddingTop: "28px" }}>
      <div style={{ ...S.panel, padding: "22px", marginBottom: "12px", borderTop: "3px solid #185FA5" }}>
        <div style={{ fontSize: "10px", color: "#3B6D11", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Crisis Command Interface</div>
        <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "0.04em", color: "var(--color-text-primary)", marginBottom: "6px" }}>STRAIT PROTOCOL: 2030</div>
        <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.65, maxWidth: "700px" }}>Pick the lens you want: run the strategic war room, or drop into a civilian survival campaign as Phase 2 starts coming online.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "6px", marginTop: "16px" }}>
          {[
            ["War Room", "Playable"],
            ["Life Mode", "Foundation"],
            ["Build", "Local + Pages"],
            ["Scope", "Prototype"]
          ].map(([k, v]) => (
            <div key={k} style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px" }}>
              <div style={{ fontSize: "8px", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
              <div style={{ fontSize: "12px", color: "var(--color-text-primary)", fontWeight: 650, marginTop: "2px" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "12px" }}>
        {modeCard("War Room Mode", "Strategic Command", "Play the current strategic crisis game with factions, fleets, diplomatic choices, sudden events, and national endings.", "#185FA5", "#E6F1FB", onWar, ["Factions", "Fleets", "Crisis Cards", "Endings"])}
        {modeCard("Life During Chaos Mode", "Civilian Survival", "Play a compact survival RPG with cities, roles, household pressure, markets, crisis events, and civilian endings.", "#854F0B", "#FAEEDA", onLife, ["Cities", "Roles", "Markets", "Event Log"])}
      </div>
      <div style={{ ...S.panel, padding: "10px", marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>{saveMessage || (canLoad ? "A saved campaign is available on this browser." : "No saved campaign found on this browser.")}</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button onClick={onLoad} disabled={!canLoad} style={{ padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: canLoad ? "var(--color-background-primary)" : "var(--color-background-secondary)", color: canLoad ? "var(--color-text-primary)" : "var(--color-text-tertiary)", cursor: canLoad ? "pointer" : "not-allowed", fontSize: "10px", fontWeight: 700 }}>Load Saved Campaign</button>
          <button onClick={onClear} disabled={!canLoad} style={{ padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #F09595", background: canLoad ? "#FCEBEB" : "var(--color-background-secondary)", color: canLoad ? "#A32D2D" : "var(--color-text-tertiary)", cursor: canLoad ? "pointer" : "not-allowed", fontSize: "10px", fontWeight: 700 }}>Clear Save</button>
        </div>
      </div>
    </div>
  );
}

function LifeSetupScreen({ draft, setDraft, onStart, onBack }: AnyRecord) {
  const pick = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const preview = buildLifeProfile(draft);
  const optionGrid = (title, keyName, items) => (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "10px", color: "#854F0B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", fontWeight: 700 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "7px" }}>
        {Object.values(items).map((it: any) => (
          <button key={it.id} onClick={() => pick(keyName, it.id)} style={{ ...S.card, cursor: "pointer", textAlign: "left", padding: "11px", border: `1px solid ${draft[keyName] === it.id ? "#EF9F27" : "var(--color-border-tertiary)"}`, background: draft[keyName] === it.id ? "#fff7e8" : "var(--color-background-primary)", fontFamily: "var(--font-sans)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-primary)" }}>{it.name}</div>
              {draft[keyName] === it.id && <span style={{ fontSize: "8px", color: "#854F0B", fontWeight: 800 }}>SELECTED</span>}
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", lineHeight: 1.5, marginTop: "4px" }}>{it.note}</div>
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div style={S.shell}>
      <button onClick={onBack} style={{ marginBottom: "10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", padding: "7px 10px", cursor: "pointer", fontSize: "10px", fontWeight: 650 }}>Back to Menu</button>
      <div style={{ ...S.panel, padding: "16px", marginBottom: "12px", borderTop: "3px solid #EF9F27" }}>
        <div style={{ fontSize: "10px", color: "#854F0B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Civilian Survival RPG</div>
        <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "5px" }}>Life During Chaos</div>
        <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", lineHeight: 1.65 }}>Create a civilian campaign profile with city, role, philosophy, cash, debt, income, family obligations, and crisis pressure.</div>
      </div>
      <div style={{ ...S.panel, padding: "14px" }}>
        {optionGrid("Spawn Point", "spawn", LIFE_SPAWNS)}
        {optionGrid("Role", "role", LIFE_ROLES)}
        {optionGrid("Life Philosophy", "philosophy", LIFE_PHILOSOPHIES)}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "6px", marginBottom: "14px" }}>
        {[["Job Sector", preview.jobSector], ["Starting Cash", preview.startingCash], ["Debt", preview.debt], ["Monthly Income", preview.monthlyIncome], ["Family Obligation", preview.familyObligation]].map(([k, v]) => (
          <div key={k} style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px" }}>
            <div style={{ fontSize: "8px", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</div>
            <div style={{ fontSize: "12px", color: "var(--color-text-primary)", fontWeight: 750, marginTop: "2px" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "10px", color: "#854F0B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", fontWeight: 700 }}>Campaign Length</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {LIFE_LENGTHS.map(len => <button key={len} onClick={() => pick("length", len)} style={{ padding: "8px 13px", borderRadius: "var(--border-radius-md)", border: `1px solid ${draft.length === len ? "#EF9F27" : "var(--color-border-tertiary)"}`, background: draft.length === len ? "#fff7e8" : "var(--color-background-primary)", cursor: "pointer", fontSize: "11px", fontWeight: draft.length === len ? 750 : 500 }}>{len} days</button>)}
        </div>
      </div>
        <button onClick={onStart} style={{ width: "100%", padding: "12px", border: "1px solid #EF9F27", borderRadius: "var(--border-radius-md)", background: "#854F0B", color: "#fffaf0", cursor: "pointer", fontWeight: 800, fontFamily: "var(--font-sans)", letterSpacing: "0.03em" }}>Start Life Mode</button>
      </div>
    </div>
  );
}

function LifeMetric({ label, value, limit = 100 }: AnyRecord) {
  const color = lifeRiskHigh(label) ? (value > 70 ? "#A32D2D" : value > 45 ? "#BA7517" : "#1D9E75") : vC(value);
  return (
    <div style={{ ...S.card, padding: "7px 8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline" }}>
        <div style={{ fontSize: "8px", textTransform: "uppercase", color: "var(--color-text-tertiary)", letterSpacing: "0.04em", lineHeight: 1.15 }}>{lifeLabel(label)}</div>
        <div style={{ fontSize: "14px", fontWeight: 800, color }}>{value}</div>
      </div>
      <div style={{ height: "3px", background: "var(--color-border-tertiary)", borderRadius: "3px", marginTop: "5px", overflow: "hidden" }}><div style={{ width: `${Math.min(100, (value / limit) * 100)}%`, background: color, height: "3px", borderRadius: "3px" }} /></div>
    </div>
  );
}

function LifeGameScreen({ profile, day, stats, markets, event, log, controls, onChoice, onBack }: AnyRecord) {
  const progress = Math.round((day / profile.length) * 100);
  const lifePreview = (c) => Object.entries(c.e || {}).slice(0, 4).map(([k, v]) => `${Number(v) > 0 ? "+" : ""}${v} ${lifeLabel(k)}`).join(", ");
  return (
    <div style={S.root}>
      {controls}
      <div style={{ ...S.shell, paddingTop: "10px", paddingBottom: "10px" }}>
        <div style={{ ...S.panel, padding: "12px 14px", borderTop: "3px solid #EF9F27" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "9px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#854F0B", letterSpacing: "0.07em" }}>LIFE DURING CHAOS</div>
              <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", marginTop: "2px" }}>{profile.spawn.name} · {profile.role.name} · {profile.philosophy.name}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text-primary)" }}>Day {day}/{profile.length}</div>
              <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)" }}>{progress}% survived</div>
            </div>
          </div>
          <div style={{ height: "5px", borderRadius: "999px", background: "var(--color-border-tertiary)", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "5px", background: "#EF9F27", borderRadius: "999px" }} />
          </div>
        </div>
      </div>
      <div style={{ ...S.shell, paddingTop: 0, paddingBottom: "10px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "10px" }}>
          <div style={{ ...S.panel, padding: "10px" }}>
            <div style={{ fontSize: "9px", fontWeight: 800, color: "var(--color-text-secondary)", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Personal Stats</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: "5px" }}>
              {Object.entries(stats as StatMap).map(([k, v]) => <LifeMetric key={k} label={k} value={v} limit={lifeStatMax(k)} />)}
            </div>
          </div>
          <div style={{ ...S.panel, padding: "10px" }}>
            <div style={{ fontSize: "9px", fontWeight: 800, color: "var(--color-text-secondary)", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Market Ticker</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(86px,1fr))", gap: "5px" }}>
              {Object.entries(markets as StatMap).map(([k, v]) => <LifeMetric key={k} label={k} value={v} limit={220} />)}
            </div>
          </div>
        </div>
      </div>
      <div style={{ ...S.shell, paddingTop: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "10px" }}>
        <div>
          <div style={{ ...S.panel, padding: "14px", marginBottom: "8px" }}>
            <div style={{ fontSize: "9px", color: "#185FA5", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 800, marginBottom: "5px" }}>Local Crisis Event</div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "6px" }}>{event.local.t}</div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "10px" }}>{event.local.d}</div>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
              {Object.entries(event.crisis || {}).slice(0, 4).map(([k, v]) => <span key={k} style={{ fontSize: "8px", padding: "2px 6px", borderRadius: "999px", background: riskBg(Number(v)), color: riskC(Number(v)), border: "0.5px solid currentColor" }}>{lifeLabel(k)} {v}</span>)}
            </div>
            <div style={{ fontSize: "11px", color: "#854F0B", lineHeight: 1.6, background: "#fff7e8", border: "0.5px solid #EF9F27", borderRadius: "var(--border-radius-md)", padding: "8px 10px" }}><b>{event.role.t}:</b> {event.role.d}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {event.choices.map((c, i) => (
              <button key={i} onClick={() => onChoice(c)} style={{ ...S.card, textAlign: "left", padding: "11px 12px", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", cursor: "pointer", fontSize: "11px", lineHeight: 1.45, fontFamily: "var(--font-sans)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#EF9F27"; e.currentTarget.style.background = "#fffaf2"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-tertiary)"; e.currentTarget.style.background = "var(--color-background-primary)"; }}
              >
                <Tag tag={c.tag} /><span style={{ marginLeft: "8px" }}>{c.l}</span>
                <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)", marginTop: "4px" }}>{lifePreview(c)}</div>
              </button>
            ))}
          </div>
          <button onClick={onBack} style={{ marginTop: "10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", padding: "8px 11px", cursor: "pointer", fontSize: "10px", fontWeight: 650 }}>End Run and Return to Menu</button>
        </div>
        <div style={{ ...S.panel, padding: "11px", maxHeight: "420px", overflow: "auto" }}>
          <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--color-text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Event Log</div>
          {log.length === 0 ? <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", lineHeight: 1.55 }}>No life decisions recorded yet. Recovery choices, trade-offs, market pressure, and survival notes will appear here.</div> : log.slice().reverse().map((l, i) => <div key={i} style={{ fontSize: "10px", color: "var(--color-text-secondary)", lineHeight: 1.55, borderTop: "0.5px solid var(--color-border-tertiary)", padding: "6px 0" }}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}

function LifeEndingScreen({ ending, profile, stats, controls, onRestart, onMenu }: AnyRecord) {
  return (
    <div style={{ ...S.root, padding: "22px 14px", textAlign: "center" }}>
      {controls}
      <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", letterSpacing: "0.08em", marginBottom: "12px" }}>LIFE DURING CHAOS · {profile.spawn.name}</div>
      <div style={{ fontSize: "20px", fontWeight: 600, color: "#854F0B", marginBottom: "4px" }}>{ending.title}</div>
      <div style={{ display: "inline-block", padding: "3px 18px", border: "1.5px solid #EF9F27", borderRadius: "18px", background: "#FAEEDA", color: "#854F0B", fontWeight: 600, marginBottom: "12px" }}>{ending.grade}</div>
      <div style={{ maxWidth: "520px", margin: "0 auto 14px", fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.75 }}>{ending.body}</div>
      <div style={{ maxWidth: "520px", margin: "0 auto 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "6px", textAlign: "left" }}>
        {[["Role Note", profile.role.note], ["City Note", profile.spawn.note], ["Philosophy", profile.philosophy.note]].map(([k, v]) => (
          <div key={k} style={{ ...S.card, padding: "8px" }}>
            <div style={{ fontSize: "8px", color: "#854F0B", textTransform: "uppercase", fontWeight: 800 }}>{k}</div>
            <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", lineHeight: 1.45, marginTop: "3px" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "4px", maxWidth: "520px", margin: "0 auto 16px" }}>
        {Object.entries(stats as StatMap).map(([k, v]) => <LifeMetric key={k} label={k} value={v} limit={lifeStatMax(k)} />)}
      </div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={onRestart} style={{ padding: "9px 16px", border: "1px solid #EF9F27", borderRadius: "var(--border-radius-md)", background: "#FAEEDA", color: "#854F0B", cursor: "pointer", fontWeight: 600 }}>New Life Run</button>
        <button onClick={onMenu} style={{ padding: "9px 16px", border: "1px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", cursor: "pointer" }}>Main Menu</button>
      </div>
    </div>
  );
}

function ManualOverlay({ onClose }: AnyRecord) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(25,25,23,0.36)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ width: "min(520px, 100%)", background: "var(--color-background-primary)", border: "1px solid var(--color-border-primary)", borderRadius: "var(--border-radius-lg)", padding: "16px", boxShadow: "0 18px 60px rgba(0,0,0,0.22)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)" }}>Manual / Help</div>
          <button onClick={onClose} style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", cursor: "pointer", padding: "5px 9px", fontSize: "11px", fontFamily: "var(--font-sans)" }}>Close</button>
        </div>
        <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 8px" }}><b>War Room:</b> each turn is a crisis day inside a six-act arc. Choose a faction, read the crisis card, and pick one response. Decisions move public stats, global crisis stats, faction pressure stats, the timeline, and the ending.</p>
          <p style={{ margin: "0 0 8px" }}><b>Global crisis stats:</b> stability, escalation, finance, oil, food, semiconductors, cyber, refugees, media panic, alliances, trust, weariness, humanitarian damage, and nuclear risk shape follow-up events.</p>
          <p style={{ margin: "0 0 8px" }}><b>Faction pressure stats:</b> each faction has its own internal stress model: caucuses, allies, Politburo, PLA, EU council unity, P5 consensus, oligarchs, coup risk, Malacca control, and more.</p>
          <p style={{ margin: "0 0 8px" }}><b>Fleet command points:</b> fleets can receive limited orders per day. Each fleet can only be ordered once per day, and command points reset after advancing the turn.</p>
          <p style={{ margin: "0 0 8px" }}><b>Crisis chains:</b> bad stats, prior choices, fleet posture, and timing can trigger follow-up shocks such as banking cyberattacks, tanker insurance spikes, refugee surges, and ceasefire offers.</p>
          <p style={{ margin: "0 0 8px" }}><b>Life During Chaos:</b> play a civilian survival RPG. Daily recovery actions can rebuild cash, career, family, health, supplies, migration readiness, and community trust, but every recovery has trade-offs.</p>
          <p style={{ margin: "0 0 8px" }}><b>Endings:</b> final outcomes explain your stats, decision mix, crisis chains, fleet condition, recovery strategy, and role or faction-specific pressure.</p>
          <p style={{ margin: 0 }}><b>Save and export:</b> saves live only in this browser through localStorage. Export creates a readable text summary for sharing or archiving.</p>
        </div>
      </div>
    </div>
  );
}

function ManualButton({ onClick }: AnyRecord) {
  return (
    <button onClick={onClick} style={{ position: "fixed", top: "8px", right: "8px", zIndex: 30, border: "1px solid var(--color-border-primary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", cursor: "pointer", padding: "6px 10px", fontSize: "11px", fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "var(--font-sans)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>Manual</button>
  );
}

function EndingScreen({ F, ending, stats, controls, onRestart }: AnyRecord) {
  if (!ending) return null;
  const gradeColor = { "A+": "#1D9E75", "A": "#1D9E75", "A-": "#3B6D11", "B+": "#639922", "B": "#639922", "B-": "#BA7517", "C+": "#BA7517", "C": "#BA7517", "C-": "#854F0B", "D": "#E24B4A", "F": "#A32D2D" }[ending.grade] || "#888";
  const gradeBg = { "A+": "#EAF3DE", "A": "#EAF3DE", "A-": "#EAF3DE", "B+": "#EAF3DE", "B": "#EAF3DE", "B-": "#FAEEDA", "C+": "#FAEEDA", "C": "#FAEEDA", "C-": "#FAEEDA", "D": "#FCEBEB", "F": "#FCEBEB" }[ending.grade] || "#f5f5f5";
  const ctx = ending.context || {};
  const counts = Object.entries(ctx.decisionCounts || {}).filter(([, v]) => Number(v) > 0);
  const turns = (ctx.timeline || []).slice(-4).reverse();
  const chains = (ctx.chains || []).slice(-4).reverse();
  const fleet = fleetSummary(ctx.fleets || []);
  return (
    <div style={{ padding: "20px 14px", textAlign: "center" }}>
      {controls}
      <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "16px", letterSpacing: "0.08em" }}>STRAIT PROTOCOL: 2030 · DAY 45</div>
      <div style={{ fontSize: "28px", marginBottom: "8px" }}>{F.flag}</div>
      <div style={{ fontSize: "18px", fontWeight: 500, color: gradeColor, marginBottom: "4px" }}>{ending.title}</div>
      <div style={{ display: "inline-block", padding: "3px 18px", borderRadius: "20px", border: `1.5px solid ${gradeColor}`, fontSize: "16px", fontWeight: 500, color: gradeColor, background: gradeBg, marginBottom: "14px" }}>{ending.grade}</div>
      <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.8, marginBottom: "16px", maxWidth: "440px", margin: "0 auto 16px" }}>{ending.body}</div>
      {(counts.length > 0 || turns.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "8px", maxWidth: "620px", margin: "0 auto 16px", textAlign: "left" }}>
          <div style={{ ...S.card, padding: "10px" }}>
            <div style={{ fontSize: "9px", color: "var(--color-text-secondary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Decision Doctrine</div>
            {counts.map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", borderTop: "0.5px solid var(--color-border-tertiary)", padding: "4px 0" }}><span>{k}</span><b>{v as number}</b></div>)}
          </div>
          <div style={{ ...S.card, padding: "10px" }}>
            <div style={{ fontSize: "9px", color: "var(--color-text-secondary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Defining Turns</div>
            {turns.map((t, i) => <div key={i} style={{ fontSize: "10px", color: "var(--color-text-secondary)", lineHeight: 1.45, borderTop: "0.5px solid var(--color-border-tertiary)", padding: "4px 0" }}>D{t.day}: {t.title} · {t.body}</div>)}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "8px", maxWidth: "620px", margin: "0 auto 16px", textAlign: "left" }}>
        <div style={{ ...S.card, padding: "10px" }}>
          <div style={{ fontSize: "9px", color: "var(--color-text-secondary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Crisis Chains</div>
          {chains.length === 0 ? <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}>No major crisis chains dominated this run.</div> : chains.map((c, i) => <div key={i} style={{ fontSize: "10px", color: "var(--color-text-secondary)", lineHeight: 1.45, borderTop: "0.5px solid var(--color-border-tertiary)", padding: "4px 0" }}>D{c.day}: {c.t}</div>)}
        </div>
        <div style={{ ...S.card, padding: "10px" }}>
          <div style={{ fontSize: "9px", color: "var(--color-text-secondary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Fleet Outcome</div>
          <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", lineHeight: 1.55 }}>Sea control {fleet.seaControl}. Readiness {fleet.readiness}. Supply {fleet.supply}. Fuel {fleet.fuel}. Threat {fleet.threat}.</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "4px", maxWidth: "460px", margin: "0 auto 18px" }}>
        {Object.entries(stats as StatMap).map(([k, v]) => (
          <div key={k} style={{ background: "var(--color-background-secondary)", borderRadius: "6px", padding: "4px 4px", textAlign: "center", border: `0.5px solid ${vBg(v)}` }}>
            <div style={{ fontSize: "8px", color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>{k}</div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: vC(v), marginTop: "1px" }}>{v}</div>
          </div>
        ))}
      </div>
      <button onClick={onRestart} style={{ padding: "9px 22px", border: `1px solid ${F.bd}`, borderRadius: "var(--border-radius-md)", cursor: "pointer", background: "var(--color-background-primary)", fontSize: "11px", fontWeight: 500, color: F.color, fontFamily: "var(--font-sans)" }}>
        ← Choose Another Faction
      </button>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("menu");
  const [fid, setFid] = useState<string | null>(null);
  const [stats, setStats] = useState<StatMap>({});
  const [queue, setQueue] = useState<any[]>([]);
  const [qi, setQi] = useState(0);
  const [day, setDay] = useState(1);
  const [act, setAct] = useState(1);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState("choose");
  const [chosen, setChosen] = useState<any>(null);
  const [sudden, setSudden] = useState<any>(null);
  const [usedSudden, setUsedSudden] = useState<Set<string>>(new Set());
  const [strikes, setStrikes] = useState(0);
  const [ending, setEnding] = useState<any>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [oil, setOil] = useState(145);
  const [recession, setRecession] = useState(22);
  const [nukeAlert, setNukeAlert] = useState(1);
  const [taiwanFuel, setTaiwanFuel] = useState(61);
  const [crisis, setCrisis] = useState<StatMap>({ ...DEFAULT_CRISIS });
  const [warLog, setWarLog] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [decisionCounts, setDecisionCounts] = useState<AnyRecord>(emptyDecisionCounts());
  const [usedFactionEvents, setUsedFactionEvents] = useState<Set<string>>(new Set());
  const [fleetAssets, setFleetAssets] = useState<any[]>([]);
  const [usedFleetEvents, setUsedFleetEvents] = useState<Set<string>>(new Set());
  const [fleetCommandPoints, setFleetCommandPoints] = useState(FLEET_COMMAND_POINTS_PER_DAY);
  const [fleetOrdersToday, setFleetOrdersToday] = useState<AnyRecord>({});
  const [usedChainEvents, setUsedChainEvents] = useState<Set<string>>(new Set());
  const [chainHistory, setChainHistory] = useState<any[]>([]);
  const [lifeDraft, setLifeDraft] = useState<any>({ spawn: "singapore", role: "nurse", philosophy: "protector", length: 30 });
  const [lifeProfile, setLifeProfile] = useState<any>(null);
  const [lifeStats, setLifeStats] = useState<StatMap>({});
  const [lifeMarkets, setLifeMarkets] = useState<StatMap>({});
  const [lifeDay, setLifeDay] = useState(1);
  const [lifeEvent, setLifeEvent] = useState<any>(null);
  const [lifeLog, setLifeLog] = useState<string[]>([]);
  const [lifeStrategyCounts, setLifeStrategyCounts] = useState<AnyRecord>({});
  const [lifeEnding, setLifeEnding] = useState<any>(null);
  const [saveAvailable, setSaveAvailable] = useState(() => !!storageGet(SAVE_KEY));
  const [saveMessage, setSaveMessage] = useState("");

  const F = fid ? FACTIONS[fid] : null;

  const startGame = useCallback((f) => {
    const q = buildQ(f);
    setFid(f); setStats(factionInitialStats(f, { ...FACTIONS[f].startStats })); setQueue(q); setQi(0);
    setDay(1); setAct(1); setTurn(0); setPhase("choose"); setChosen(null); setSudden(null);
    setUsedSudden(new Set()); setStrikes(0); setEnding(null);
    setOil(145); setRecession(22); setNukeAlert(1); setTaiwanFuel(61);
    setCrisis({ ...DEFAULT_CRISIS });
    setWarLog([]); setTimeline([]); setDecisionCounts(emptyDecisionCounts()); setUsedFactionEvents(new Set());
    setFleetAssets(normalizeFleets(f, FACTIONS[f].fleets));
    setUsedFleetEvents(new Set());
    setFleetCommandPoints(FLEET_COMMAND_POINTS_PER_DAY);
    setFleetOrdersToday({});
    setUsedChainEvents(new Set());
    setChainHistory([]);
    setScreen("game");
  }, []);

  const startLife = useCallback(() => {
    const profile = buildLifeProfile(lifeDraft);
    setLifeProfile(profile);
    setLifeStats(profile.stats);
    setLifeMarkets(profile.markets);
    setLifeDay(1);
    setLifeEvent(buildLifeEvent(1, profile));
    setLifeLog([]);
    setLifeStrategyCounts({});
    setLifeEnding(null);
    setScreen("lifeGame");
  }, [lifeDraft]);

  const saveCampaign = useCallback(() => {
    const isLife = screen === "lifeGame" || screen === "lifeEnding" || screen === "lifeSetup";
    const isWar = screen === "game" || screen === "ending";
    const payload = {
      version: 2,
      mode: isLife ? "life" : isWar ? "war" : "menu",
      savedAt: new Date().toISOString(),
      screen, fid, stats, queue, qi, day, act, turn, phase, chosen, sudden, usedSudden: saveSet(usedSudden), strikes, ending,
      oil, recession, nukeAlert, taiwanFuel, crisis, warLog, timeline, decisionCounts, usedFactionEvents: saveSet(usedFactionEvents),
      fleetAssets, usedFleetEvents: saveSet(usedFleetEvents), fleetCommandPoints, fleetOrdersToday, usedChainEvents: saveSet(usedChainEvents), chainHistory,
      lifeDraft, lifeProfile, lifeStats, lifeMarkets, lifeDay, lifeEvent, lifeLog, lifeStrategyCounts, lifeEnding,
    };
    storageSet(SAVE_KEY, JSON.stringify(payload));
    setSaveAvailable(true); setSaveMessage(`Saved ${payload.mode} campaign.`);
  }, [screen, fid, stats, queue, qi, day, act, turn, phase, chosen, sudden, usedSudden, strikes, ending, oil, recession, nukeAlert, taiwanFuel, crisis, warLog, timeline, decisionCounts, usedFactionEvents, fleetAssets, usedFleetEvents, fleetCommandPoints, fleetOrdersToday, usedChainEvents, chainHistory, lifeDraft, lifeProfile, lifeStats, lifeMarkets, lifeDay, lifeEvent, lifeLog, lifeStrategyCounts, lifeEnding]);

  const loadCampaign = useCallback(() => {
    const raw = storageGet(SAVE_KEY);
    if (!raw) { setSaveMessage("No saved campaign found."); setSaveAvailable(false); return; }
    try {
      const p = JSON.parse(raw);
      setFid(p.fid || null); setStats(p.stats || {}); setQueue(p.queue || []); setQi(p.qi || 0); setDay(p.day || 1); setAct(p.act || 1); setTurn(p.turn || 0); setPhase(p.phase || "choose"); setChosen(p.chosen || null); setSudden(p.sudden || null);
      setUsedSudden(restoreSet(p.usedSudden)); setStrikes(p.strikes || 0); setEnding(p.ending || null);
      setOil(p.oil || 145); setRecession(p.recession || 22); setNukeAlert(p.nukeAlert || 1); setTaiwanFuel(p.taiwanFuel || 61); setCrisis(p.crisis || { ...DEFAULT_CRISIS });
      setWarLog(p.warLog || []); setTimeline(p.timeline || []); setDecisionCounts(p.decisionCounts || emptyDecisionCounts()); setUsedFactionEvents(restoreSet(p.usedFactionEvents));
      setFleetAssets(p.fleetAssets || []); setUsedFleetEvents(restoreSet(p.usedFleetEvents)); setFleetCommandPoints(p.fleetCommandPoints ?? FLEET_COMMAND_POINTS_PER_DAY); setFleetOrdersToday(p.fleetOrdersToday || {});
      setUsedChainEvents(restoreSet(p.usedChainEvents)); setChainHistory(p.chainHistory || []);
      setLifeDraft(p.lifeDraft || lifeDraft); setLifeProfile(p.lifeProfile || null); setLifeStats(p.lifeStats || {}); setLifeMarkets(p.lifeMarkets || {}); setLifeDay(p.lifeDay || 1); setLifeEvent(p.lifeEvent || null); setLifeLog(p.lifeLog || []); setLifeStrategyCounts(p.lifeStrategyCounts || {}); setLifeEnding(p.lifeEnding || null);
      setScreen(p.screen === "lifeSetup" ? "lifeSetup" : p.mode === "life" ? (p.screen === "lifeEnding" ? "lifeEnding" : "lifeGame") : p.screen === "ending" ? "ending" : "game");
      setSaveAvailable(true); setSaveMessage(`Loaded ${p.mode || "saved"} campaign.`);
    } catch {
      setSaveMessage("Save could not be loaded. Clear it and save again.");
    }
  }, [lifeDraft]);

  const clearSave = useCallback(() => {
    storageRemove(SAVE_KEY);
    setSaveAvailable(false); setSaveMessage("Saved campaign cleared.");
  }, []);

  const exportSummary = useCallback(() => {
    const isLife = screen === "lifeGame" || screen === "lifeEnding";
    const state = { screen, fid, stats, crisis, day, act, turn, phase, decisionCounts, fleetAssets, fleetCommandPoints, chainHistory, timeline, warLog, lifeProfile, lifeStats, lifeMarkets, lifeDay, lifeLog, lifeStrategyCounts };
    downloadText(`strait-protocol-${isLife ? "life" : "war"}-summary.txt`, isLife ? lifeSummaryText(state) : warSummaryText(state));
    setSaveMessage("Campaign summary exported.");
  }, [screen, fid, stats, crisis, day, act, turn, phase, decisionCounts, fleetAssets, fleetCommandPoints, chainHistory, timeline, warLog, lifeProfile, lifeStats, lifeMarkets, lifeDay, lifeLog, lifeStrategyCounts]);

  const restartActive = useCallback(() => {
    if ((screen === "game" || screen === "ending") && fid) { startGame(fid); setSaveMessage("War Room campaign restarted."); return; }
    if ((screen === "lifeGame" || screen === "lifeEnding") && lifeProfile) {
      setLifeStats(lifeProfile.stats); setLifeMarkets(lifeProfile.markets); setLifeDay(1); setLifeEvent(buildLifeEvent(1, lifeProfile, lifeProfile.stats)); setLifeLog([]); setLifeStrategyCounts({}); setLifeEnding(null); setScreen("lifeGame"); setSaveMessage("Life campaign restarted.");
    }
  }, [screen, fid, startGame, lifeProfile]);

  const pickChoice = useCallback((c, sc) => {
    const crisisDelta = crisisImpact(c);
    const nextCrisis = applyCrisis(crisis, crisisDelta);
    const pressureDelta = factionPressureImpact(fid, c, nextCrisis);
    const ns = apE(apE(stats, c.e), pressureDelta);
    const nt = turn + 1;
    const nd = Math.min(day + rnd(2, 4), 45);
    const na = Math.min(Math.ceil(nt / 7), 6);
    if (c.strike) { setStrikes(s => s + 1); setNukeAlert(n => Math.min(5, n + 1)); }
    if ((c.e.economy || 0) < -10) setRecession(r => Math.min(100, r + 4));
    if ((c.e.fuel || 0) < -5) setOil(o => Math.min(250, o + rnd(5, 15)));
    setTaiwanFuel(t => Math.max(0, t - rnd(1, 4)));
    const category = categoryOf(c);
    const entry = logEntryFor(day, act, F, sc, c);
    const point = turningPointFor(day, act, sc, c, crisisDelta);
    setFleetCommandPoints(FLEET_COMMAND_POINTS_PER_DAY);
    setFleetOrdersToday({});
    setCrisis(nextCrisis);
    setOil(Math.round(92 + nextCrisis.oilShock * 1.35));
    setRecession(Math.max(recession, Math.round(nextCrisis.financialContagion * 0.8)));
    setNukeAlert(Math.max(nukeAlert, Math.min(5, Math.ceil(nextCrisis.nuclearRisk / 22))));
    const nextCounts = { ...decisionCounts, [category]: (decisionCounts[category] || 0) + 1 };
    setDecisionCounts(nextCounts);
    setWarLog(l => [...l, entry].slice(-16));
    setTimeline(t => [...t, point].slice(-10));
    setStats(ns); setDay(nd); setAct(na); setTurn(nt); setChosen({ c, sc, crisisDelta, pressureDelta, category });
    const factionEvent = factionTriggeredEvent(fid, ns, nextCrisis, usedFactionEvents);
    const chainEvent = pickChainEvent({ fid, stats: ns, crisis: nextCrisis, fleets: fleetAssets, act: na, day: nd, counts: nextCounts, lastChoice: c, used: usedChainEvents, history: chainHistory });
    const suddenChance = 0.18 + Math.max(nextCrisis.escalationLevel, nextCrisis.financialContagion, nextCrisis.mediaPanic, nextCrisis.cyberDisruption, 0) / 280;
    if (factionEvent) {
      setUsedFactionEvents(u => new Set([...u, factionEvent.id]));
      setSudden(factionEvent);
    } else if (chainEvent) {
      setUsedChainEvents(u => new Set([...u, chainEvent.id]));
      setChainHistory(h => [...h, { id: chainEvent.id, t: chainEvent.t, day: nd, act: na, score: chainEvent.score }].slice(-12));
      setWarLog(l => [...l, `D${nd} · Crisis Chain: ${chainEvent.t}. ${chainEvent.d}`].slice(-16));
      setTimeline(t => [...t, { day: nd, act: na, title: "Crisis Chain", body: `${chainEvent.t} · score ${chainEvent.score}` }].slice(-10));
      setSudden(chainEvent);
    } else if (Math.random() < suddenChance) {
      const se = pickSuddenEvent(usedSudden, nextCrisis);
      if (se) { setUsedSudden(u => new Set([...u, se.id])); setSudden(se); }
    }
    setPhase("result");
  }, [stats, crisis, turn, day, act, F, fid, usedSudden, usedFactionEvents, usedChainEvents, chainHistory, decisionCounts, fleetAssets, recession, nukeAlert]);

  const handleFleetAction = useCallback((idx: number, action: string) => {
    const fl = fleetAssets[idx];
    if (!fl || !fid) return;
    const fleetKey = fl.id || `${fid}-${idx}`;
    const cost = fleetActionCost(action);
    const blockReason = fleetOrdersToday[fleetKey]
      ? "This fleet already received orders today"
      : cost > fleetCommandPoints
        ? "No Fleet Command Points remaining"
        : fleetStatusBlockReason(fl, action);
    if (blockReason) {
      setWarLog(l => [...l, `D${day} - Fleet order blocked: ${blockReason}. ${fl.name} could not execute ${action}.`].slice(-16));
      return;
    }
    const effect = fleetActionEffect(fid, fl, action);
    const nextFleet = applyFleetPatch(fl, effect);
    const nextFleets = fleetAssets.map((f, i) => i === idx ? nextFleet : f);
    const nextStats = apE(stats, effect.stats || {});
    const nextCrisis = applyCrisis(crisis, effect.crisis || {});
    const summary = fleetSummary(nextFleets);
    setFleetCommandPoints(p => Math.max(0, p - cost));
    setFleetOrdersToday(o => ({ ...o, [fleetKey]: action }));
    setFleetAssets(nextFleets);
    setStats(nextStats);
    setCrisis(nextCrisis);
    setOil(Math.round(92 + nextCrisis.oilShock * 1.35));
    setRecession(Math.max(recession, Math.round(nextCrisis.financialContagion * 0.8)));
    setNukeAlert(Math.max(nukeAlert, Math.min(5, Math.ceil(nextCrisis.nuclearRisk / 22))));
    setWarLog(l => [...l, `D${day} · Fleet: ${action} ordered for ${fl.name}. Mission now "${nextFleet.mission}". Sea control ${summary.seaControl}.`].slice(-16));
    setTimeline(t => [...t, { day, act, title: "Fleet Action", body: `${action}: ${fl.name} · readiness ${nextFleet.readiness}, fuel ${nextFleet.fuel}` }].slice(-10));
  }, [fleetAssets, fid, stats, crisis, recession, nukeAlert, day, act, fleetCommandPoints, fleetOrdersToday]);

  const nextTurn = useCallback(() => {
    let ns = stats;
    if (sudden) {
      ns = apE(stats, sudden.e);
      const nextCrisis = applyCrisis(crisis, sudden.crisis || SUDDEN_CRISIS_EFFECTS[sudden.id] || {});
      setStats(ns); setCrisis(nextCrisis); setSudden(null);
      setOil(Math.round(92 + nextCrisis.oilShock * 1.35));
      setRecession(Math.max(recession, Math.round(nextCrisis.financialContagion * 0.8)));
      setNukeAlert(Math.max(nukeAlert, Math.min(5, Math.ceil(nextCrisis.nuclearRisk / 22))));
    }
    const fleetEvent = fleetTriggeredEvent(fid, fleetAssets, usedFleetEvents);
    if (!sudden && fleetEvent) {
      setUsedFleetEvents(u => new Set([...u, fleetEvent.id]));
      setSudden(fleetEvent);
    }
    const ni = qi + 1;
    if (turn >= 42 || day >= 45 || ni >= queue.length) {
      setEnding(getEnding(fid, ns, { crisis, decisionCounts, timeline, log: warLog, strikes, fleets: fleetAssets, chains: chainHistory })); setScreen("ending"); return;
    }
    setQi(ni); setPhase("choose");
  }, [stats, crisis, sudden, qi, turn, day, queue, fid, recession, nukeAlert, decisionCounts, timeline, warLog, strikes, fleetAssets, usedFleetEvents, chainHistory]);

  const pickLifeChoice = useCallback((choice) => {
    if (!lifeProfile || !lifeEvent) return;
    const resolved = resolveLifeChoice(lifeStats, lifeMarkets, lifeEvent, choice, lifeDay);
    const nextLog = [...lifeLog, resolved.entry].slice(-12);
    const nextStrategies = { ...lifeStrategyCounts, [choice.strategy || "general"]: (lifeStrategyCounts[choice.strategy || "general"] || 0) + 1 };
    setLifeStrategyCounts(nextStrategies);
    if (lifeDay >= lifeProfile.length) {
      setLifeStats(resolved.stats); setLifeMarkets(resolved.markets); setLifeLog(nextLog);
      setLifeEnding(getLifeEnding(lifeProfile, resolved.stats, { strategyCounts: nextStrategies })); setScreen("lifeEnding"); return;
    }
    const nd = lifeDay + 1;
    setLifeStats(resolved.stats); setLifeMarkets(resolved.markets); setLifeLog(nextLog);
    setLifeDay(nd); setLifeEvent(buildLifeEvent(nd, lifeProfile, resolved.stats));
  }, [lifeProfile, lifeEvent, lifeStats, lifeMarkets, lifeDay, lifeLog, lifeStrategyCounts]);

  const activeControls = <CampaignControls mode={screen === "lifeGame" || screen === "lifeEnding" ? "Life Campaign" : "War Room Campaign"} canLoad={saveAvailable} message={saveMessage} onSave={saveCampaign} onLoad={loadCampaign} onClear={clearSave} onExport={exportSummary} onRestart={restartActive} />;

  if (screen === "menu") return <div style={S.root}><MainMenu onWar={() => setScreen("faction")} onLife={() => setScreen("lifeSetup")} canLoad={saveAvailable} saveMessage={saveMessage} onLoad={loadCampaign} onClear={clearSave} /></div>;
  if (screen === "lifeSetup") return <LifeSetupScreen draft={lifeDraft} setDraft={setLifeDraft} onStart={startLife} onBack={() => setScreen("menu")} />;
  if (screen === "lifeGame" && lifeProfile && lifeEvent) return <LifeGameScreen profile={lifeProfile} day={lifeDay} stats={lifeStats} markets={lifeMarkets} event={lifeEvent} log={lifeLog} controls={activeControls} onChoice={pickLifeChoice} onBack={() => setScreen("menu")} />;
  if (screen === "lifeEnding" && lifeProfile) return <LifeEndingScreen ending={lifeEnding} profile={lifeProfile} stats={lifeStats} controls={activeControls} onRestart={() => setScreen("lifeSetup")} onMenu={() => setScreen("menu")} />;
  if (screen === "faction") return <div style={S.root}><ManualButton onClick={() => setManualOpen(true)} />{manualOpen && <ManualOverlay onClose={() => setManualOpen(false)} />}<FactionScreen onPick={startGame} /></div>;
  if (screen === "ending") return <div style={S.root}><ManualButton onClick={() => setManualOpen(true)} />{manualOpen && <ManualOverlay onClose={() => setManualOpen(false)} />}<EndingScreen F={F} ending={ending} stats={stats} controls={activeControls} onRestart={() => setScreen("faction")} /></div>;
  if (!F) return null;

  const sc = queue[qi];
  if (!sc) return null;

  const nukeColors = ["#1D9E75", "#BA7517", "#BA7517", "#E24B4A", "#A32D2D"];
  const fleetOps = fleetSummary(fleetAssets);

  return (
    <div style={S.root}>
      <ManualButton onClick={() => setManualOpen(true)} />
      {manualOpen && <ManualOverlay onClose={() => setManualOpen(false)} />}
      {activeControls}
      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.84)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "8px 14px", boxShadow: "0 6px 20px rgba(20,35,45,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.08em", color: F.color }}>STRAIT PROTOCOL: 2030</div>
            <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)", marginTop: "1px" }}>{F.flag} {F.sub} · {ACTS[act]} · Day {day}/45 · Turn {turn + 1}</div>
          </div>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {strikes > 0 && <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: "#FCEBEB", color: "#A32D2D", border: "0.5px solid #F09595", fontWeight: 500 }}>⚡{strikes} strike{strikes !== 1 ? "s" : ""}</span>}
            <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: "#EEEDFE", color: nukeColors[nukeAlert - 1], border: "0.5px solid #AFA9EC", fontWeight: 500 }}>☢️ {nukeAlert}/5</span>
            <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: vBg(taiwanFuel), color: vC(taiwanFuel), border: "0.5px solid currentColor", fontWeight: 500 }}>🇹🇼 {taiwanFuel}%</span>
            <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: recession > 50 ? "#FCEBEB" : recession > 30 ? "#FAEEDA" : "#EAF3DE", color: recession > 50 ? "#A32D2D" : recession > 30 ? "#854F0B" : "#3B6D11", border: "0.5px solid currentColor", fontWeight: 500 }}>📉 {recession}%</span>
            <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: "#FAEEDA", color: "#854F0B", border: "0.5px solid #EF9F27", fontWeight: 500 }}>🛢️ ${oil}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "2px" }}>
          {[1, 2, 3, 4, 5, 6].map(a => (
            <div key={a} style={{ flex: 1, height: "4px", borderRadius: "2px", background: a < act ? "#1D9E75" : a === act ? F.color : "var(--color-border-tertiary)", transition: "all 0.3s" }} />
          ))}
        </div>
      </div>

      <StrategicDashboard F={F} fid={fid} stats={stats} crisis={crisis} counts={decisionCounts} />
      <ActProgress act={act} day={day} F={F} />

      {/* Primary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: "5px", padding: "8px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", maxWidth: "1120px", margin: "0 auto" }}>
        {Object.entries(stats).slice(0, 6).map(([k, v]) => <StatBar key={k} label={k} value={v} />)}
      </div>

      {/* Secondary stats */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", padding: "4px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
        {Object.entries(stats).slice(6).filter(([k]) => !factionPressureKeys(fid).includes(k)).map(([k, v]) => (
          <span key={k} style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: "var(--color-background-primary)", border: `0.5px solid ${vBg(v)}` }}>
            <span style={{ fontWeight: 500, color: vC(v) }}>{v}</span>
            <span style={{ color: "var(--color-text-secondary)" }}> {k}</span>
          </span>
        ))}
      </div>

      {/* Global crisis state */}
      <div style={{ padding: "9px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "rgba(244,247,248,0.82)" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
          <div style={{ fontSize: "9px", fontWeight: 800, color: "var(--color-text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Global Crisis Board</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(132px,1fr))", gap: "5px" }}>
            {Object.entries(CRISIS_META).map(([id]) => <CrisisTile key={id} id={id} value={crisis[id]} />)}
          </div>
        </div>
      </div>

      {/* Fleet status */}
      <div style={{ padding: "9px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "rgba(255,255,255,0.5)" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
        <div style={{ fontSize: "9px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>⚓ Fleet Status · Transit ETA · Supply Days</div>
        <div style={{ fontSize: "9px", fontWeight: 800, color: fleetCommandPoints > 0 ? "#185FA5" : "#A32D2D", background: fleetCommandPoints > 0 ? "#E6F1FB" : "#FCEBEB", border: `0.5px solid ${fleetCommandPoints > 0 ? "#85B7EB" : "#F09595"}`, borderRadius: "999px", padding: "3px 8px", display: "inline-block", marginBottom: "6px" }}>Fleet Command Points: {fleetCommandPoints}/{FLEET_COMMAND_POINTS_PER_DAY}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "5px", marginBottom: "6px" }}>
          <PressureMetric id="seaControl" value={fleetOps.seaControl} meta={{ label: "Sea Control" }} />
          <PressureMetric id="fleetReadiness" value={fleetOps.readiness} meta={{ label: "Fleet Readiness" }} />
          <PressureMetric id="fleetSupply" value={fleetOps.supply} meta={{ label: "Supply Depth" }} />
          <PressureMetric id="fleetThreat" value={fleetOps.threat} meta={{ label: "Fleet Threat", riskHigh: true }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: "5px" }}>
          {fleetAssets.map((fl, i) => <FleetOpsCard key={fl.id || i} fl={fl} commandPoints={fleetCommandPoints} orderedToday={!!fleetOrdersToday[fl.id || `${fid}-${i}`]} onAction={(a) => handleFleetAction(i, a)} />)}
        </div>
        </div>
      </div>

      {/* Act bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 14px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", maxWidth: "1120px", margin: "0 auto" }}>
        <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--color-text-primary)" }}>Act {act}: {ACTS[act]}</span>
        <span style={{ fontSize: "9px", color: "var(--color-text-tertiary)" }}>Day {day} of 45 · Turn {turn + 1}</span>
      </div>

      {/* Main content */}
      <div style={{ ...S.shell, paddingTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "10px", alignItems: "start" }}>
        <div>
        {phase === "choose" && (
          <div style={{ ...S.panel, padding: "14px" }}>
            <div style={{ fontSize: "9px", color: F.color, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 800, marginBottom: "5px" }}>Active Crisis Card</div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "6px", lineHeight: 1.35 }}>{sc.t}</div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.75, marginBottom: "10px" }}>{sc.b}</div>
            {sc.i && (
              <div style={{ background: "var(--color-background-secondary)", borderLeft: `3px solid ${F.color}`, borderRadius: "0 var(--border-radius-md) var(--border-radius-md) 0", padding: "7px 11px", marginBottom: "12px", fontSize: "10px", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                🔍 {sc.i}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {sc.c.map((c, i) => (
                <button key={i} onClick={() => pickChoice(c, sc)}
                  style={{ textAlign: "left", padding: "10px 12px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", background: "var(--color-background-primary)", fontSize: "11px", color: "var(--color-text-primary)", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: "8px", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--color-background-secondary)"; e.currentTarget.style.borderColor = "var(--color-border-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--color-background-primary)"; e.currentTarget.style.borderColor = "var(--color-border-tertiary)"; }}
                >
                  <Tag tag={c.tag} strike={c.strike} />
                  <span style={{ display: "grid", gap: "3px" }}>
                    <span>{c.l}</span>
                    <span style={{ fontSize: "9px", color: "var(--color-text-tertiary)", lineHeight: 1.35 }}>{previewFor(c)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "result" && chosen && (
          <div style={{ ...S.panel, padding: "14px" }}>
            <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", marginBottom: "6px" }}>{chosen.sc.t}</div>
            <div style={{ borderLeft: `3px solid ${chosen.c.type === "good" ? "#1D9E75" : chosen.c.type === "bad" ? "#E24B4A" : "#BA7517"}`, background: "var(--color-background-secondary)", borderRadius: "0 var(--border-radius-md) var(--border-radius-md) 0", padding: "11px 13px", marginBottom: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: 500, marginBottom: "5px", display: "flex", alignItems: "flex-start", gap: "6px", flexWrap: "wrap" }}>
                <Tag tag={chosen.c.tag} />
                <span style={{ color: "var(--color-text-primary)" }}>{chosen.c.l}</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "8px" }}>{chosen.c.o}</div>
              <div style={{ fontSize: "10px", color: F.color, lineHeight: 1.55, marginBottom: "8px", background: F.bg, border: `0.5px solid ${F.bd}`, borderRadius: "var(--border-radius-md)", padding: "7px 9px" }}><b>Why this happened:</b> {whyWarChoice(chosen, crisis)}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                {Object.entries(chosen.c.e as StatMap).map(([k, v]) => v !== 0 ? (
                  <span key={k} style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "6px", background: v > 0 ? "#EAF3DE" : "#FCEBEB", border: `0.5px solid ${v > 0 ? "#97C459" : "#F09595"}`, color: v > 0 ? "#3B6D11" : "#A32D2D", fontWeight: 500 }}>
                    {v > 0 ? "+" : ""}{v} {k}
                  </span>
                ) : null)}
                {Object.entries((chosen.pressureDelta || {}) as StatMap).map(([k, v]) => {
                  const meta = factionMeta(fid).stats[k] || {};
                  const n = Number(v);
                  const goodMove = meta.riskHigh ? n < 0 : n > 0;
                  return n !== 0 ? (
                    <span key={k} style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "6px", background: goodMove ? "#EAF3DE" : "#FCEBEB", border: `0.5px solid ${goodMove ? "#97C459" : "#F09595"}`, color: goodMove ? "#3B6D11" : "#A32D2D", fontWeight: 500 }}>
                      {n > 0 ? "+" : ""}{n} {meta.label || k}
                    </span>
                  ) : null;
                })}
                {Object.entries(chosen.crisisDelta as StatMap).map(([k, v]) => {
                  const n = Number(v);
                  const goodMove = CRISIS_META[k]?.goodHigh ? n > 0 : n < 0;
                  return n !== 0 ? (
                    <span key={k} style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "6px", background: goodMove ? "#EAF3DE" : "#FCEBEB", border: `0.5px solid ${goodMove ? "#97C459" : "#F09595"}`, color: goodMove ? "#3B6D11" : "#A32D2D", fontWeight: 500 }}>
                      {n > 0 ? "+" : ""}{n} {CRISIS_META[k]?.label || k}
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            {sudden && (
              <div style={{ background: "#FAEEDA", borderLeft: "3px solid #BA7517", borderRadius: "0 var(--border-radius-md) var(--border-radius-md) 0", padding: "9px 13px", marginBottom: "8px" }}>
                <div style={{ fontSize: "10px", fontWeight: 500, color: "#854F0B", marginBottom: "2px" }}>{sudden.icon} Sudden Event: {sudden.t}</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", marginBottom: "5px" }}>{sudden.d}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                  {Object.entries(sudden.e as StatMap).map(([k, v]) => v !== 0 ? (
                    <span key={k} style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "6px", background: v > 0 ? "#EAF3DE" : "#FCEBEB", border: `0.5px solid ${v > 0 ? "#97C459" : "#F09595"}`, color: v > 0 ? "#3B6D11" : "#A32D2D", fontWeight: 500 }}>
                      {v > 0 ? "+" : ""}{v} {k}
                    </span>
                  ) : null)}
                  {Object.entries((sudden.crisis || SUDDEN_CRISIS_EFFECTS[sudden.id] || {}) as StatMap).map(([k, v]) => {
                    const n = Number(v);
                    const goodMove = CRISIS_META[k]?.goodHigh ? n > 0 : n < 0;
                    return n !== 0 ? (
                      <span key={k} style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "6px", background: goodMove ? "#EAF3DE" : "#FCEBEB", border: `0.5px solid ${goodMove ? "#97C459" : "#F09595"}`, color: goodMove ? "#3B6D11" : "#A32D2D", fontWeight: 500 }}>
                        {n > 0 ? "+" : ""}{n} {CRISIS_META[k]?.label || k}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <button onClick={nextTurn}
              style={{ width: "100%", padding: "10px", border: `1px solid ${F.bd}`, borderRadius: "var(--border-radius-md)", cursor: "pointer", background: "var(--color-background-primary)", fontSize: "11px", fontWeight: 500, color: F.color, letterSpacing: "0.04em", fontFamily: "var(--font-sans)", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = F.bg; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--color-background-primary)"; }}
            >
              Continue → Day {Math.min(day + 3, 45)}
            </button>
          </div>
        )}
        </div>
        <WarRoomSidePanel log={warLog} timeline={timeline} />
      </div>
    </div>
  );
}
