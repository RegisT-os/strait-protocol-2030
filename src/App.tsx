import { FACTIONS, SUDDEN_CRISIS_EFFECTS, pickSuddenEvent } from "./game/data";
import { ACTS, AnyRecord, CRISIS_META, DEFAULT_CRISIS, FLEET_COMMAND_POINTS_PER_DAY, StatMap, apE, applyCrisis, applyFleetPatch, categoryOf, crisisImpact, emptyDecisionCounts, factionInitialStats, factionMeta, factionPressureImpact, factionPressureKeys, factionTriggeredEvent, fleetActionCost, fleetActionEffect, fleetStatusBlockReason, fleetSummary, fleetTriggeredEvent, logEntryFor, normalizeFleets, pickChainEvent, previewFor, rnd, turningPointFor, vBg, vC } from "./game/engine";
import { SAVE_KEY, buildLifeEvent, buildLifeProfile, buildQ, downloadText, getEnding, getLifeEnding, lifeSummaryText, resolveLifeChoice, restoreSet, saveSet, storageGet, storageRemove, storageSet, warSummaryText, whyWarChoice } from "./game/systems";
import { ActProgress, CampaignControls, CrisisTile, EndingScreen, FactionScreen, FleetOpsCard, LifeEndingScreen, LifeGameScreen, LifeSetupScreen, MainMenu, ManualButton, ManualOverlay, PressureMetric, S, StatBar, StrategicDashboard, Tag, WarRoomSidePanel } from "./game/ui";
import { useState, useCallback } from "react";
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
