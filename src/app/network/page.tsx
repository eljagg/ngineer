import { NetworkFlowCanvas } from "@/components/NetworkFlowCanvas";
import { devices, links } from "@/lib/network-seed";

export default function NetworkPage() {
  return (
    <>
      <section className="workspace-header topology-titlebar rf-titlebar">
        <div>
          <div className="eyebrow">Visual source of truth</div>
          <h1>Interactive topology viewer and builder</h1>
          <p className="lead compact-lead">
            React Flow powers the canvas for drag/drop devices, selectable links, port handles, curved traffic paths, auto-layout, and Neo4j-ready topology data.
          </p>
        </div>
        <div className="builder-summary" aria-label="Demo topology summary">
          <span><strong>{devices.length}</strong> devices</span>
          <span><strong>{links.length}</strong> links</span>
          <span><strong>ELK</strong> auto-layout</span>
        </div>
      </section>

      <section className="topology-builder-shell section rf-builder-shell" aria-label="Topology builder workspace">
        <details className="builder-tools-panel rf-tools-panel" open>
          <summary aria-label="Collapse or expand topology tools">
            <span>Tools</span>
          </summary>
          <div className="builder-tools-content" aria-label="Topology tools">
            <div>
              <div className="eyebrow">Builder tools</div>
              <h2>Topology actions</h2>
              <p>
                Use the canvas buttons first. This side rail stays secondary and will become the device palette, site picker, and Neo4j source-of-truth browser.
              </p>
            </div>
            <button type="button">Device palette</button>
            <button type="button">Site / rack view</button>
            <button type="button">Port mapper</button>
            <button type="button">Path analysis</button>
            <button type="button">Save to Neo4j</button>
          </div>
        </details>

        <div className="topology-workspace builder-canvas rf-canvas-workspace" aria-label="Open topology builder canvas">
          <NetworkFlowCanvas />
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
