const modes = [
  ["Troubleshoot", "Analyze command output, logs, path failures, firewall drops, route problems, and server dependency issues."],
  ["Explain", "Explain configs, protocols, diagrams, interface roles, and failure domains in plain engineering language."],
  ["Recommend", "Suggest safe next steps based on documentation, source-of-truth data, best practices, and risk checks."],
  ["Draft", "Draft configs as proposed change objects with validation and rollback, never direct device pushes."]
];

export default function AiAssistantPage() {
  return (
    <>
      <section className="card card-pad">
        <div className="eyebrow">AI network assistant</div>
        <h1>AI with engineering guardrails</h1>
        <p className="lead">AI should help you solve issues, create diagrams, understand traffic paths, and draft configs. The app should control validation, approval, audit, deployment safety, and rollback.</p>
      </section>

      <section className="grid cols-4 section">
        {modes.map(([title, text]) => (
          <article className="metric" key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="card card-pad section">
        <h2>Starter prompt workspace</h2>
        <div className="form-grid">
          <div className="field"><label>Vendor/platform</label><select><option>Cisco IOS XE</option><option>Fortinet FortiGate</option><option>Palo Alto PAN-OS</option><option>Dell OS10</option><option>pfSense</option><option>Linux / Windows Server</option></select></div>
          <div className="field"><label>Task type</label><select><option>Troubleshoot</option><option>Config draft</option><option>Traffic path</option><option>Diagram recommendation</option></select></div>
        </div>
        <div className="field" style={{ marginTop: "0.85rem" }}><label>Paste request, config, log, or command output</label><textarea placeholder="Example: Show why Branch VLAN 20 cannot reach HQ-DB-01 over MPLS CUST-A..." /></div>
        <div className="actions"><button className="btn primary">Prepare analysis</button><button className="btn">Attach source-of-truth context</button></div>
      </section>
    </>
  );
}
