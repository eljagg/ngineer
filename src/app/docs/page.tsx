import { docsCatalog } from "@/lib/docs-catalog";

export default function DocsPage() {
  return (
    <>
      <section className="card card-pad">
        <div className="eyebrow">Documentation knowledge base</div>
        <h1>Official documentation catalog</h1>
        <p className="lead">The app should index official documentation metadata and create app-owned visual schematics where vendor diagrams cannot be embedded because of licensing restrictions.</p>
      </section>

      <section className="card card-pad section">
        <table className="table">
          <thead><tr><th>Vendor</th><th>Area</th><th>Source</th><th>Use case</th></tr></thead>
          <tbody>
            {docsCatalog.map((doc) => (
              <tr key={`${doc.vendor}-${doc.area}`}>
                <td>{doc.vendor}</td>
                <td>{doc.area}</td>
                <td><a href={doc.url} target="_blank" rel="noreferrer">{doc.title}</a></td>
                <td>{doc.useCase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid cols-3 section">
        <div className="metric"><h3>Diagrams</h3><p>Store official source metadata and generate app-owned front-panel, port-layout, topology, and protocol diagrams where needed.</p></div>
        <div className="metric"><h3>Citations</h3><p>AI answers should cite the relevant documentation entry used for protocol or vendor-specific recommendations.</p></div>
        <div className="metric"><h3>Controls</h3><p>Admin should approve indexed sources, refresh status, supported versions, and whether diagrams are licensed or app-owned.</p></div>
      </section>
    </>
  );
}
