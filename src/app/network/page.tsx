import { NetworkCanvas } from "@/components/NetworkCanvas";
import { devices, links } from "@/lib/network-seed";

export default function NetworkPage() {
  return (
    <>
      <section className="card card-pad">
        <div className="eyebrow">Visual source of truth</div>
        <h1>Network map</h1>
        <p className="lead">This starter map proves the visual-first direction: devices, roles, vendors, interfaces, and physical/logical connections must be visible before configs are generated.</p>
      </section>

      <section className="card section">
        <NetworkCanvas />
      </section>

      <section className="grid cols-3 section">
        <div className="card card-pad">
          <h2>Devices</h2>
          <p>{devices.length} sample devices modeled across branch, provider, and HQ.</p>
        </div>
        <div className="card card-pad">
          <h2>Links</h2>
          <p>{links.length} physical/logical connections include local and remote ports.</p>
        </div>
        <div className="card card-pad">
          <h2>Protocols</h2>
          <p>STP, BGP, MPLS, firewall policy, NAT, and Linux server dependencies are represented.</p>
        </div>
      </section>

      <section className="card card-pad section">
        <h2>Port/link inventory</h2>
        <table className="table">
          <thead><tr><th>Local</th><th>Remote</th><th>VLAN/VRF</th><th>Protocol/Purpose</th></tr></thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id}>
                <td>{link.a} {link.aPort}</td>
                <td>{link.b} {link.bPort}</td>
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
