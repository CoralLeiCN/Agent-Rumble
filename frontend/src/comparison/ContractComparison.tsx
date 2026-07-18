import { useEffect, useMemo, useState } from "react";
import {
  comparisonStatePresentation,
  confidencePresentation,
  supportStatusPresentation,
  verificationPresentation,
} from "../status/statusPresentation";
import type {
  ComparisonCell,
  ComparisonJsonValue,
  ComparisonResponse,
  ComparisonRow,
  ProjectSummary,
} from "../types/catalog";
import type {
  Confidence,
  FieldState,
  SupportStatus,
  VerificationStatus,
} from "../types/projectCard";
import {
  buildComparisonPresentation,
  type PresentedComparisonRow,
  type PresentedContractField,
} from "./comparisonPresentation";

interface ContractComparisonProps {
  comparison: ComparisonResponse;
  projects: ProjectSummary[];
  onOpenEvidence: (claimId: string, trigger: HTMLButtonElement) => void;
}

function isKeyOf<T extends object>(value: PropertyKey, record: T): value is keyof T {
  return value in record;
}

function SemanticBadge({
  label,
  symbol,
  tone,
}: {
  label: string;
  symbol: string;
  tone: "positive" | "informational" | "warning" | "neutral" | "muted";
}) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      <span aria-hidden="true">{symbol}</span>
      {label}
    </span>
  );
}

function primitiveLabel(value: ComparisonJsonValue | undefined) {
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "";
}

function semanticValue(row: ComparisonRow, value: ComparisonJsonValue) {
  if (typeof value !== "string") return null;

  if (row.semanticKind === "support_status" && isKeyOf(value, supportStatusPresentation)) {
    return <SemanticBadge {...supportStatusPresentation[value as SupportStatus]} />;
  }
  if (row.semanticKind === "verification_status" && isKeyOf(value, verificationPresentation)) {
    return <SemanticBadge {...verificationPresentation[value as VerificationStatus]} />;
  }
  if (row.semanticKind === "confidence" && isKeyOf(value, confidencePresentation)) {
    return <strong className="contract-confidence">{confidencePresentation[value as Confidence]}</strong>;
  }
  if (row.semanticKind === "field_state" && isKeyOf(value, comparisonStatePresentation)) {
    return <SemanticBadge {...comparisonStatePresentation[value as FieldState]} />;
  }
  return null;
}

