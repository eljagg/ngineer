"use client";

import { useMemo, useState } from "react";
import { docCategories, docsCatalog, type DocCategory } from "@/lib/docs-catalog";

export function DocsExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocCategory | "All">("All");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return docsCatalog.filter((doc) => {
      if (category !== "All" && doc.category !== category) return false;
      if (!needle) return true;
      const haystack = `${doc.vendor} ${doc.area} ${doc.title} ${doc.useCase} ${doc.topics.join(" ")}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, category]);

  return (
    <div className="docs-explorer">
      <div className="docs-controls">
        <input
          className="docs-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search vendors, protocols, topics... e.g. OSPF, FortiGate, Group Policy"
          aria-label="Search documentation catalog"
        />
        <div className="docs-filter-row" role="group" aria-label="Filter by category">
          {(["All", ...docCategories] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="docs-count">{filtered.length} of {docsCatalog.length} sources</div>

      <div className="docs-grid">
        {filtered.map((doc) => (
          <article className="docs-card" key={doc.id}>
            <div className="docs-card-head">
              <span className={`badge ${doc.category === "Protocol" ? "warn" : "good"}`}>{doc.category}</span>
              <span className="docs-vendor">{doc.vendor} · {doc.area}</span>
            </div>
            <h3><a href={doc.url} target="_blank" rel="noreferrer">{doc.title}</a></h3>
            <p>{doc.useCase}</p>
            <div className="docs-topics">
              {doc.topics.map((topic) => (
                <button key={topic} type="button" onClick={() => setQuery(topic)}>{topic}</button>
              ))}
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="docs-empty">
            <strong>No sources match.</strong>
            <p>Try a broader term, or clear the category filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
