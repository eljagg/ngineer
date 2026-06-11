export default function HealthPage() {
  return (
    <section className="health-alias-page" aria-label="NGINEER health endpoint guidance">
      <div className="health-alias-card">
        <span className="badge good">NGINEER health</span>
        <h1>Use the API health endpoints</h1>
        <p>
          The browser page <code>/health</code> is only a friendly shortcut. Use the JSON endpoints below for status checks,
          Railway checks, and monitoring scripts.
        </p>
        <div className="health-link-grid">
          <a href="/api/health">/api/health</a>
          <a href="/api/ipam/snapshot">/api/ipam/snapshot</a>
          <a href="/api/neo4j/health">/api/neo4j/health</a>
        </div>
      </div>
    </section>
  );
}
