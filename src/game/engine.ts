export type StatMap = Record<string, number>;
export type AnyRecord = Record<string, any>;

export const cl = v => Math.max(0, Math.min(100, Math.round(v)));
export const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
export const sfl = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const apE = (s, e = {}) => {
  const n = { ...s };
  Object.entries(e).forEach(([k, v]) => {
    if (n[k] !== undefined) n[k] = cl(n[k] + v);
  });
  return n;
};

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
