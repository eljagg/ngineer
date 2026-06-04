import { NetworkCanvas } from "@/components/NetworkCanvas";
import { devices, links } from "@/lib/network-seed";

export default function NetworkPage() {
  return (
    <>
      <section className="workspace-header">
        <div>
          <div className="eyebrow">Visual source of truth</div>
          <h1>Network topology viewer and builder</h1>
          <p className="lead compact-lead">
            This page keeps the topology open and borderless so the network layout is not cramped. Demo devices and links remain visible until real Neo4j topology data is loaded.
          </p>
        </div>
        <div className="builder-summary" aria-label="Demo topology summary">
          <span><strong>{devices.length}</strong> devices</span>
          <span><strong>{links.length}</strong> links</span>
          <span><strong>6</strong> port-mapped hops</span>
        </div>
      </section>

      <section className="builder-layout section">
        <aside className="builder-tools" aria-label="Topology tools">
          <h2>Builder tools</h2>
          <button type="button">Add site</button>
          <button type="button">Add device</button>
          <button type="button">Add link</button>
          <button type="button">Map ports</button>
          <button type="button">Trace selected path</button>
        </aside>

        <div className="topology-workspace builder-canvas" aria-label="Open topology builder canvas">
          <div className="topology-toolbar">
            <div>
              <span className="badge good">Branch</span>
              <span className="badge warn">Provider MPLS</span>
              <span className="badge good">HQ</span>
            </div>
            <div className="toolbar-note">Demo topology: Branch users to HQ database through MPLS and firewall.</div>
          </div>
          <NetworkCanvas variant="builder" />
        </div>
      </section>

      <section className="port-inventory section no-border-panel">
        <div className="panel-heading flat-heading">
          <div>
            <div className="eyebrow">Port/link inventory</div>
            <h2>Every link shows local and remote interface mapping</h2>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>Local</th><th>Remote</th><th>VLAN/VRF</th><th>Protocol/Purpose</th></tr></thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id}>
                <td>{link.a} <strong>{link.aPort}</strong></td>
                <td>{link.b} <strong>{link.bPort}</strong></td>
                <td>VLAN {link.vlan || "—"}<br />VRF {link.vrf || "—"}</td>
                <td>{link.protocol}<br />{link.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
