import { NetworkCanvas } from "@/components/NetworkCanvas";

const commandStats = [
  ["Demo topology", "7 devices / 6 links", "Branch → MPLS provider → HQ firewall → server"],
  ["Port mapping", "Required", "Every generated config must show local and remote interfaces."],
  ["Traffic path", "Visible", "L2, routing, MPLS, firewall/NAT, and server dependency path."],
  ["AI guardrail", "Safe", "AI recommends and drafts; NGINEER validates, diffs, and stores rollback."]
];

export default function HomePage() {
  return (
    <>
      <section className="workspace-header">
        <div>
          <div className="eyebrow">NGINEER visual network command center</div>
          <h1>Open topology workspace for building, tracing, and validating networks.</h1>
          <p className="lead compact-lead">
            Demo data is loaded below so the canvas is never empty: Cisco branch access and CE, service-provider MPLS PE/P/PE, Palo Alto firewall, and Linux server path.
          </p>
        </div>
        <div className="actions compact-actions">
          <a className="btn primary" href="/network">Open builder</a>
          <a className="btn" href="/traffic-path">Trace traffic</a>
          <a className="btn" href="/config-builder">Build config</a>
        </div>
      </section>

      <section className="topology-workspace section" aria-label="Open topology viewer">
        <div className="topology-toolbar">
          <div>
            <span className="badge good">Demo data visible</span>
            <span className="badge good">Port mapped</span>
            <span className="badge warn">MPLS path</span>
          </div>
          <div className="toolbar-note">No card borders around the canvas. The topology gets the space.</div>
        </div>
        <NetworkCanvas variant="builder" />
      </section>

      <section className="command-strip section">
        {commandStats.map(([title, value, detail]) => (
          <article className="flat-metric" key={title}>
            <span>{title}</span>
            <strong>{value}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </section>

      <section className="flow-strip section no-border-panel">
        <div>
          <span className="badge good">Required for every config</span>
          <h2>Local port → remote port → protocol → validation → rollback.</h2>
        </div>
        <p>
          NGINEER will not treat configs as isolated text. Each generated or modified config must identify the device, interface, connected peer, peer port, VLAN/VRF, routing/firewall/MPLS role, and expected traffic impact.
        </p>
      </section>
    </>
  );
}
