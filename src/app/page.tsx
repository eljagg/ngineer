import { NetworkCanvas } from "@/components/NetworkCanvas";

export default function HomePage() {
  return (
    <section className="network-max-canvas dashboard-max-canvas" aria-label="NGINEER topology command center">
      <div className="dashboard-quick-actions" aria-label="Primary workspaces">
        <a className="btn primary" href="/network">Open builder</a>
        <a className="btn" href="/ipam">IPAM</a>
        <a className="btn" href="/traffic-path">Trace traffic</a>
        <a className="btn" href="/config-builder">Build config</a>
      </div>
      <NetworkCanvas variant="builder" />
    </section>
  );
}
