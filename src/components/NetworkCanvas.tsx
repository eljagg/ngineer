import { devices, links } from "@/lib/network-seed";

type NetworkCanvasProps = {
  variant?: "default" | "wide" | "builder";
  showLinkLabels?: boolean;
};

function getDevice(id: string) {
  return devices.find((device) => device.id === id);
}

function lineGeometry(aId: string, bId: string) {
  const a = getDevice(aId);
  const b = getDevice(bId);
  if (!a || !b) return { style: {}, midpoint: { left: "0%", top: "0%" } };

  const ax = a.x + 5.8;
  const ay = a.y + 4.2;
  const bx = b.x + 5.8;
  const by = b.y + 4.2;
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

export function NetworkCanvas({ variant = "default", showLinkLabels = true }: NetworkCanvasProps) {
  return (
    <div
      className={`network-canvas ${variant === "wide" ? "network-canvas-wide" : ""} ${variant === "builder" ? "network-canvas-builder" : ""}`}
      aria-label="Demo topology: Branch to HQ traffic path across MPLS, firewall, and server network"
    >
      <div className="canvas-watermark">Demo source-of-truth topology</div>
      <div className="canvas-zone zone-branch">Branch</div>
      <div className="canvas-zone zone-provider">Provider MPLS</div>
      <div className="canvas-zone zone-hq">HQ</div>

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

      {devices.map((device) => (
        <div
          className="device-node"
          key={device.id}
          style={{ left: `${device.x}%`, top: `${device.y}%` }}
        >
          <div className="role">{device.role}</div>
          <div className="name">{device.name}</div>
          <div className="ports">{device.vendor} {device.model}</div>
          <div className="ports">Ports: {device.ports.join(", ")}</div>
        </div>
      ))}
    </div>
  );
}
