import { rng } from "./rng";
export type StatMap = Record<string, number>;
export type AnyRecord = Record<string, any>;

export const cl = v => Math.max(0, Math.min(100, Math.round(v)));
export const rnd = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
export const sfl = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const apE = (s, e = {}) => { const n = { ...s }; Object.entries(e).forEach(([k, v]) => { if (n[k] !== undefined) n[k] = cl(n[k] + v); }); return n; };

export const ACTS = { 1: "Crisis Erupts", 2: "Alliance Formation", 3: "Economic War", 4: "Military Threshold", 5: "Regional Spillover", 6: "Endgame" };
export const TCOL = { MIL: { bg: "#FCEBEB", tx: "#A32D2D", bd: "#F09595" }, DIP: { bg: "#E6F1FB", tx: "#185FA5", bd: "#85B7EB" }, ECO: { bg: "#EAF3DE", tx: "#3B6D11", bd: "#97C459" }, INT: { bg: "#EEEDFE", tx: "#3C3489", bd: "#AFA9EC" }, STR: { bg: "#FAECE7", tx: "#712B13", bd: "#F0997B" }, FIN: { bg: "#FAEEDA", tx: "#633806", bd: "#EF9F27" }, SUP: { bg: "#E1F5EE", tx: "#085041", bd: "#5DCAA5" }, PRX: { bg: "#FBEAF0", tx: "#72243E", bd: "#ED93B1" }, LOG: { bg: "#E6F1FB", tx: "#185FA5", bd: "#85B7EB" }, ECO2: { bg: "#EAF3DE", tx: "#3B6D11", bd: "#97C459" } };
export const tc = tag => TCOL[tag] || TCOL.DIP;
export const vC = v => v >= 65 ? "#1D9E75" : v >= 40 ? "#BA7517" : "#E24B4A";
export const vBg = v => v >= 65 ? "#EAF3DE" : v >= 40 ? "#FAEEDA" : "#FCEBEB";
export const riskC = v => v < 35 ? "#1D9E75" : v < 65 ? "#BA7517" : "#E24B4A";
export const riskBg = v => v < 35 ? "#EAF3DE" : v < 65 ? "#FAEEDA" : "#FCEBEB";
export const thrC = t => ({ High: "#A32D2D", Critical: "#A32D2D", Active: "#A32D2D", Imminent: "#712B13", Strategic: "#3C3489", Medium: "#854F0B", Low: "#3B6D11", None: "#888", "N/A": "#888" }[t] || "#888");
export const thrBg = t => ({ High: "#FCEBEB", Critical: "#FCEBEB", Active: "#FCEBEB", Imminent: "#FAECE7", Strategic: "#EEEDFE", Medium: "#FAEEDA", Low: "#EAF3DE", None: "#f5f5f5", "N/A": "#f5f5f5" }[t] || "#f5f5f5");
export const stC = s => ({ deployed: "#A32D2D", blockade: "#A32D2D", active: "#1D9E75", "combat alert": "#A32D2D", "on standby": "#854F0B", "forward deployed": "#A32D2D", staging: "#854F0B", transit: "#854F0B", standby: "#888", covert: "#3C3489", patrol: "#3C3489", harbor: "#1D9E75", alert: "#854F0B", approaching: "#712B13", "on-station": "#1D9E75", defensive: "#888", secured: "#3C3489", partial: "#854F0B", inactive: "#888" }[s] || "#888");
export const supC = d => d >= 999 ? "#1D9E75" : d < 15 ? "#A32D2D" : d < 30 ? "#BA7517" : "#1D9E75";

export const CRISIS_META: AnyRecord = {
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
export const DEFAULT_CRISIS: StatMap = { globalStability: 62, escalationLevel: 22, financialContagion: 24, oilShock: 32, foodInflation: 28, semiconductorSupply: 72, shippingInsuranceCost: 34, cyberDisruption: 18, refugeePressure: 16, mediaPanic: 25, allianceCohesion: 58, publicTrust: 54, warWeariness: 12, humanitarianDamage: 14, nuclearRisk: 12 };
export const crisisC = (k, v) => CRISIS_META[k]?.goodHigh ? vC(v) : riskC(v);
export const crisisBg = (k, v) => CRISIS_META[k]?.goodHigh ? vBg(v) : riskBg(v);
export const applyCrisis = (s: StatMap, e: StatMap = {}) => {
  const n = { ...s };
  Object.entries(e).forEach(([k, v]) => { if (n[k] !== undefined) n[k] = cl(n[k] + Number(v)); });
  return n;
};
export const crisisImpact = (c: AnyRecord): StatMap => {
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
export const DECISION_CATEGORIES: AnyRecord = {
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
export const categoryOf = (c: AnyRecord) => c.strike ? "Military" : (DECISION_CATEGORIES[c.tag] || "Diplomacy");
export const decisionCategoryKeys = ["Military", "Diplomacy", "Cyber", "Finance", "Intelligence", "Logistics", "Domestic Politics", "Humanitarian"];
export const emptyDecisionCounts = () => Object.fromEntries(decisionCategoryKeys.map(k => [k, 0]));
export const topDeltas = (e: StatMap = {}, meta: AnyRecord = {}, limit = 3) => Object.entries(e)
  .filter(([, v]) => Number(v) !== 0)
  .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])))
  .slice(0, limit)
  .map(([k, v]) => `${Number(v) > 0 ? "+" : ""}${v} ${meta[k]?.label || k}`);
