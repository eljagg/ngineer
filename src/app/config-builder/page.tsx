import { sampleCiscoAccessPlan } from "@/lib/config-samples";

export default function ConfigBuilderPage() {
  const plan = sampleCiscoAccessPlan;
  return (
    <>
      <section className="card card-pad">
        <div className="eyebrow">Safe config generation</div>
        <h1>Config builder</h1>
        <p className="lead">Every generated config must clearly show local port, remote connected device/port, VLAN/VRF context, validation checks, and rollback.</p>
      </section>

      <section className="grid cols-3 section">
        <div className="metric"><span className="badge good">Local</span><strong>{plan.localDevice}</strong><p>{plan.localPort}</p></div>
        <div className="metric"><span className="badge good">Remote</span><strong>{plan.remoteDevice}</strong><p>{plan.remotePort}</p></div>
        <div className="metric"><span className="badge warn">Context</span><strong>VLAN {plan.vlan}</strong><p>VRF {plan.vrf}</p></div>
      </section>

      <section className="card card-pad section">
        <h2>{plan.title}</h2>
        <p>{plan.summary}</p>
        <h3>Generated config draft</h3>
        <pre className="codebox">{plan.config}</pre>
        <h3>Rollback draft</h3>
        <pre className="codebox">{plan.rollback}</pre>
      </section>

      <section className="card card-pad section">
        <h2>Required validation before approval</h2>
        <table className="table">
          <tbody>
            {plan.validation.map((item) => (
              <tr key={item}><td><span className="badge warn">Check</span></td><td>{item}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
