"use client";

import { useMemo, useState } from "react";
import { devices, links, type DeviceNode, type DeviceRole, type LinkStatus, type NetworkLink } from "@/lib/network-seed";
import { FirewallGlyph, MultilayerGlyph, RouterGlyph, ServerGlyph, SwitchGlyph } from "@/components/DeviceGlyphs";

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

function initialLinkStatus(): Record<string, LinkStatus> {
  return links.reduce<Record<string, LinkStatus>>((acc, link) => {
    acc[link.id] = link.status || "up";
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

function DeviceIcon({ kind }: { kind: ReturnType<typeof deviceKind> }) {
  if (kind === "switch") return <SwitchGlyph />;
  if (kind === "firewall") return <FirewallGlyph />;
  if (kind === "server") return <ServerGlyph />;
  if (kind === "core") return <MultilayerGlyph />;
  return <RouterGlyph />;
}

function SelectionInspector({ selection, linkStatus, onToggleLink }: { selection: Selection; linkStatus: Record<string, LinkStatus>; onToggleLink: (id: string) => void }) {
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
    const status = linkStatus[link.id] || "up";
    return (
      <div className="selection-inspector" aria-label="Selected link details">
        <span className={`badge ${status === "up" ? "good" : "danger"}`}>{status === "up" ? "Link connected" : "Link down"}</span>
        <strong>{link.aPort} → {link.bPort}</strong>
        <p>{link.purpose}</p>
        <div className="inspector-grid">
          <span>Local</span><b>{link.a}</b>
          <span>Remote</span><b>{link.b}</b>
          <span>Protocol</span><b>{link.protocol || "—"}</b>
          <span>VRF</span><b>{link.vrf || "—"}</b>
        </div>
        <button className="btn inspector-toggle" type="button" onClick={() => onToggleLink(link.id)}>
          {status === "up" ? "Set link down" : "Restore link"}
        </button>
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
  const [linkStatus, setLinkStatus] = useState<Record<string, LinkStatus>>(() => initialLinkStatus());

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
    setLinkStatus(initialLinkStatus());
  }

  function toggleLinkStatus(id: string) {
    setLinkStatus((current) => ({ ...current, [id]: current[id] === "down" ? "up" : "down" }));
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
          {links.map((link) => {
            const selected = selectedLinkId === link.id;
            const status = linkStatus[link.id] || "up";
            const active = highlightPath && activeLinks.has(link.id) && status === "up";
            return (
              <path
                key={link.id}
                className={`topology-link-path topology-link-${status} ${active ? "topology-link-active" : ""} ${selected ? "topology-link-selected" : ""}`}
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
                <span className="name">{device.name}</span>
                <span className="role">{device.role} · {device.vendor} {device.model}</span>
              </span>
            </button>
          );
        })}
      </div>

      <SelectionInspector selection={selection} linkStatus={linkStatus} onToggleLink={toggleLinkStatus} />
    </div>
  );
}
