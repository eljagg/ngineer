import { devices, links } from "@/lib/network-seed";

function lineStyle(aId: string, bId: string) {
  const a = devices.find((device) => device.id === aId);
  const b = devices.find((device) => device.id === bId);
  if (!a || !b) return {};
  const ax = a.x + 7;
  const ay = a.y + 4;
  const bx = b.x + 7;
  const by = b.y + 4;
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return {
    left: `${ax}%`,
    top: `${ay}%`,
    width: `${length}%`,
    transform: `rotate(${angle}deg)`
  };
}

export function NetworkCanvas() {
  return (
    <div className="network-canvas" aria-label="Sample visual network topology">
      {links.map((link) => (
        <div
          className="path-line"
          key={link.id}
          style={lineStyle(link.a, link.b)}
          title={`${link.aPort} to ${link.bPort}: ${link.purpose}`}
        />
      ))}
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
