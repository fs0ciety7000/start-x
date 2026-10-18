"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowsOutSimple, MapPin } from "@phosphor-icons/react";

type Line = { points: number[] };
type TrainDot = { id: number; x: number; y: number; delay: number; state: number; label: string };
type NetworkData = { lines: Line[]; stations: { x: number; y: number; rank: number }[] };
type ManifestEntry = { label: string; trainClass: number };
type SnapshotData = { trains: TrainDot[]; at: Date | null };
type LiveHealth = { rt: { state: string; source: string } };
const project = (x: number, y: number) => ({ x: x / 65535, y: 1 - y / 65535 });

function decodeNetwork(buffer: ArrayBuffer): NetworkData {
  const data = new DataView(buffer);
  if (buffer.byteLength < 28 || String.fromCharCode(data.getUint8(0), data.getUint8(1), data.getUint8(2)) !== "RED" || data.getUint8(4) !== 3) throw new Error("Carte invalide");
  const length = data.getUint32(8, true);
  const base = 12;
  const count = data.getUint32(base, true);
  const pointCount = data.getUint32(base + 4, true);
  const stationCount = data.getUint32(base + 8, true);
  if (length + 12 > buffer.byteLength || count > 100_000 || pointCount > 1_000_000 || stationCount > 100_000) throw new Error("Carte trop volumineuse");
  const offsetsAt = base + 16;
  const pointsAt = offsetsAt + (count + 1) * 4;
  const classesAt = pointsAt + pointCount * 4;
  const stationsAt = classesAt + Math.ceil(count / 4) * 4;
  const lines: Line[] = [];
  for (let line = 0; line < count; line++) {
    const start = data.getUint32(offsetsAt + line * 4, true);
    const end = data.getUint32(offsetsAt + (line + 1) * 4, true);
    const points: number[] = [];
    for (let point = start; point < end; point++) {
      const at = pointsAt + point * 4;
      points.push(data.getUint16(at, true), data.getUint16(at + 2, true));
    }
    lines.push({ points });
  }
  const stations: NetworkData["stations"] = [];
  for (let index = 0; index < stationCount; index++) {
    const at = stationsAt + index * 12;
    stations.push({ x: data.getUint16(at, true), y: data.getUint16(at + 2, true), rank: data.getUint8(at + 4) });
  }
  return { lines, stations };
}

function decodeSnapshot(buffer: ArrayBuffer): SnapshotData {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let offset = 0;
  const manifest = new Map<number, ManifestEntry>();
  let frame: { base: number; count: number; timestamp: number } | null = null;
  while (offset + 12 <= buffer.byteLength) {
    if (String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2]) !== "RED" || view.getUint8(offset + 3) !== 1) break;
    const kind = view.getUint8(offset + 4);
    const payloadLength = view.getUint32(offset + 8, true);
    const base = offset + 12;
    if (base + payloadLength > buffer.byteLength) break;
    if (kind === 2) {
      const count = view.getUint16(base + 4, true);
      let cursor = base + 8;
      for (let index = 0; index < count && cursor + 4 <= base + payloadLength; index++) {
        const slot = view.getUint16(cursor, true);
        const trainClass = view.getUint8(cursor + 2);
        const keyLength = view.getUint8(cursor + 3);
        cursor += 4 + keyLength;
        if (cursor >= base + payloadLength) break;
        const labelLength = view.getUint8(cursor++);
        if (cursor + labelLength > base + payloadLength) break;
        const label = new TextDecoder().decode(bytes.slice(cursor, cursor + labelLength));
        cursor += labelLength;
        manifest.set(slot, { label, trainClass });
      }
    } else if (kind === 1 && payloadLength >= 12) {
      frame = { base, count: view.getUint16(base + 8, true), timestamp: view.getUint32(base, true) };
    }
    offset = base + payloadLength;
  }
  if (!frame) return { trains: [], at: null };
  const trains: TrainDot[] = [];
  const start = frame.base + 12;
  for (let index = 0; index < frame.count; index++) {
    const at = start + index * 10;
    if (at + 10 > buffer.byteLength) break;
    const id = view.getUint16(at, true);
    const state = view.getUint8(at + 8);
    if ((state & 0b11) >= 2) continue;
    const point = project(view.getUint16(at + 2, true), view.getUint16(at + 4, true));
    trains.push({ id, x: point.x, y: point.y, delay: view.getInt16(at + 6, true), state, label: manifest.get(id)?.label ?? "Train" });
  }
  return { trains, at: frame.timestamp ? new Date(frame.timestamp * 1_000) : null };
}

function sizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

export function NetworkMap() {
  const networkCanvasRef = useRef<HTMLCanvasElement>(null);
  const trainCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayedRef = useRef(new Map<number, { x: number; y: number }>());
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [trains, setTrains] = useState<TrainDot[]>([]);
  const [snapshotAt, setSnapshotAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "demo" | "stale" | "offline">("loading");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/rail/network", { signal: controller.signal, cache: "force-cache" })
      .then((response) => { if (!response.ok) throw new Error(); return response.arrayBuffer(); })
      .then((buffer) => setNetwork(decodeNetwork(buffer)))
      .catch(() => setStatus("offline"));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    const poll = async () => {
      try {
        const [response, healthResponse] = await Promise.all([
          fetch("/api/rail/snapshot", { cache: "no-store" }),
          fetch("/api/rail/health", { cache: "no-store" }),
        ]);
        if (!response.ok || !healthResponse.ok) throw new Error("Flux indisponible");
        const [snapshot, health] = await Promise.all([response.arrayBuffer(), healthResponse.json() as Promise<LiveHealth>]);
        const next = decodeSnapshot(snapshot);
        if (!stopped) {
          setTrains(next.trains);
          setSnapshotAt(next.at);
          setStatus(health.rt.source === "demo" ? "demo" : health.rt.state === "ok" ? "live" : health.rt.state === "retrying" || health.rt.state === "stale" ? "stale" : health.rt.state === "pending" ? "loading" : "offline");
        }
      } catch {
        if (!stopped) setStatus((current) => current === "live" ? "stale" : "offline");
      } finally {
        if (!stopped) timer = window.setTimeout(poll, 3_000);
      }
    };
    void poll();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expanded]);

  useEffect(() => {
    const canvas = networkCanvasRef.current;
    if (!canvas || !network) return;
    const draw = () => {
      const { context, width, height } = sizeCanvas(canvas);
      if (!context || !width || !height) return;
      context.clearRect(0, 0, width, height);
      const pad = 14;
      const scaleX = width - pad * 2;
      const scaleY = height - pad * 2;
      const point = (x: number, y: number) => ({ x: pad + x * scaleX, y: pad + y * scaleY });
      context.lineWidth = 1;
      context.strokeStyle = getComputedStyle(canvas).getPropertyValue("--map-track").trim() || "#a8aaa4";
      for (const line of network.lines) {
        if (line.points.length < 4) continue;
        context.beginPath();
        const first = point(line.points[0] / 65535, 1 - line.points[1] / 65535);
        context.moveTo(first.x, first.y);
        for (let i = 2; i < line.points.length; i += 2) {
          const next = point(line.points[i] / 65535, 1 - line.points[i + 1] / 65535);
          context.lineTo(next.x, next.y);
        }
        context.stroke();
      }
      context.fillStyle = getComputedStyle(canvas).getPropertyValue("--map-station").trim() || "#373a36";
      for (const station of network.stations) {
        const p = point(station.x / 65535, 1 - station.y / 65535);
        context.beginPath();
        context.arc(p.x, p.y, station.rank === 0 ? 2.5 : 1.35, 0, Math.PI * 2);
        context.fill();
      }
    };
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    const themeObserver = new MutationObserver(draw);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    draw();
    return () => { observer.disconnect(); themeObserver.disconnect(); };
  }, [network]);

  useEffect(() => {
    const canvas = trainCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const target = new Map(trains.map((train) => [train.id, train]));
    let raf = 0;
    let lastPaint = 0;
    let width = 0;
    let height = 0;
    const draw = (timestamp: number) => {
      raf = window.requestAnimationFrame(draw);
      if (timestamp - lastPaint < 48) return;
      lastPaint = timestamp;
      const size = sizeCanvas(canvas);
      if (!size.context || !size.width || !size.height) return;
      width = size.width;
      height = size.height;
      context.clearRect(0, 0, width, height);
      const pad = 14;
      const mapPoint = (x: number, y: number) => ({ x: pad + x * (width - pad * 2), y: pad + y * (height - pad * 2) });
      const current = new Map<number, { x: number; y: number }>();
      for (const train of target.values()) {
        const previous = displayedRef.current.get(train.id) ?? { x: train.x, y: train.y };
        const next = { x: previous.x + (train.x - previous.x) * 0.22, y: previous.y + (train.y - previous.y) * 0.22 };
        current.set(train.id, next);
        const p = mapPoint(next.x, 1 - next.y);
        const cancelled = (train.state & 4) > 0;
        const theoretical = (train.state & 8) > 0;
        const delayed = train.delay >= 300;
        const radius = 3.1;
        context.lineWidth = 1.25;
        if (cancelled) {
          context.strokeStyle = "#e75d36";
          context.beginPath();
          context.moveTo(p.x - radius, p.y - radius); context.lineTo(p.x + radius, p.y + radius);
          context.moveTo(p.x + radius, p.y - radius); context.lineTo(p.x - radius, p.y + radius);
          context.stroke();
        } else if (theoretical) {
          context.strokeStyle = "#85877f";
          context.beginPath(); context.arc(p.x, p.y, radius, 0, Math.PI * 2); context.stroke();
        } else if (delayed) {
          context.fillStyle = "#e75d36";
          context.beginPath(); context.moveTo(p.x, p.y - radius - .5); context.lineTo(p.x + radius + .5, p.y); context.lineTo(p.x, p.y + radius + .5); context.lineTo(p.x - radius - .5, p.y); context.closePath(); context.fill();
        } else {
          context.fillStyle = "#347e58";
          context.beginPath(); context.arc(p.x, p.y, radius, 0, Math.PI * 2); context.fill();
        }
      }
      displayedRef.current = current;
    };
    const observer = new ResizeObserver(() => sizeCanvas(canvas));
    observer.observe(canvas);
    raf = window.requestAnimationFrame(draw);
    return () => { window.cancelAnimationFrame(raf); observer.disconnect(); };
  }, [trains]);

  const label = status === "live" ? `${trains.length} trains · direct` : status === "demo" ? `${trains.length} trains · démo` : status === "stale" ? "Données anciennes" : status === "offline" ? "Flux indisponible" : "Connexion…";
  return (
    <section className="panel map-panel" aria-labelledby="map-title">
      <header className="panel-heading">
        <div className="heading-title"><span className="signal-square" aria-hidden="true" /><h2 id="map-title">Réseau belge</h2></div>
        <div className={`feed-state ${status === "live" ? "is-live" : ""}`} aria-live="polite"><i aria-hidden="true" />{label}</div>
      </header>
      <div className={`map-canvas-wrap ${expanded ? "map-expanded" : ""}`} role="img" aria-label={`Carte du réseau belge avec ${trains.length} trains; les marqueurs sont indiqués par forme et couleur`}>
        <canvas ref={networkCanvasRef} className="map-layer" aria-hidden="true" />
        <canvas ref={trainCanvasRef} className="map-layer map-trains" aria-hidden="true" />
        {!network && <div className="map-loading"><MapPin size={18} weight="light" />{status === "offline" ? "Connexion au réseau indisponible" : "Chargement de la carte…"}</div>}
        <div className="map-corner-label">BELGIQUE · 2.0—7.0 E / 49.2—51.9 N</div>
        <button className="map-expand" type="button" aria-label={expanded ? "Réduire la carte" : "Agrandir la carte"} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}><ArrowsOutSimple size={16} weight="light" /></button>
      </div>
      <footer className="map-legend"><span><i className="legend-dot legend-on-time" />À l’heure</span><span><i className="legend-diamond" />Retard</span><span><i className="legend-ring" />Théorique</span><span><i className="legend-cross">×</i>Supprimé</span><span>{snapshotAt ? `Mise à jour ${new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).format(snapshotAt)}` : ""}</span><span className="map-attribution">SNCB · OpenStreetMap</span></footer>
    </section>
  );
}
