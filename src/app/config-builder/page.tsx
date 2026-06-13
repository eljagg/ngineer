import { ConfigBuilderWorkspace } from "@/components/ConfigBuilderWorkspace";

export default function ConfigBuilderPage() {
  return (
    <>
      <section className="workspace-header">
        <div>
          <div className="eyebrow">Safe config generation</div>
          <h1>Config builder</h1>
          <p className="lead compact-lead">
            Pick a template, fill in your values, and NGINEER builds the configuration with a matching
            rollback and a pre-apply validation checklist.
          </p>
        </div>
      </section>

      <section className="section">
        <ConfigBuilderWorkspace />
      </section>
    </>
  );
}
