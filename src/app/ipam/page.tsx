const prefixes = [
  { vrf: "CUST-A", prefix: "10.20.30.0/24", site: "Branch", vlan: "20", gateway: "10.20.30.1", usage: "User access" },
  { vrf: "CUST-A", prefix: "10.120.10.0/24", site: "HQ", vlan: "120", gateway: "10.120.10.1", usage: "Database segment" },
  { vrf: "Global", prefix: "172.16.0.0/30", site: "Provider", vlan: "—", gateway: "—", usage: "PE-P core link" }
];

export default function IpamPage() {
  return (
    <>
      <section className="card card-pad">
        <div className="eyebrow">IP address management</div>
        <h1>VRF-aware IPAM</h1>
        <p className="lead">IPAM must prevent duplicate IPs, overlapping subnets, incorrect gateways, and VRF leaks before a config is generated.</p>
      </section>

      <section className="card card-pad section">
        <h2>Starter prefix inventory</h2>
        <table className="table">
          <thead><tr><th>VRF</th><th>Prefix</th><th>Site</th><th>VLAN</th><th>Gateway</th><th>Usage</th></tr></thead>
          <tbody>
            {prefixes.map((row) => (
              <tr key={`${row.vrf}-${row.prefix}`}>
                <td>{row.vrf}</td>
                <td>{row.prefix}</td>
                <td>{row.site}</td>
                <td>{row.vlan}</td>
                <td>{row.gateway}</td>
                <td>{row.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid cols-3 section">
        <div className="metric"><span className="badge good">Rule</span><strong>No duplicate IPs</strong><p>Check within tenant, VRF, and site scope.</p></div>
        <div className="metric"><span className="badge good">Rule</span><strong>No overlap</strong><p>Prevent accidental overlapping prefixes unless explicitly approved.</p></div>
        <div className="metric"><span className="badge warn">Rule</span><strong>Gateway required</strong><p>Generated access VLANs must show default gateway and upstream path.</p></div>
      </section>
    </>
  );
}
