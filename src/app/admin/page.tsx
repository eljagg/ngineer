const adminAreas = [
  ["Users & roles", "Admin, engineer, viewer, auditor, and tenant/customer access."],
  ["Neo4j source of truth", "Connection health, schema constraints, seed data, and graph integrity checks."],
  ["Docs knowledge base", "Vendor source catalog, indexing status, diagram metadata, and citation readiness."],
  ["Change control", "Draft, validate, approve, deploy, verify, and rollback workflows."],
  ["Security guardrails", "Unsafe config detection, management exposure checks, policy risks, and audit logs."],
  ["MPLS module", "CE/PE/P modeling, VRFs, RD/RT, MP-BGP, label paths, L3VPN, L2VPN roadmap."]
];

export default function AdminPage() {
  return (
    <>
      <section className="card card-pad">
        <div className="eyebrow">Admin control center</div>
        <h1>Manage the platform</h1>
        <p className="lead">Admin controls should govern users, source-of-truth data, documentation indexing, validation policies, and safe change workflows.</p>
      </section>

      <section className="grid cols-3 section">
        {adminAreas.map(([title, text]) => (
          <article className="metric" key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="card card-pad section">
        <h2>Environment checks</h2>
        <p>Use <code>/api/health</code> for app health and <code>/api/neo4j/health</code> after setting Neo4j variables in <code>.env.local</code>.</p>
        <div className="actions"><a className="btn" href="/api/health">Open app health</a><a className="btn" href="/api/neo4j/health">Open Neo4j health</a></div>
      </section>
    </>
  );
}
