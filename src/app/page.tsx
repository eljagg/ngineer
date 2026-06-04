import { NetworkCanvas } from "@/components/NetworkCanvas";

const pillars = [
  ["Source of truth", "Neo4j graph for sites, devices, interfaces, VLANs, VRFs, prefixes, firewall policies, routing processes, and MPLS paths."],
  ["Visual-first operations", "Topology diagrams, device port maps, traffic paths, hop tables, and change-impact views are core features, not extras."],
  ["Safe AI assistance", "AI explains, recommends, analyzes outputs, and drafts configs, while the app controls validation, approvals, rollback, and deployment safety."]
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="card card-pad">
          <div className="eyebrow">Network infrastructure builder</div>
          <h1>Build, see, validate, and troubleshoot your network.</h1>
          <p className="lead">
            A professional visual network engineering assistant for IPAM, configs, traffic-flow analysis, MPLS service-provider design, documentation-grounded AI, and safe change control.
          </p>
          <div className="actions">
            <a className="btn primary" href="/network">Open visual network</a>
            <a className="btn" href="/traffic-path">Analyze traffic path</a>
            <a className="btn" href="/config-builder">Build config</a>
          </div>
        </div>
        <div className="card">
          <NetworkCanvas />
        </div>
      </section>

      <section className="grid cols-3 section">
        {pillars.map(([title, text]) => (
          <article className="metric" key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="grid cols-4 section">
        <div className="metric"><span className="badge good">Enabled</span><strong>IPAM</strong><p>VRF-aware prefixes, reservations, conflict detection.</p></div>
        <div className="metric"><span className="badge good">Planned</span><strong>MPLS</strong><p>CE/PE/P, VRFs, RD/RT, MP-BGP, labels, L3VPN.</p></div>
        <div className="metric"><span className="badge warn">Guarded</span><strong>AI</strong><p>Explain, recommend, analyze, and draft without direct device pushes.</p></div>
        <div className="metric"><span className="badge good">Visual</span><strong>Ports</strong><p>Every config must show local and remote port/interface mapping.</p></div>
      </section>
    </>
  );
}
