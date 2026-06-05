"use client";

import { useMemo, useState } from "react";
import { devices, links, type DeviceNode, type DeviceRole, type NetworkLink } from "@/lib/network-seed";

type NetworkCanvasProps = {
  variant?: "default" | "wide" | "builder";
  showLinkLabels?: boolean;
};

type NodePosition = Record<string, { x: number; y: number }>;
type Selection =
  | { type: "device"; id: string }
  | { type: "link"; id: string }
  | null;

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 650;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function initialPositions(): NodePosition {
  return devices.reduce<NodePosition>((acc, device) => {
    acc[device.id] = { x: device.x, y: device.y };
    return acc;
  }, {});
}

function getDevice(id: string) {
  return devices.find((device) => device.id === id);
}

function deviceKind(role: DeviceRole) {
  if (role === "Firewall") return "firewall";
  if (role === "Server") return "server";
  if (role === "Access") return "switch";
  if (role === "Provider Core") return "core";
  return "router";
}

function toCanvasPoint(position: { x: number; y: number }) {
  return {
    x: (position.x / 100) * CANVAS_WIDTH,
    y: (position.y / 100) * CANVAS_HEIGHT
  };
}

function getLinkEndpoints(link: NetworkLink, positions: NodePosition) {
  const a = positions[link.a] || { x: 0, y: 0 };
  const b = positions[link.b] || { x: 0, y: 0 };
  return { a: toCanvasPoint(a), b: toCanvasPoint(b) };
}

