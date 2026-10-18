"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowsClockwise, CaretDown, Train } from "@phosphor-icons/react";

type Station = { id: string; name: string; nameNl: string; rank: number };
type Entry = { train: string; label: string; towards: string; scheduled: string; estimated: string; delayS: number; platform: string | null; cancelled: boolean; theoretical: boolean };
type Board = { station: Station; at: string; departures: Entry[]; arrivals: Entry[] };
type FeedHealth = { rt: { state: string; source: string; ageS: number | null } };
const time = (iso: string) => new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function TrainWidget({ stationId, stationName, onStation }: { stationId: string | null; stationName: string | null; onStation: (id: string, name: string) => void }) {
  const [stations, setStations] = useState<Station[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [health, setHealth] = useState<FeedHealth | null | undefined>(undefined);
  const [tab, setTab] = useState<"departures" | "arrivals">("departures");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/rail/stations", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Gares indisponibles");
      return response.json() as Promise<Station[]>;
    }).then((data) => {
      const sorted = data.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "fr"));
      setStations(sorted);
      if (!stationId && sorted.length) {
        const central = sorted.find((station) => /bruxelles.central|brussel.centraal/i.test(station.name));
        const station = central ?? sorted[0];
        onStation(station.id, station.name);
      }
    }).catch(() => setError("Impossible de charger les gares."));
    return () => controller.abort();
  }, [stationId, onStation]);

  useEffect(() => {
    const controller = new AbortController();
    setBoard(null);
    setError("");
    const load = () => {
      if (!stationId) return;
      fetch(`/api/rail/stations/${stationId}/board`, { signal: controller.signal, cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("Tableau indisponible");
          return response.json() as Promise<Board>;
        })
        .then((data) => { setBoard(data); setError(""); })
        .catch((reason: unknown) => { if (reason instanceof Error && reason.name !== "AbortError") setError("Horaires momentanément indisponibles."); });
    };
    load();
    const id = window.setInterval(load, 45_000);
    return () => { controller.abort(); window.clearInterval(id); };
  }, [stationId, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => fetch("/api/rail/health", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<FeedHealth> : Promise.reject())
      .then(setHealth).catch(() => setHealth(null));
    load();
    const id = window.setInterval(load, 20_000);
    return () => { controller.abort(); window.clearInterval(id); };
  }, []);

  const entries = useMemo(() => (board?.[tab] ?? []).slice(0, 6), [board, tab]);
  const feedLabel = health === undefined ? "Connexion…" : health === null ? "Source indisponible" : health.rt.source === "demo" ? "Données de démo" : health.rt.state === "ok" ? "Direct" : health.rt.state === "retrying" ? "Reconnexion" : health.rt.state === "stale" ? "Données anciennes" : health.rt.state === "failing" ? "Hors ligne" : "En attente";
  const live = health?.rt.source !== "demo" && (health?.rt.state === "ok" || health?.rt.state === "retrying");

  function changeStation(id: string) {
    const station = stations.find((item) => item.id === id);
    if (station) {
      setBoard(null);
      setError("");
      onStation(station.id, station.name);
    }
  }

  return (
    <section className="panel train-panel" aria-labelledby="train-title">
      <header className="panel-heading">
        <div className="heading-title"><span className="signal-square" aria-hidden="true" /><h2 id="train-title">Trains</h2></div>
        <div className={`feed-state ${live ? "is-live" : ""}`} aria-live="polite"><i aria-hidden="true" />{feedLabel}</div>
      </header>
      <div className="station-row">
        <label className="station-select-wrap">
          <span className="sr-only">Gare</span>
          <select value={stationId ?? ""} onChange={(event) => changeStation(event.target.value)} disabled={!stations.length}>
            {!stations.length && <option value="">Chargement des gares…</option>}
            {stationId && !stations.some((item) => item.id === stationId) && <option value={stationId}>{stationName ?? "Gare sélectionnée"}</option>}
            {stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
          </select>
          <CaretDown size={14} weight="light" aria-hidden="true" />
        </label>
        <button className="icon-button refresh-button" onClick={() => setRefresh((value) => value + 1)} aria-label="Actualiser le tableau"><ArrowsClockwise size={16} weight="light" /></button>
      </div>
      <div className="train-tabs" role="tablist" aria-label="Type de train">
        <button role="tab" aria-selected={tab === "departures"} onClick={() => setTab("departures")}>Départs</button>
        <button role="tab" aria-selected={tab === "arrivals"} onClick={() => setTab("arrivals")}>Arrivées</button>
      </div>
      <div className="train-table-wrap">
        <table className="train-table">
          <thead><tr><th>Heure</th><th>{tab === "departures" ? "Destination" : "Origine"}</th><th>Voie</th><th>État</th></tr></thead>
          <tbody>
            {entries.map((entry) => {
              const delayed = entry.cancelled || entry.delayS >= 300;
              const status = entry.cancelled ? "Supprimé" : entry.theoretical ? "Théorique" : entry.delayS < 60 ? "À l’heure" : `+${Math.round(entry.delayS / 60)} min`;
              return <tr key={`${entry.train}-${entry.scheduled}`}>
                <td className="train-time">{time(entry.estimated || entry.scheduled)}<small>{entry.label}</small></td>
                <td className="train-destination">{entry.towards}</td>
                <td className="train-platform">{entry.platform ?? "—"}</td>
                <td><span className={`train-status ${delayed ? "is-delayed" : ""}`}>{status}</span></td>
              </tr>;
            })}
            {!entries.length && <tr><td colSpan={4} className="table-message">{error || (board ? "Aucun passage dans l’intervalle." : "Chargement du tableau…")}</td></tr>}
          </tbody>
        </table>
      </div>
      <footer className="panel-foot"><span><Train size={14} weight="light" /> SNCB · Réseau en direct</span><span>{board ? `Mis à jour ${time(board.at)}` : ""}</span></footer>
      {error && entries.length > 0 && <p className="inline-error" role="status">{error}</p>}
    </section>
  );
}
