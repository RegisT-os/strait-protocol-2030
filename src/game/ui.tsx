import { FACTIONS, LIFE_LENGTHS, LIFE_PHILOSOPHIES, LIFE_ROLES, LIFE_SPAWNS } from "./data";
import { ACTS, AnyRecord, CRISIS_META, FLEET_COMMAND_POINTS_PER_DAY, StatMap, crisisBg, crisisC, factionMeta, factionPressureKeys, fleetActionCost, fleetStatusBlockReason, fleetSummary, pressureBg, pressureC, riskBg, riskC, stC, strategicPosture, supC, tc, thrBg, thrC, vBg, vC } from "./engine";
import { buildLifeProfile, lifeLabel, lifeRiskHigh, lifeStatMax } from "./systems";
// ─── STYLES ───────────────────────────────────────────────────────────────────
export const S = {
  root: { fontFamily: "var(--font-sans)", background: "linear-gradient(180deg,#f4f7f8 0%,#e8eef0 48%,#f7f7f4 100%)", minHeight: "100vh", color: "var(--color-text-primary)" },
  shell: { width: "min(1120px,100%)", margin: "0 auto", padding: "16px 14px" },
  card: { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", boxShadow: "0 8px 24px rgba(20,35,45,0.06)" },
  panel: { background: "rgba(255,255,255,0.86)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", boxShadow: "0 10px 32px rgba(20,35,45,0.07)" },
  muted: { color: "var(--color-text-secondary)" },
  tiny: { fontSize: "9px" },
  small: { fontSize: "11px" },
  med: { fontSize: "13px" },
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
export function Tag({ tag, strike = false }: AnyRecord) {
  const col = tc(tag);
  return (
    <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "8px", fontWeight: 600, whiteSpace: "nowrap", background: col.bg, color: col.tx, border: `0.5px solid ${col.bd}`, flexShrink: 0, marginTop: "2px" }}>
      {strike ? "⚡STRIKE" : tag}
    </span>
  );
}

export function StatBar({ label, value }: AnyRecord) {
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

export function PressureMetric({ id, value, meta }: AnyRecord) {
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

export function CrisisTile({ id, value }: AnyRecord) {
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

export function StrategicDashboard({ F, fid, stats, crisis, counts }: AnyRecord) {
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

export function ActProgress({ act, day, F }: AnyRecord) {
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

export function WarRoomSidePanel({ log, timeline }: AnyRecord) {
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

export function CampaignControls({ mode, canLoad, message, onSave, onLoad, onClear, onExport, onRestart }: AnyRecord) {
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

export function FleetCard({ fl }: AnyRecord) {
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
export function FleetOpsCard({ fl, onAction, commandPoints = FLEET_COMMAND_POINTS_PER_DAY, orderedToday = false }: AnyRecord) {
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

export function FactionScreen({ onPick }: AnyRecord) {
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

export function MainMenu({ onWar, onLife, canLoad, onLoad, onClear, saveMessage }: AnyRecord) {
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

export function LifeSetupScreen({ draft, setDraft, onStart, onBack }: AnyRecord) {
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

export function LifeMetric({ label, value, limit = 100 }: AnyRecord) {
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

export function LifeGameScreen({ profile, day, stats, markets, event, log, controls, onChoice, onBack }: AnyRecord) {
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

export function LifeEndingScreen({ ending, profile, stats, controls, onRestart, onMenu }: AnyRecord) {
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

export function ManualOverlay({ onClose }: AnyRecord) {
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

export function ManualButton({ onClick }: AnyRecord) {
  return (
    <button onClick={onClick} style={{ position: "fixed", top: "8px", right: "8px", zIndex: 30, border: "1px solid var(--color-border-primary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", cursor: "pointer", padding: "6px 10px", fontSize: "11px", fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "var(--font-sans)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>Manual</button>
  );
}

export function EndingScreen({ F, ending, stats, controls, onRestart }: AnyRecord) {
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