function curvedConnectionPath(link: NetworkLink, positions: NodePosition) {
  const { a, b } = getLinkEndpoints(link, positions);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const horizontalBias = Math.min(Math.max(Math.abs(dx) * 0.42, 70), 180);
  const verticalBias = Math.min(Math.max(Math.abs(dy) * 0.42, 55), 150);

  if (Math.abs(dx) > Math.abs(dy)) {
    return `M ${a.x} ${a.y} C ${a.x + horizontalBias} ${a.y}, ${b.x - horizontalBias} ${b.y}, ${b.x} ${b.y}`;
  }

  const offset = distance > 240 ? verticalBias : 70;
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + offset}, ${b.x} ${b.y - offset}, ${b.x} ${b.y}`;
}

function labelPosition(link: NetworkLink, positions: NodePosition) {
  const { a, b } = getLinkEndpoints(link, positions);
  return {
    left: `${((a.x + b.x) / 2 / CANVAS_WIDTH) * 100}%`,
    top: `${((a.y + b.y) / 2 / CANVAS_HEIGHT) * 100}%`
  };
}

function selectedDevice(selection: Selection): DeviceNode | null {
  if (selection?.type !== "device") return null;
  return getDevice(selection.id) || null;
}

function selectedLink(selection: Selection): NetworkLink | null {
  if (selection?.type !== "link") return null;
  return links.find((link) => link.id === selection.id) || null;
}

function PortLights({ count = 8 }: { count?: number }) {
  return (
    <div className="port-lights" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function DeviceIcon({ kind }: { kind: ReturnType<typeof deviceKind> }) {
  if (kind === "switch") {
    return (
      <svg viewBox="0 0 168 104" aria-hidden="true" className="network-icon-svg realistic-switch">
        <defs>
          <linearGradient id="switchBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#23354f" />
            <stop offset="54%" stopColor="#0b1728" />
            <stop offset="100%" stopColor="#020817" />
          </linearGradient>
        </defs>
        <path className="chassis-shadow" d="M22 29h124l12 14v35H34L22 66z" />
        <path className="chassis" d="M18 24h124l14 16v35H32L18 63z" fill="url(#switchBody)" />
        <path className="bezel" d="M32 39h96v21H32z" />
        <g className="ports-grid">
          {Array.from({ length: 12 }).map((_, index) => {
            const x = 38 + index * 7.2;
            return <rect key={index} x={x} y="44" width="4.8" height="8.5" rx="1" />;
          })}
        </g>
        <rect className="sfp" x="132" y="43" width="13" height="10" rx="1.5" />
        <circle className="led led-good" cx="34" cy="68" r="2.6" />
        <circle className="led" cx="44" cy="68" r="2.2" />
        <path className="top-highlight" d="M19 24h123l14 16" />
      </svg>
    );
  }

  if (kind === "firewall") {
    return (
      <svg viewBox="0 0 168 104" aria-hidden="true" className="network-icon-svg realistic-firewall">
        <defs>
          <linearGradient id="fwBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#332410" />
            <stop offset="52%" stopColor="#121827" />
            <stop offset="100%" stopColor="#060816" />
          </linearGradient>
        </defs>
        <path className="chassis-shadow" d="M28 28h108l14 13v37H38L28 67z" />
        <path className="chassis" d="M23 23h108l16 15v37H36L23 64z" fill="url(#fwBody)" />
        <g className="brick-lines">
          <path d="M35 38h96M35 51h96M35 64h96" />
          <path d="M51 28v10M76 38v13M108 38v13M58 51v13M92 51v13M121 51v13" />
        </g>
        <path className="shield" d="M86 33l18 8v14c0 11-7 18-18 24-11-6-18-13-18-24V41z" />
        <path className="shield-mark" d="M78 55l6 6 13-17" />
        <circle className="led led-warn" cx="39" cy="69" r="2.4" />
        <circle className="led" cx="48" cy="69" r="2" />
      </svg>
    );
  }

  if (kind === "server") {
    return (
      <svg viewBox="0 0 168 104" aria-hidden="true" className="network-icon-svg realistic-server">
        <defs>
          <linearGradient id="serverBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#173a2b" />
            <stop offset="50%" stopColor="#0d1b2f" />
            <stop offset="100%" stopColor="#020817" />
          </linearGradient>
        </defs>
        <path className="chassis-shadow" d="M28 24h108l12 14v43H40L28 69z" />
        <path className="chassis" d="M23 19h108l15 16v43H36L23 66z" fill="url(#serverBody)" />
        <g className="drive-bays">
          {Array.from({ length: 8 }).map((_, index) => {
            const x = 37 + index * 11.5;
            return <rect key={index} x={x} y="41" width="8.5" height="20" rx="1.6" />;
          })}
        </g>
        <path className="vent" d="M38 29h54M100 29h23" />
        <circle className="led led-good" cx="35" cy="69" r="2.7" />
        <circle className="led" cx="45" cy="69" r="2" />
      </svg>
    );
  }

  if (kind === "core") {
    return (
      <svg viewBox="0 0 168 104" aria-hidden="true" className="network-icon-svg realistic-core">
        <defs>
          <linearGradient id="coreBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2a2555" />
            <stop offset="50%" stopColor="#0c1d35" />
            <stop offset="100%" stopColor="#030711" />
          </linearGradient>
        </defs>
        <path className="chassis-shadow" d="M24 27h122l9 13v40H36L24 67z" />
        <path className="chassis" d="M20 22h122l11 15v40H32L20 64z" fill="url(#coreBody)" />
        <path className="core-ring" d="M84 36c15 0 28 7 28 16s-13 16-28 16-28-7-28-16 13-16 28-16z" />
        <path className="core-arrow" d="M64 52h40M76 41l-12 11 12 11M92 41l12 11-12 11" />
        <g className="ports-grid">
          {Array.from({ length: 8 }).map((_, index) => {
            const x = 38 + index * 9.2;
            return <rect key={index} x={x} y="70" width="6" height="5" rx="1" />;
          })}
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 168 104" aria-hidden="true" className="network-icon-svg realistic-router">
      <defs>
        <linearGradient id="routerBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#17324d" />
          <stop offset="52%" stopColor="#0b1c31" />
          <stop offset="100%" stopColor="#020817" />
        </linearGradient>
      </defs>
      <path className="chassis-shadow" d="M31 24h105l15 16-11 37H38L22 62z" />
      <path className="chassis" d="M28 18h105l17 17-12 38H35L18 58z" fill="url(#routerBody)" />
      <ellipse className="routing-plane" cx="82" cy="47" rx="39" ry="18" />
      <path className="router-arrows" d="M61 47h42M75 35l-14 12 14 12M89 35l14 12-14 12" />
      <path className="router-uplink" d="M82 29v-13M82 78v-13M67 16l15-12 15 12M67 88l15 12 15-12" />
      <circle className="led led-good" cx="35" cy="67" r="2.5" />
      <circle className="led" cx="44" cy="67" r="2" />
    </svg>
  );
}

function SelectionInspector({ selection }: { selection: Selection }) {
  const device = selectedDevice(selection);
  const link = selectedLink(selection);

  if (device) {
    return (
      <div className="selection-inspector" aria-label="Selected device details">
        <span className="badge good">Selected device</span>
        <strong>{device.name}</strong>
        <p>{device.vendor} {device.model} · {device.role}</p>
        <div className="inspector-grid">
          <span>Site</span><b>{device.site}</b>
          <span>Ports</span><b>{device.ports.join(" / ")}</b>
        </div>
      </div>
    );
  }

  if (link) {
    return (
      <div className="selection-inspector" aria-label="Selected link details">
        <span className="badge warn">Selected link</span>
        <strong>{link.aPort} → {link.bPort}</strong>
        <p>{link.purpose}</p>
        <div className="inspector-grid">
          <span>Local</span><b>{link.a}</b>
          <span>Remote</span><b>{link.b}</b>
          <span>Protocol</span><b>{link.protocol || "—"}</b>
          <span>VRF</span><b>{link.vrf || "—"}</b>
        </div>
      </div>
    );
  }

  return (
    <div className="selection-inspector" aria-label="Topology interaction hints">
      <span className="badge good">Interactive canvas</span>
      <strong>Click devices or links</strong>
      <p>Drag devices, inspect ports, highlight the traffic path, zoom, and reset the demo layout.</p>
    </div>
  );
}

export function NetworkCanvas({ variant = "default", showLinkLabels = true }: NetworkCanvasProps) {
  const [positions, setPositions] = useState<NodePosition>(() => initialPositions());
  const [selection, setSelection] = useState<Selection>(null);
  const [highlightPath, setHighlightPath] = useState(true);
  const [showPorts, setShowPorts] = useState(showLinkLabels);
  const [zoom, setZoom] = useState(1);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const selectedDeviceId = selection?.type === "device" ? selection.id : null;
  const selectedLinkId = selection?.type === "link" ? selection.id : null;

  const canvasClassName = [
    "network-canvas",
    variant === "wide" ? "network-canvas-wide" : "",
    variant === "builder" ? "network-canvas-builder" : ""
  ].filter(Boolean).join(" ");

  const activeLinks = useMemo(() => new Set(links.map((link) => link.id)), []);

  function resetLayout() {
    setPositions(initialPositions());
    setSelection(null);
    setHighlightPath(true);
    setZoom(1);
  }

  return (
    <div
      className={canvasClassName}
      aria-label="Interactive demo topology: Branch to HQ traffic path across MPLS, firewall, and server network"
      onPointerMove={(event) => {
        if (!draggingId) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 6, 94);
        const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 10, 88);
        setPositions((current) => ({ ...current, [draggingId]: { x, y } }));
      }}
      onPointerUp={() => setDraggingId(null)}
      onPointerCancel={() => setDraggingId(null)}
    >
      <div className="canvas-watermark">Demo source-of-truth topology</div>
      <div className="canvas-zone-label zone-branch">Branch</div>
      <div className="canvas-zone-label zone-provider">Provider MPLS</div>
      <div className="canvas-zone-label zone-hq">HQ</div>

      <div className="canvas-control-strip" aria-label="Topology interaction controls">
        <button type="button" onClick={() => setHighlightPath((value) => !value)}>
          {highlightPath ? "Unhighlight path" : "Highlight path"}
        </button>
        <button type="button" onClick={() => setShowPorts((value) => !value)}>
          {showPorts ? "Hide port labels" : "Show port labels"}
        </button>
        <button type="button" onClick={() => setZoom((value) => clamp(Number((value + 0.1).toFixed(2)), 0.8, 1.3))}>Zoom +</button>
        <button type="button" onClick={() => setZoom((value) => clamp(Number((value - 0.1).toFixed(2)), 0.8, 1.3))}>Zoom −</button>
        <button type="button" onClick={resetLayout}>Reset</button>
      </div>

      <div className="canvas-pan-zoom" style={{ transform: `scale(${zoom})` }}>
        <svg
          className="topology-links-svg"
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="trafficFlowGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="52%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <filter id="linkGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {links.map((link) => {
            const selected = selectedLinkId === link.id;
            const active = highlightPath && activeLinks.has(link.id);
            return (
              <path
                key={link.id}
                className={`topology-link-path ${active ? "topology-link-active" : ""} ${selected ? "topology-link-selected" : ""}`}
                d={curvedConnectionPath(link, positions)}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelection({ type: "link", id: link.id });
                }}
              />
            );
          })}
        </svg>

        {links.map((link) => (
          showPorts ? (
            <button
              type="button"
              key={link.id}
              className={`link-label link-label-button ${selectedLinkId === link.id ? "selected" : ""}`}
              style={labelPosition(link, positions)}
              onClick={(event) => {
                event.stopPropagation();
                setSelection({ type: "link", id: link.id });
              }}
            >
              <strong>{link.aPort}</strong> → <strong>{link.bPort}</strong>
              <span>{link.protocol}</span>
            </button>
          ) : null
        ))}

        {devices.map((device) => {
          const kind = deviceKind(device.role);
          const position = positions[device.id] || { x: device.x, y: device.y };
          const isSelected = selectedDeviceId === device.id;
          return (
            <button
              type="button"
              className={`device-node device-node-${kind} ${isSelected ? "device-node-selected" : ""}`}
              key={device.id}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              onClick={(event) => {
                event.stopPropagation();
                setSelection({ type: "device", id: device.id });
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDraggingId(device.id);
                setSelection({ type: "device", id: device.id });
              }}
            >
              <span className="device-icon" aria-hidden="true">
                <DeviceIcon kind={kind} />
              </span>
              <span className="device-label">
                <span className="role">{device.role}</span>
                <span className="name">{device.name}</span>
                <span className="ports">{device.vendor} {device.model}</span>
                <span className="ports">{device.ports.join(" · ")}</span>
                <PortLights count={kind === "server" ? 3 : 8} />
              </span>
            </button>
          );
        })}
      </div>

      <SelectionInspector selection={selection} />
    </div>
  );
}