export const previewFor = (c: AnyRecord) => {
  const cat = categoryOf(c);
  const direct = topDeltas(c.e || {}, {}, 2);
  const global = topDeltas(crisisImpact(c), CRISIS_META, 2);
  const tone = c.type === "good" ? "Lower-risk" : c.type === "bad" ? "High-risk" : "Tradeoff";
  return `${cat} · ${tone}${direct.length ? ` · ${direct.join(", ")}` : ""}${global.length ? ` · Global: ${global.join(", ")}` : ""}`;
};
export const factionFocus = (fid: string, st: StatMap) => {
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
export const strategicPosture = (fid: string, st: StatMap, crisis: StatMap) => {
  if (crisis.nuclearRisk >= 65 || crisis.escalationLevel >= 75) return "Brink management";
  if (crisis.financialContagion >= 65 || crisis.oilShock >= 65) return "Economic firebreak";
  if (fid === "asean" && (st.unity || 0) < 45) return "Bloc survival";
  if (fid === "north_korea" && (st.food || 0) < 40) return "Regime triage";
  if (fid === "un" && (st.hum || 0) < 45) return "Humanitarian access";
  if ((st.military || 0) >= 75) return "Hard-power leverage";
  if ((st.credibility || 0) >= 70) return "Diplomatic leverage";
  return "Crisis balancing";
};
export const logEntryFor = (day: number, act: number, faction: AnyRecord, sc: AnyRecord, c: AnyRecord) =>
  `D${day} · Act ${act} · ${categoryOf(c)}: ${faction.sub} chose "${c.l}" during "${sc.t}". ${c.o}`;
export const turningPointFor = (day: number, act: number, sc: AnyRecord, c: AnyRecord, crisisDelta: StatMap) => {
  const largest = topDeltas(crisisDelta, CRISIS_META, 1)[0];
  const marker = c.strike ? "Strike threshold" : c.type === "bad" ? "Crisis setback" : c.type === "good" ? "Strategic gain" : "Major tradeoff";
  return { day, act, title: marker, body: `${sc.t}${largest ? ` · ${largest}` : ""}` };
};

export const pressureC = (meta: AnyRecord, v: number) => meta?.riskHigh ? riskC(v) : vC(v);
export const pressureBg = (meta: AnyRecord, v: number) => meta?.riskHigh ? riskBg(v) : vBg(v);

export const FACTION_IDENTITY: AnyRecord = {
  us_dem: { why: "Win through coalition legitimacy. Speed helps, but caucus pressure and funding can hollow out the mandate.", mechanic: "Legitimacy balance: keep allied confidence above caucus pressure while preserving funding.", stats: { prog: { label: "Progressive Caucus Pressure", start: 46, riskHigh: true }, alliedConf: { label: "Allied Confidence", start: 64 }, approvalFloor: { label: "Approval Floor", start: 58 }, funding: { label: "Congressional Funding", start: 62 } } },
  us_rep: { why: "Win through deterrence without frightening allies into hedging. Hawks reward force; allies punish recklessness.", mechanic: "Deterrence bargain: raise credibility and mandate while containing allied anxiety.", stats: { hawk: { label: "Hawk Pressure", start: 64, riskHigh: true }, alliedAnxiety: { label: "Allied Anxiety", start: 42, riskHigh: true }, deterrence: { label: "Deterrence Credibility", start: 68 }, warMandate: { label: "War Mandate", start: 56 } } },
  china: { why: "The clock is internal as much as military. Blockade gains mean little if protest risk, PLA loyalty, or legitimacy breaks first.", mechanic: "Blockade clock: raise blockade effectiveness before protest and elite pressure overtake it.", stats: { politburoUnity: { label: "Politburo Unity", start: 64 }, plaLoyalty: { label: "PLA Loyalty", start: 76 }, xiLegitimacy: { label: "Xi Legitimacy", start: 70 }, protestRisk: { label: "Protest Risk", start: 32, riskHigh: true }, blockade: { label: "Blockade Effectiveness", start: 58 } } },
  eu: { why: "Europe wins by making economic statecraft decisive before member-state splits drain authority.", mechanic: "Sanctions fulcrum: convert sanctions leverage without collapsing council unity or energy resilience.", stats: { councilUnity: { label: "Council Unity", start: 58 }, energyResilience: { label: "Energy Resilience", start: 52 }, sanctionsLeverage: { label: "Sanctions Leverage", start: 66 }, defectionRisk: { label: "Defection Risk", start: 36, riskHigh: true } } },
  un: { why: "The UN cannot win by force. It wins when access, observers, and P5 language survive long enough to become a ceasefire.", mechanic: "Access versus paralysis: build corridors and observers while P5 consensus stays above collapse.", stats: { p5Consensus: { label: "P5 Consensus", start: 42 }, humanitarianAccess: { label: "Humanitarian Access", start: 56 }, observerCredibility: { label: "Observer Credibility", start: 52 }, ceasefireFramework: { label: "Ceasefire Framework", start: 34 } } },
  russia: { why: "Chaos is profitable until NATO re-centers on Europe. Every auction carries an encirclement price.", mechanic: "Chaos auction: grow energy leverage and Ukraine opportunity while NATO alert stays manageable.", stats: { oligarchLoyalty: { label: "Oligarch Loyalty", start: 66 }, natoAlert: { label: "NATO Alert Level", start: 60, riskHigh: true }, energyLeverage: { label: "Energy Leverage", start: 72 }, ukraineOpportunity: { label: "Ukraine Opportunity", start: 58 } } },
  north_korea: { why: "Leverage rises with missile drama, but food shortage and elite fear can turn bargaining into regime risk.", mechanic: "Extortion ladder: climb missile pressure for concessions while food reserve and coup risk remain survivable.", stats: { kimLoyalty: { label: "Kim Loyalty", start: 76 }, foodReserve: { label: "Food Reserve", start: 42 }, militaryLoyalty: { label: "Military Loyalty", start: 64 }, coupRisk: { label: "Coup Risk", start: 28, riskHigh: true }, missileLadder: { label: "Missile Ladder", start: 38, riskHigh: true } } },
  asean: { why: "ASEAN survives by balancing neutrality, Malacca control, currency defense, and member-state alignment.", mechanic: "Neutrality balance: keep unity and currency stability high while China and US dependency avoid capture.", stats: { aseanUnity: { label: "ASEAN Unity", start: 55 }, malaccaControl: { label: "Malacca Control", start: 78 }, currencyStability: { label: "Currency Stability", start: 48 }, singaporePosition: { label: "Singapore Position", start: 62 }, malaysiaPosition: { label: "Malaysia Position", start: 52 }, indonesiaPosition: { label: "Indonesia Position", start: 54 }, vietnamPosition: { label: "Vietnam Position", start: 58 }, philippinesPosition: { label: "Philippines Position", start: 60 }, chinaDependency: { label: "China Dependency", start: 44, riskHigh: true }, usDependency: { label: "US Dependency", start: 42, riskHigh: true } } },
};
export const factionMeta = (fid: string) => FACTION_IDENTITY[fid] || { stats: {}, why: "", mechanic: "" };
export const factionPressureKeys = (fid: string) => Object.keys(factionMeta(fid).stats || {});
export const factionInitialStats = (fid: string, base: StatMap) => ({ ...base, ...Object.fromEntries(factionPressureKeys(fid).map(k => [k, factionMeta(fid).stats[k].start])) });
export const factionPressureImpact = (fid: string, c: AnyRecord, crisis: StatMap): StatMap => {
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
export const factionTriggeredEvent = (fid: string, st: StatMap, crisis: StatMap, used: Set<string>) => {
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
export const factionEndingNote = (fid: string, st: StatMap) => {
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
export const fleetRisk = (t = "Low") => ({ None: 5, Low: 18, Medium: 38, High: 62, Critical: 82, Active: 64, Imminent: 74, Strategic: 70, "N/A": 5 }[t] || 35);
export const fleetMissionFor = (fid: string, fl: AnyRecord) => {
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
export const normalizeFleets = (fid: string, fleets: AnyRecord[] = []) => fleets.map((fl, i) => ({
  ...fl,
  id: `${fid}-${i}`,
  location: fl.front,
  mission: fl.mission || fleetMissionFor(fid, fl),
  fuel: fl.fuel ?? cl((fl.sup >= 999 ? 82 : fl.sup * 2) + (fl.status === "deployed" || fl.status === "blockade" ? 10 : 0)),
  readiness: fl.readiness ?? cl(72 + (fl.status === "deployed" || fl.status === "active" || fl.status === "combat alert" ? 12 : 0) - (fl.sup < 20 ? 18 : 0) - Math.round(fleetRisk(fl.threat) / 8)),
}));
export const fleetSummary = (fleets: AnyRecord[] = []) => {
  const n = Math.max(1, fleets.length);
  const avg = (k: string) => Math.round(fleets.reduce((a, f) => a + Number(f[k] || 0), 0) / n);
  const forward = fleets.filter(f => ["deployed", "blockade", "active", "combat alert", "forward deployed", "on-station"].includes(f.status)).length;
  const threat = Math.round(fleets.reduce((a, f) => a + fleetRisk(f.threat), 0) / n);
  return { seaControl: cl(avg("readiness") + forward * 4 - threat / 3), readiness: avg("readiness"), supply: avg("sup"), fuel: avg("fuel"), threat };
};
export const fleetActionEffect = (fid: string, fl: AnyRecord, action: string) => {
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
export const applyFleetPatch = (fl: AnyRecord, e: AnyRecord) => ({
  ...fl,
  status: e.status || fl.status,
  mission: e.mission || fl.mission,
  eta: e.eta ?? fl.eta,
  fuel: cl((fl.fuel ?? 50) + (e.fuel || 0)),
  sup: fl.sup >= 999 ? 999 : Math.max(0, Math.round((fl.sup || 0) + (e.sup || 0))),
  readiness: cl((fl.readiness ?? 55) + (e.readiness || 0)),
});
export const FLEET_COMMAND_POINTS_PER_DAY = 2;
export const fleetActionCost = (action: string) => action === "Strike Ready" ? 2 : 1;
export const fleetStatusBlockReason = (fl: AnyRecord, action: string) => {
  const status = String(fl.status || "").toLowerCase();
  const name = String(fl.name || "").toLowerCase();
  if (name.includes("hostile") || status === "approaching") return "Action unavailable due to fleet status";
  if (status === "inactive" && !["Hold", "Resupply"].includes(action)) return "Action unavailable due to fleet status";
  if (status === "harbor" && ["Interdict", "Strike Ready"].includes(action)) return "Action unavailable due to fleet status";
  return "";
};
export const fleetTriggeredEvent = (fid: string, fleets: AnyRecord[], used: Set<string>) => {
  const s = fleetSummary(fleets);
  const list = [
    { id: "fleet_supply_crunch", when: () => s.supply < 20, t: "Fleet Supply Crunch", d: "Forward assets report that fuel and munitions are being rationed. The next operational window is narrowing.", e: { military: -6, supply: -5, credibility: -3 }, crisis: { shippingInsuranceCost: 5, escalationLevel: 2 } },
    { id: "fleet_sea_control", when: () => s.seaControl > 76, t: fid === "un" ? "Corridor Control Improves" : "Sea Control Window", d: "Your taskforces have enough posture, fuel, and readiness to shape the maritime tempo this week.", e: { military: 5, credibility: 4, supply: 3 }, crisis: { shippingInsuranceCost: -4, allianceCohesion: 3 } },
    { id: "fleet_fuel_warning", when: () => s.fuel < 28, t: "Fleet Fuel Warning", d: "Operations staff warn that the next action may be decided by tankers and port access rather than firepower.", e: { fuel: -5, military: -3 }, crisis: { oilShock: 4, warWeariness: 2 } },
  ];
  return list.find(e => !used.has(e.id) && e.when());
};
export const fleetEndingNote = (fid: string, fleets: AnyRecord[] = []) => {
  const s = fleetSummary(fleets);
  if (!fleets.length) return "";
  if (s.seaControl >= 74 && s.readiness >= 62) return fid === "un" ? "Relief and observer assets kept enough corridor control to matter." : "Fleet posture delivered meaningful sea control in the endgame.";
  if (s.supply < 24 || s.fuel < 30) return "Logistics, fuel, and resupply limits capped the final military options.";
  if (s.threat >= 68) return "Fleet risk stayed high enough that every final move carried escalation danger.";
  return "Fleet logistics remained serviceable but never decisive.";
};
export const hasChain = (history: AnyRecord[] = [], id: string) => history.some(e => e.id === id);
export const chainEventOptions = (ctx: AnyRecord) => {
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
export const pickChainEvent = (ctx: AnyRecord) => {
  const options = (chainEventOptions(ctx) as AnyRecord[])
    .filter(e => !ctx.used.has(e.id) && e.score >= 58)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (!options.length) return null;
  const total = options.reduce((a, e) => a + e.score, 0);
  let roll = rng() * total;
  return options.find(e => (roll -= e.score) <= 0) || options[0];
};
export const chainEndingNote = (history: AnyRecord[] = []) => {
  if (!history.length) return "";
  const names = history.slice(-3).map(e => e.t).join(", ");
  return `Major crisis chains shaped the campaign: ${names}.`;
};

