import { DocsExplorer } from "@/components/DocsExplorer";

export default function DocsPage() {
  return (
    <>
      <section className="workspace-header">
        <div>
          <div className="eyebrow">Documentation knowledge base</div>
          <h1>Official documentation catalog</h1>
          <p className="lead compact-lead">
            Curated official sources for every platform and protocol NGINEER supports. This catalog is the
            source list the AI Assistant will index and cite.
          </p>
        </div>
      </section>

      <section className="section">
        <DocsExplorer />
      </section>
    </>
  );
}
