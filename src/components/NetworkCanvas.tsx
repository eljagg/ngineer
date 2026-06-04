import { devices, links, type DeviceRole } from "@/lib/network-seed";

type NetworkCanvasProps = {
  variant?: "default" | "wide" | "builder";
  showLinkLabels?: boolean;
};

function getDevice(id: string) {
  return devices.find((device) => device.id === id);
}

function deviceKind(role: DeviceRole) {
  if (role === "Firewall") return "firewall";
  if (role === "Server") return "server";
  if (role === "Access") return "switch";
  return "router";
}

function lineGeometry(aId: string, bId: string) {
  const a = getDevice(aId);
  const b = getDevice(bId);
  if (!a || !b) return { style: {}, midpoint: { left: "0%", top: "0%" } };

  const ax = a.x + 4.1;
  const ay = a.y + 3.1;
  const bx = b.x + 4.1;
  const by = b.y + 3.1;
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  return {
    style: {
      left: `${ax}%`,
      top: `${ay}%`,
      width: `${length}%`,
      transform: `rotate(${angle}deg)`
    },
    midpoint: {
      left: `${(ax + bx) / 2}%`,
      top: `${(ay + by) / 2}%`
    }
  };
}

function DeviceIcon({ kind }: { kind: ReturnType<typeof deviceKind> }) {
  if (kind === "switch") {
    return (
      <svg viewBox="0 0 96 72" aria-hidden="true" className="network-icon-svg">
        <rect x="10" y="24" width="76" height="30" rx="6" />
        <path d="M22 35h16M48 35h26M22 44h10M42 44h10M62 44h12" />
        <circle cx="19" cy="48" r="2.8" />
        <circle cx="29" cy="48" r="2.8" />
        <circle cx="39" cy="48" r="2.8" />
        <circle cx="49" cy="48" r="2.8" />
        <circle cx="59" cy="48" r="2.8" />
        <circle cx="69" cy="48" r="2.8" />
      </svg>
    );
  }

  if (kind === "firewall") {
    return (
      <svg viewBox="0 0 96 72" aria-hidden="true" className="network-icon-svg">
        <path d="M18 20h60v36H18z" />
        <path d="M18 31h60M18 43h60M33 20v11M57 20v11M45 31v12M69 31v12M33 43v13M57 43v13" />
        <path d="M48 13l13 7-13 7-13-7 13-7Z" />
      </svg>
    );
  }

  if (kind === "server") {
    return (
      <svg viewBox="0 0 96 72" aria-hidden="true" className="network-icon-svg">
        <rect x="25" y="12" width="46" height="48" rx="5" />
        <path d="M34 25h20M34 36h20M34 47h20" />
        <circle cx="63" cy="25" r="2.5" />
        <circle cx="63" cy="36" r="2.5" />
        <circle cx="63" cy="47" r="2.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 96 72" aria-hidden="true" className="network-icon-svg">
      <ellipse cx="48" cy="36" rx="34" ry="19" />
      <path d="M31 36h34M48 22v28M35 27l-8 9 8 9M61 27l8 9-8 9" />
      <path d="M40 18l8-8 8 8M40 54l8 8 8-8" />
    </svg>
  );
}

export function NetworkCanvas({ variant = "default", showLinkLabels = true }: NetworkCanvasProps) {
  return (
    <div
      className={`network-canvas ${variant === "wide" ? "network-canvas-wide" : ""} ${variant === "builder" ? "network-canvas-builder" : ""}`}
      aria-label="Demo topology: Branch to HQ traffic path across MPLS, firewall, and server network"
    >
      <div className="canvas-watermark">Demo source-of-truth topology</div>
      <div className="canvas-zone-label zone-branch">Branch</div>
      <div className="canvas-zone-label zone-provider">Provider MPLS</div>
      <div className="canvas-zone-label zone-hq">HQ</div>

      {links.map((link) => {
        const geometry = lineGeometry(link.a, link.b);
        return (
          <div key={link.id}>
            <div
              className="path-line"
              style={geometry.style}
              title={`${link.aPort} to ${link.bPort}: ${link.purpose}`}
            />
            {showLinkLabels ? (
              <div className="link-label" style={geometry.midpoint}>
                <strong>{link.aPort}</strong> → <strong>{link.bPort}</strong>
                <span>{link.protocol}</span>
              </div>
            ) : null}
          </div>
        );
      })}

      {devices.map((device) => {
        const kind = deviceKind(device.role);
        return (
          <div
            className={`device-node device-node-${kind}`}
            key={device.id}
            style={{ left: `${device.x}%`, top: `${device.y}%` }}
          >
            <div className="device-icon" aria-hidden="true">
              <DeviceIcon kind={kind} />
            </div>
            <div className="device-label">
              <div className="role">{device.role}</div>
              <div className="name">{device.name}</div>
              <div className="ports">{device.vendor} {device.model}</div>
              <div className="ports">{device.ports.join(" · ")}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
