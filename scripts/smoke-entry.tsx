import { renderToString } from "react-dom/server";
import App from "../src/App";
import { getRngState, rng, setRngState } from "../src/game/rng";
import { FACTIONS } from "../src/game/data";
import { buildLifeEvent, buildLifeProfile, buildQ, getEnding, restoreSet, saveSet } from "../src/game/systems";
import { DEFAULT_CRISIS, emptyDecisionCounts, factionInitialStats, normalizeFleets } from "../src/game/engine";

const fail = (m: string) => { console.error("SMOKE FAIL:", m); process.exit(1); };
const ok = (m: string) => console.log("ok -", m);

// 1) Menu renders with both modes and the seed control
const html = renderToString(<App />);
if (!html.includes("STRAIT PROTOCOL: 2030")) fail("menu title missing");
if (!html.includes("War Room Mode") || !html.includes("Life During Chaos Mode")) fail("mode cards missing");
if (!html.includes("Crisis Seed")) fail("seed control missing");
ok("menu renders with both modes and seed control");

// 2) Seeded RNG is deterministic and resumable from saved state
setRngState(424242);
const a = [rng(), rng(), rng()];
const mid = getRngState();
const b = [rng(), rng()];
setRngState(424242);
const a2 = [rng(), rng(), rng()];
setRngState(mid);
const b2 = [rng(), rng()];
if (JSON.stringify(a) !== JSON.stringify(a2)) fail("rng not deterministic for same seed");
if (JSON.stringify(b) !== JSON.stringify(b2)) fail("rng state not resumable");
ok("seeded rng deterministic and resumable");

// 3) Every faction builds a scenario queue and resolves an ending
for (const fid of Object.keys(FACTIONS)) {
  setRngState(7);
  const q = buildQ(fid);
  if (!q.length) fail(`empty scenario queue for ${fid}`);
  const st = factionInitialStats(fid, { ...(FACTIONS as any)[fid].startStats });
  const e = getEnding(fid, st, { decisionCounts: emptyDecisionCounts(), crisis: { ...DEFAULT_CRISIS }, fleets: normalizeFleets(fid, (FACTIONS as any)[fid].fleets), chains: [] });
  if (!e || !e.grade || !e.title) fail(`no ending resolves for ${fid}`);
}
ok("all factions: scenario queue + ending resolve");

// 4) Life mode: profile builds, choices exist, local events do not repeat back-to-back
setRngState(99);
const profile = buildLifeProfile({ spawn: "kl_pj", role: "compliance", philosophy: "protector", length: 30 });
const e1 = buildLifeEvent(1, profile);
const e2 = buildLifeEvent(2, profile, profile.stats, e1.local.t);
if (!e1.choices.length) fail("life event has no choices");
if (e1.local.t === e2.local.t) fail("life local event repeated immediately");
ok("life mode: profile, choices, non-repeating local events");

// 5) Save-system Set serialization round-trips
const s = restoreSet(saveSet(new Set(["a", "b"])));
if (!s.has("a") || !s.has("b") || s.size !== 2) fail("set save/restore broken");
ok("save set round-trip");

console.log("SMOKE PASS");
