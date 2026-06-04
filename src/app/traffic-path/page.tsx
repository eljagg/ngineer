import { sampleTrafficPath } from "@/lib/network-seed";

export default function TrafficPathPage() {
  return (
    <>
      <section className="card card-pad">
        <div className="eyebrow">Traffic-flow analyzer</div>
        <h1>Show the path from one point to another</h1>
        <p className="lead">The app must explain how traffic moves across VLANs, STP, routing, firewalls, NAT, VPNs, MPLS, servers, and return paths.</p>
      </section>

      <section className="card card-pad section">
        <h2>Sample path: Branch VLAN 20 → HQ database server</h2>
        <table className="table">
          <thead><tr><th>#</th><th>Device</th><th>Ingress</th><th>Egress</th><th>Domain</th><th>Decision</th><th>Notes</th></tr></thead>
          <tbody>
            {sampleTrafficPath.map((hop) => (
              <tr key={hop.order}>
                <td>{hop.order}</td>
                <td>{hop.device}</td>
                <td>{hop.ingress}</td>
                <td>{hop.egress}</td>
                <td>{hop.domain}</td>
                <td><span className="badge good">{hop.decision}</span></td>
                <td>{hop.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid cols-3 section">
        <div className="metric"><h3>Must detect</h3><p>Missing routes, blocked firewall rules, asymmetric routing, NAT mismatch, wrong VLAN, STP block, route leaks, MPLS VPN import/export errors.</p></div>
        <div className="metric"><h3>Must show</h3><p>Every hop, device, interface, VLAN, VRF, zone, policy, routing protocol, MPLS label domain, and expected return path.</p></div>
        <div className="metric"><h3>Must recommend</h3><p>Vendor-specific show/debug commands and safe remediation steps grounded in documentation and source-of-truth data.</p></div>
      </section>
    </>
  );
}
