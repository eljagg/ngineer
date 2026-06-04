import { NetworkCanvas } from "@/components/NetworkCanvas";
import { devices, links } from "@/lib/network-seed";

export default function NetworkPage() {
  return (
    <>
      <section className="workspace-header topology-titlebar">
        <div>
          <div className="eyebrow">Visual source of truth</div>
          <h1>Topology viewer and builder</h1>
          <p className="lead compact-lead">
            Open canvas first. Controls stay collapsible so the topology can use the full working area.
          </p>
        </div>
        <div className="builder-summary" aria-label="Demo topology summary">
          <span><strong>{devices.length}</strong> devices</span>
          <span><strong>{links.length}</strong> links</span>
          <span><strong>6</strong> port-mapped hops</span>
        </div>
      </section>

      <section className="topology-builder-shell section" aria-label="Topology builder workspace">
        <details className="builder-tools-panel" open>
          <summary aria-label="Collapse or expand topology tools">
            <span>Tools</span>
          </summary>
          <div className="builder-tools-content" aria-label="Topology tools">
            <div>
              <div className="eyebrow">Builder tools</div>
              <h2>Network actions</h2>
            </div>
            <button type="button">Add site</button>
            <button type="button">Add device</button>
            <button type="button">Add link</button>
            <button type="button">Map ports</button>
            <button type="button">Trace selected path</button>
          </div>
        </details>

        <div className="topology-workspace builder-canvas" aria-label="Open topology builder canvas">
          <div className="topology-toolbar">
            <div>
              <span className="badge good">Branch</span>
              <span className="badge warn">Provider MPLS</span>
              <span className="badge good">HQ</span>
            </div>
            <div className="toolbar-note">Demo topology remains visible until real Neo4j topology data is loaded.</div>
          </div>
          <NetworkCanvas variant="builder" />
        </div>
      </section>

      <section className="port-inventory section no-border-panel">
        <div className="panel-heading flat-heading">
          <div>
            <div className="eyebrow">Port/link inventory</div>
            <h2>Local interface to remote interface mapping</h2>
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