function ContractValue({
  row,
  cell,
  onOpenEvidence,
}: {
  row: ComparisonRow;
  cell: ComparisonCell;
  onOpenEvidence: ContractComparisonProps["onOpenEvidence"];
}) {
  if (cell.state !== "value") {
    const state = comparisonStatePresentation[cell.state];
    return (
      <div className="contract-cell">
        <span className={`empty-value empty-value--${state.tone}`}>
          <span aria-hidden="true">{state.symbol}</span>
          {state.label}
        </span>
      </div>
    );
  }

  const renderedSemanticValue = cell.value === undefined ? null : semanticValue(row, cell.value);
  const values = Array.isArray(cell.value) ? cell.value : null;
  const isIdentifier = /(?:^|\/)(?:.*_id|.*_ids|schema_version|card_version|revision_or_version|commit|content_digest|url|uri|path)$/.test(
    row.fieldPattern,
  );
  const exposesClaimLink = cell.claimIds.length > 0 && (
    row.semanticKind === "support_status"
    || row.semanticKind === "verification_status"
    || row.semanticKind === "claim_reference"
    || /\/(?:statement|name|description|maturity)$/.test(row.fieldPattern)
  );

  return (
    <div className="contract-cell">
      {renderedSemanticValue ?? (
        values ? (
          values.length > 0 ? (
            <ul className="contract-value-list">
              {values.map((value, index) => (
                <li key={`${primitiveLabel(value)}-${index}`}>
                  {isIdentifier ? <code>{primitiveLabel(value)}</code> : primitiveLabel(value)}
                </li>
              ))}
            </ul>
          ) : (
            <span className="known-empty">None recorded</span>
          )
        ) : row.valueKind === "empty_object" ? (
          <span className="known-empty">None recorded</span>
        ) : isIdentifier ? (
          <code className="contract-scalar contract-scalar--code">{primitiveLabel(cell.value)}</code>
        ) : (
          <p className="contract-scalar">{primitiveLabel(cell.value)}</p>
        )
      )}

      {exposesClaimLink && (
        <div className="contract-cell__claims" aria-label="Supporting sources">
          {[...new Set(cell.claimIds)].map((claimId, index) => (
            <button
              className="evidence-link"
              type="button"
              key={claimId}
              title={claimId}
              onClick={(event) => onOpenEvidence(claimId, event.currentTarget)}
            >
              View source {index + 1} →
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function rowMatches(row: ComparisonRow, query: string) {
  if (!query) return true;
  const searchable = [
    row.label,
    row.logicalPath,
    row.fieldPattern,
    ...Object.values(row.cells).map(({ value }) => JSON.stringify(value) ?? ""),
  ].join(" ").toLocaleLowerCase();
  return searchable.includes(query);
}

function contractFieldMatches(field: PresentedContractField, query: string) {
  if (!query) return true;
  return `${field.label} ${field.fieldPattern}`.toLocaleLowerCase().includes(query);
}

function customerLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function ComparisonTable({
  label,
  rows,
  projects,
  onOpenEvidence,
}: {
  label: string;
  rows: PresentedComparisonRow[];
  projects: ProjectSummary[];
  onOpenEvidence: ContractComparisonProps["onOpenEvidence"];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="comparison-scroll contract-group__table" tabIndex={0} aria-label={`${label} comparison`}>
      <table className="comparison-table comparison-table--contract">
        <thead>
          <tr>
            <th scope="col">Detail</th>
            {projects.map((project) => (
              <th scope="col" key={project.id}>{project.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.isDifferent ? "contract-row--different" : "contract-row--shared"}>
              <th scope="row"><span>{row.label}</span></th>
              {projects.map((project) => (
                <td key={project.id} data-project={project.name}>
                  <ContractValue
                    row={row}
                    cell={row.cells[project.id] ?? {
                      pointer: null,
                      state: "not_present",
                      claimIds: [],
                    }}
                    onOpenEvidence={onOpenEvidence}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnusedContractFields({ fields }: { fields: PresentedContractField[] }) {
  if (fields.length === 0) return null;
  return (
    <div className="contract-unused-fields">
      <p>No selected project has a matching entry for these additional details.</p>
      <ul>
        {fields.map((field) => (
          <li key={`${field.sourceGroupId}:${field.fieldPattern}`}>
            <span>{field.label}</span>
            <small>{customerLabel(field.sourceGroupId)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ContractComparison({ comparison, projects, onOpenEvidence }: ContractComparisonProps) {
  const selectedProjects = comparison.projectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is ProjectSummary => Boolean(project));
  const comparisonKey = comparison.cardRefs
    .map(({ cardId, cardVersion }) => `${cardId}@${cardVersion}`)
    .join("|");
  const sections = useMemo(
    () => buildComparisonPresentation(comparison.groups),
    [comparisonKey, comparison.groups],
  );
  const initialExpanded = useMemo(() => new Set(
    sections.filter(({ priority }) => priority === "primary").map(({ id }) => id),
  ), [sections]);
  const [showAll, setShowAll] = useState(false);
  const [fieldQuery, setFieldQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(initialExpanded);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  useEffect(() => {
    setShowAll(false);
    setFieldQuery("");
    setExpandedSections(initialExpanded);
    setExpandedDetails(new Set());
  }, [comparisonKey, initialExpanded]);

  const normalizedQuery = fieldQuery.trim().toLocaleLowerCase();
  const visibleSections = sections
    .map((section) => ({
      ...section,
      highlights: section.highlights.filter((row) => rowMatches(row, normalizedQuery)),
      details: section.details.filter((row) => rowMatches(row, normalizedQuery)),
      contractOnlyFields: section.contractOnlyFields.filter(
        (field) => contractFieldMatches(field, normalizedQuery),
      ),
    }))
    .filter(({ highlights, details, contractOnlyFields }) => (
      highlights.length > 0 || details.length > 0 || contractOnlyFields.length > 0
    ));
  const highlightCount = sections.reduce((count, section) => count + section.highlights.length, 0);
  const highlightDifferenceCount = sections.reduce((count, section) => (
    count + section.highlights.filter(({ isDifferent }) => isDifferent).length
  ), 0);
  const visibleDetailCount = visibleSections.reduce((count, section) => (
    count + section.highlights.length + section.details.length + section.contractOnlyFields.length
  ), 0);

  const showHighlights = () => {
    setShowAll(false);
    setExpandedSections(initialExpanded);
    setExpandedDetails(new Set());
  };
  const showEveryDetail = () => {
    setShowAll(true);
    setExpandedSections(new Set(sections.map(({ id }) => id)));
    setExpandedDetails(new Set(sections.map(({ id }) => id)));
  };

  return (
    <section className="contract-coverage" aria-labelledby="contract-coverage-title">
      <div className="contract-coverage__intro">
        <div>
          <h2 id="contract-coverage-title">Project details</h2>
          <p>Key differences are shown first. Open a section for more detail.</p>
        </div>
        <dl className="contract-coverage__metrics">
          <div><dt>Key differences</dt><dd>{highlightDifferenceCount}</dd></div>
        </dl>
      </div>

      <div className="contract-controls" aria-label="Comparison detail controls">
        <div className="contract-controls__scope" role="group" aria-label="Detail scope">
          <button type="button" aria-pressed={!showAll} onClick={showHighlights}>Highlights</button>
          <button type="button" aria-pressed={showAll} onClick={showEveryDetail}>All details</button>
        </div>
        <label className="contract-field-search">
          <span>Find a detail</span>
          <input
            type="search"
            value={fieldQuery}
            placeholder="Name, capability, or value"
            onChange={(event) => setFieldQuery(event.target.value)}
          />
        </label>
      </div>

      <p className="contract-result-count" role="status">
        {!normalizedQuery && !showAll
          ? `${highlightCount} highlights across ${visibleSections.length} sections.`
          : `Showing ${visibleDetailCount} details across ${visibleSections.length} sections.`}
      </p>

      <div className="contract-groups">
        {visibleSections.map((section) => {
          const sectionDifferences = [...section.highlights, ...section.details]
            .filter(({ isDifferent }) => isDifferent).length;
          const isExpanded = expandedSections.has(section.id) || showAll || Boolean(normalizedQuery);
          const secondaryContent = section.priority === "secondary"
            ? [...section.highlights, ...section.details]
            : section.details;
          const detailIsExpanded = expandedDetails.has(section.id) || showAll || Boolean(normalizedQuery);
          return (
            <details
              className="contract-group"
              key={section.id}
              open={isExpanded}
              onToggle={(event) => {
                if (normalizedQuery || showAll) return;
                const next = new Set(expandedSections);
                if (event.currentTarget.open) next.add(section.id);
                else next.delete(section.id);
                setExpandedSections(next);
              }}
            >
              <summary>
                <span><strong>{section.label}</strong></span>
                <small>
                  {section.highlights.length + section.details.length} details
                  {sectionDifferences > 0 ? ` · ${sectionDifferences} different` : ""}
                </small>
              </summary>
              {section.priority === "primary" && (
                <ComparisonTable
                  label={`${section.label} highlights`}
                  rows={section.highlights}
                  projects={selectedProjects}
                  onOpenEvidence={onOpenEvidence}
                />
              )}
              {(secondaryContent.length > 0 || section.contractOnlyFields.length > 0) && (
                section.priority === "primary" ? (
                  <details
                    className="contract-more"
                    open={detailIsExpanded}
                    onToggle={(event) => {
                      if (normalizedQuery || showAll) return;
                      const next = new Set(expandedDetails);
                      if (event.currentTarget.open) next.add(section.id);
                      else next.delete(section.id);
                      setExpandedDetails(next);
                    }}
                  >
                    <summary>
                      More details ({secondaryContent.length + section.contractOnlyFields.length})
                    </summary>
                    <ComparisonTable
                      label={`${section.label} more details`}
                      rows={secondaryContent}
                      projects={selectedProjects}
                      onOpenEvidence={onOpenEvidence}
                    />
                    <UnusedContractFields fields={section.contractOnlyFields} />
                  </details>
                ) : (
                  <div className="contract-secondary-details">
                    <ComparisonTable
                      label={section.label}
                      rows={secondaryContent}
                      projects={selectedProjects}
                      onOpenEvidence={onOpenEvidence}
                    />
                    <UnusedContractFields fields={section.contractOnlyFields} />
                  </div>
                )
              )}
            </details>
          );
        })}
        {visibleSections.length === 0 && (
          <div className="contract-empty" role="status">No details match this search.</div>
        )}
      </div>
    </section>
  );
}
