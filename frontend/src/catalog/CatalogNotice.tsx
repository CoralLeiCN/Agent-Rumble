import type { CatalogContext } from "../types/catalog";
export function CatalogNotice({ context }: { context: CatalogContext | null }) {
  return (
    <div className="prototype-notice" role="note">
      <span>Validated catalog</span>
      Project details are loaded from the backend's complete pinned, statically
      analyzed catalog.
      {context && (
        <details>
          <summary>
            {context.cardCount} projects · Catalog scope and freshness
          </summary>
          <p>
            {context.label}: {context.cohortDescription}
          </p>
          <p>Coverage: {context.coverage.join(" · ")}</p>
          <p>Excluded: {context.exclusions.join(" · ")}</p>
          <p>
            Analyzed between {context.oldestAnalyzedAt ?? "unknown"} and{" "}
            {context.newestAnalyzedAt ?? "unknown"}.
          </p>
        </details>
      )}
    </div>
  );
}
