"use client";

import { useMemo, useState } from "react";
import { configTemplates, type ConfigTemplate } from "@/lib/config-templates";

function defaultsFor(template: ConfigTemplate): Record<string, string> {
  return template.fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.defaultValue;
    return acc;
  }, {});
}

export function ConfigBuilderWorkspace() {
  const [templateId, setTemplateId] = useState(configTemplates[0].id);
  const template = configTemplates.find((item) => item.id === templateId) || configTemplates[0];
  const [values, setValues] = useState<Record<string, string>>(() => defaultsFor(configTemplates[0]));
  const [copied, setCopied] = useState(false);

  const generated = useMemo(() => template.build(values), [template, values]);

  function selectTemplate(id: string) {
    const next = configTemplates.find((item) => item.id === id);
    if (!next) return;
    setTemplateId(id);
    setValues(defaultsFor(next));
    setCopied(false);
  }

  async function copyConfig() {
    try {
      await navigator.clipboard.writeText(generated.config);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable (permissions); user can select the text manually.
    }
  }

  function downloadConfig() {
    const blob = new Blob([`${generated.config}\n\n! ===== ROLLBACK =====\n${generated.rollback}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${template.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="cb-shell">
      <aside className="cb-template-list" aria-label="Configuration templates">
        <div className="eyebrow">Templates</div>
        {configTemplates.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === templateId ? "active" : ""}
            onClick={() => selectTemplate(item.id)}
          >
            <strong>{item.name}</strong>
            <span>{item.protocolArea} · {item.vendor}</span>
          </button>
        ))}
      </aside>

      <section className="cb-form-panel" aria-label="Template inputs">
        <div className="panel-heading flat-heading">
          <div>
            <div className="eyebrow">{template.vendor} · {template.protocolArea}</div>
            <h2>{template.name}</h2>
          </div>
        </div>
        <p className="cb-description">{template.description}</p>

        <div className="cb-fields">
          {template.fields.map((field) => (
            <label className="field" key={field.key}>
              {field.label}
              <input
                type={field.type === "number" ? "number" : "text"}
                value={values[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              />
              {field.hint ? <small>{field.hint}</small> : null}
            </label>
          ))}
        </div>

        <div className="cb-validation">
          <h3>Validate before approval</h3>
          <ul>
            {generated.validation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cb-output-panel" aria-label="Generated configuration">
        <div className="panel-heading flat-heading">
          <div>
            <div className="eyebrow">Generated config</div>
            <h2>Review, validate, then apply</h2>
          </div>
          <div className="actions compact-actions">
            <button className="btn" type="button" onClick={copyConfig}>{copied ? "Copied" : "Copy"}</button>
            <button className="btn" type="button" onClick={downloadConfig}>Download .txt</button>
          </div>
        </div>
        <pre className="codebox cb-codebox">{generated.config}</pre>
        <h3 className="cb-rollback-title">Rollback</h3>
        <pre className="codebox cb-codebox cb-rollback">{generated.rollback}</pre>
        <p className="cb-guardrail">NGINEER generates and validates; a human reviews and applies. No config is pushed to any device from this screen.</p>
      </section>
    </div>
  );
}
