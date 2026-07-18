import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { catalogGateway } from "./data/catalogGateway";
import { preparedQuery } from "./data/fixtures";
import {
  comparisonStatePresentation,
  confidencePresentation,
  evidenceStatusPresentation,
  requirementPresentation,
  supportStatusPresentation,
  verificationPresentation,
} from "./status/statusPresentation";
import type {
  AssessmentContextView,
  ClaimEvidenceRecord,
  ComparisonCell,
  ComparisonResponse,
  ProjectSummary,
  SearchResponse,
  VerificationStatus,
} from "./types/catalog";
import type { EvidenceStatus, SupportStatus } from "./types/projectCard";

type View = "explore" | "results" | "comparison";
type PendingAction = "search" | "comparison" | "evidence" | null;

function StatusBadge({ status }: { status: VerificationStatus }) {
  const presentation = verificationPresentation[status];
  return (
    <span className={`status-badge status-badge--${presentation.tone}`}>
      <span aria-hidden="true">{presentation.symbol}</span>
      {presentation.label}
    </span>
  );
}

function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  const presentation = evidenceStatusPresentation[status];
  return (
    <span className={`status-badge status-badge--${presentation.tone}`}>
      <span aria-hidden="true">{presentation.symbol}</span>
      {presentation.label}
    </span>
  );
}

function SupportStatusBadge({ status }: { status: SupportStatus }) {
  const presentation = supportStatusPresentation[status];
  return (
    <span className={`status-badge status-badge--${presentation.tone}`}>
      <span aria-hidden="true">{presentation.symbol}</span>
      {presentation.label}
    </span>
  );
}

function AppHeader({ onExplore }: { onExplore: () => void }) {
  return (
    <header className="site-header">
      <button className="wordmark" type="button" onClick={onExplore}>
        <span className="wordmark__mark" aria-hidden="true">AR</span>
        <span>
          <strong>Agent Rumble</strong>
          <small>Project intelligence</small>
        </span>
      </button>
      <nav aria-label="Primary navigation">
        <button className="nav-link nav-link--active" type="button" onClick={onExplore}>
          Explore
        </button>
        <span className="nav-label">Catalog / 03</span>
      </nav>
    </header>
  );
}

function PrototypeNotice() {
  return (
    <div className="prototype-notice" role="note">
      <span>Illustrative prototype</span>
      Schema-valid draft v0.2 fixture cards · illustrative project content, not verified project intelligence
    </div>
  );
}

function AssessmentContextSummary({ contexts }: { contexts: AssessmentContextView[] }) {
  const useCases = [...new Set(contexts.map(({ useCase }) => useCase))];
  const constraints = [...new Set(contexts.flatMap(({ organizationalConstraints }) => organizationalConstraints))];
  const dates = [...new Set(contexts.map(({ assessedAt }) => assessedAt.slice(0, 10)))];
  return (
    <section className="assessment-context" aria-label="Canonical assessment context">
      <div>
        <span>Use case</span>
        <strong>{useCases.join(" · ") || "Not recorded"}</strong>
      </div>
      <div>
        <span>Organizational constraints</span>
        <strong>{constraints.join(" · ") || "None recorded"}</strong>
      </div>
      <div>
        <span>Assessed</span>
        <strong>{dates.join(" · ") || "Not recorded"}</strong>
      </div>
    </section>
  );
}

interface ExploreProps {
  query: string;
  pending: boolean;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
}

function Explore({ query, pending, onQueryChange, onSubmit }: ExploreProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section className="explore" aria-labelledby="explore-title">
      <div className="eyebrow"><span>Catalog 001</span> Evidence-backed discovery</div>
      <h1 id="explore-title">Find the right building block for your agent system.</h1>
      <p className="explore__intro">
        Search a prepared catalog of agent projects by intent. See how your need was
        interpreted, compare material differences, then inspect the source behind a claim.
      </p>
      <form className="search-panel" onSubmit={handleSubmit}>
        <label htmlFor="project-need">Describe what you need</label>
        <div className="search-panel__control">
          <textarea
            id="project-need"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            rows={3}
            placeholder="For example: a framework with human approval and durable state"
          />
          <button className="button button--primary" type="submit" disabled={pending || !query.trim()}>
            {pending ? "Reading the catalog…" : "Find projects"}
          </button>
        </div>
        <div className="example-line">
          <span>Prepared scenario</span>
          <button type="button" onClick={() => onQueryChange(preparedQuery)}>
            Customer-support architecture ↗
          </button>
        </div>
      </form>
      <div className="catalog-ledger" aria-label="Illustrative catalog scope">
        <div><strong>03</strong><span>prepared projects</span></div>
        <div><strong>02</strong><span>languages</span></div>
        <div><strong>2026.07.15</strong><span>fixture snapshot</span></div>
        <div><strong>STATIC</strong><span>analysis mode</span></div>
      </div>
    </section>
  );
}

interface ResultsProps {
  response: SearchResponse;
  shortlist: string[];
  onToggle: (projectId: string) => void;
  onEdit: () => void;
}

function Results({ response, shortlist, onToggle, onEdit }: ResultsProps) {
  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results__heading">
        <div>
          <div className="eyebrow"><span>Interpretation</span> Deterministic catalog match</div>
          <h1 id="results-title">Three projects for review</h1>
        </div>
        <button className="button button--quiet" type="button" onClick={onEdit}>
          ← Edit request
        </button>
      </div>
      <AssessmentContextSummary contexts={response.assessmentContexts} />

      <section className="interpretation" aria-labelledby="interpretation-title">
        <div className="section-heading">
          <h2 id="interpretation-title">How we read your request</h2>
          <span>Review before comparing</span>
        </div>
        <div className="requirement-list">
          {response.requirements.map((requirement) => (
            <span className={`requirement requirement--${requirement.kind}`} key={requirement.id}>
              <strong>{requirementPresentation[requirement.kind]}</strong>
              <span className="requirement__label">{requirement.label}</span>
            </span>
          ))}
          {response.uninterpretedTerms.map((term) => (
            <span className="requirement requirement--unread" key={term}>
              <strong>Uninterpreted</strong>
              <span className="requirement__label">{term}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="results__layout">
        <aside className="filter-rail" aria-label="Current catalog filters">
          <div className="filter-rail__title">Active facets <span>03</span></div>
          <dl>
            <div><dt>Language</dt><dd>Python</dd></div>
            <div><dt>Source</dt><dd>Public GitHub</dd></div>
            <div><dt>Analysis</dt><dd>Static only</dd></div>
          </dl>
          <p>Filters describe this prepared fixture and are not interactive in the prototype.</p>
        </aside>
        <div className="project-list">
          <div className="list-caption">
            <span>Catalog matches / {response.projects.length}</span>
            <span>No universal score</span>
          </div>
          {response.projects.map((project, index) => (
            <ProjectRow
              key={project.id}
              project={project}
              index={index + 1}
              selected={shortlist.includes(project.id)}
              disabled={!shortlist.includes(project.id) && shortlist.length === 3}
              onToggle={() => onToggle(project.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface ProjectRowProps {
  project: ProjectSummary;
  index: number;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function ProjectRow({ project, index, selected, disabled, onToggle }: ProjectRowProps) {
  return (
    <article className={`project-row${selected ? " project-row--selected" : ""}`}>
      <div className="project-row__index" aria-hidden="true">{String(index).padStart(2, "0")}</div>
      <div className="project-row__main">
        <div className="project-row__heading">
          <div>
            <p>{project.owner} / primary public source</p>
            <h2>{project.name}</h2>
          </div>
          <button
            className="button button--select"
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={onToggle}
          >
            {selected ? "Selected ✓" : "+ Compare"}
          </button>
        </div>
        <div className="project-row__taxonomy">
          <span>{project.projectType}</span><span>{project.role}</span>
          {project.languages.map((language) => <span key={language}>{language}</span>)}
        </div>
        <p className="project-row__summary">{project.summary}</p>
        <div className="project-row__boundary">
          <strong>Project boundary</strong>
          <span>{project.boundary}</span>
          <code>{project.sourceCount} source{project.sourceCount === 1 ? "" : "s"}</code>
        </div>
        <div className="project-row__match">
          <span aria-hidden="true">↳</span>
          <p><strong>Why it surfaced</strong>{project.matchReason}</p>
        </div>
        <div className="project-row__constraint">
          <strong>Important constraint</strong><span>{project.constraint}</span>
        </div>
        <div className="snapshot-strip">
          <div className="snapshot-strip__primary">
            <span className="snapshot-strip__label">Match claim</span>
            <StatusBadge status={project.matchClaim.verificationStatus} />
            <span>{confidencePresentation[project.matchClaim.confidence]}</span>
            <code>DEPTH {project.analysisDepth}</code>
            <code>REV {project.revision}</code>
            <time dateTime={project.analyzedAt}>SNAPSHOT {project.analyzedAt}</time>
          </div>
          <details className="snapshot-strip__metadata">
            <summary>Card metadata</summary>
            <div>
              <code>CLAIM {project.matchClaim.claimId}</code>
              <code>CARD {project.cardId} / v{project.cardVersion}</code>
              <code>SCHEMA {project.schemaVersion}</code>
              <code>TYPE {project.canonicalPrimaryType}</code>
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

interface ComparisonProps {
  comparison: ComparisonResponse;
  projects: ProjectSummary[];
  onBack: () => void;
  onOpenEvidence: (claimId: string, trigger: HTMLButtonElement) => void;
}

function Comparison({ comparison, projects, onBack, onOpenEvidence }: ComparisonProps) {
  const selectedProjects = comparison.projectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is ProjectSummary => Boolean(project));
  const groupedRows = useMemo(() => {
    return comparison.rows.reduce<Record<string, typeof comparison.rows>>((groups, row) => {
      (groups[row.group] ??= []).push(row);
      return groups;
    }, {});
  }, [comparison.rows]);

  return (
    <section className="comparison" aria-labelledby="comparison-title">
      <button className="back-link" type="button" onClick={onBack}>← Back to search results</button>
      <div className="comparison__heading">
        <div>
          <div className="eyebrow"><span>Comparison</span> Difference-first review</div>
          <h1 id="comparison-title" tabIndex={-1}>
            {selectedProjects.length === 2 ? "Two" : "Three"} approaches, one explicit context.
          </h1>
        </div>
      </div>
      <AssessmentContextSummary contexts={comparison.assessmentContexts} />
      <div className="comparison-note">
        <strong>Read roles before features.</strong>
        These projects overlap but are not always substitutes. This view exposes meaningful
        differences and leaves the adoption decision with you.
      </div>
      <div className="comparison-scroll" tabIndex={0} aria-label="Scrollable project comparison">
        <table className="comparison-table">
          <thead>
            <tr>
              <th scope="col">Decision field</th>
              {selectedProjects.map((project) => (
                <th scope="col" key={project.id}>
                  <span>{project.projectType}</span>{project.name}
                  <code>{project.revision}</code>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedRows).map(([group, rows]) => (
              <TableGroup
                key={group}
                group={group}
                rows={rows}
                projects={selectedProjects}
                onOpenEvidence={onOpenEvidence}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="shared-attributes" role="note">
        <strong>{comparison.sharedAttributeCount} shared attributes are omitted from this difference-first prototype.</strong>
        <span>Available in the production card projection</span>
      </div>
      <p className="fixture-footnote">
        Prototype safeguard: these fixture cards have contract-valid draft v0.2 shape, but their
        project claims and locators are illustrative and must not be used for adoption decisions.
      </p>
    </section>
  );
}

interface TableGroupProps {
  group: string;
  rows: ComparisonResponse["rows"];
  projects: ProjectSummary[];
  onOpenEvidence: (claimId: string, trigger: HTMLButtonElement) => void;
}

function TableGroup({ group, rows, projects, onOpenEvidence }: TableGroupProps) {
  return (
    <>
      <tr className="comparison-table__group"><th colSpan={projects.length + 1}>{group}</th></tr>
      {rows.map((row) => (
        <tr key={row.id}>
          <th scope="row">{row.label}</th>
          {projects.map((project) => (
            <td key={project.id}>
              <ComparisonValue
                cell={row.cells[project.id] ?? { state: "not_analyzed" }}
                onOpenEvidence={onOpenEvidence}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function ComparisonValue({
  cell,
  onOpenEvidence,
}: {
  cell: ComparisonCell;
  onOpenEvidence: (claimId: string, trigger: HTMLButtonElement) => void;
}) {
  if (cell.state !== "value") {
    const state = comparisonStatePresentation[cell.state];
    return <span className={`empty-value empty-value--${state.tone}`}><span aria-hidden="true">{state.symbol}</span>{state.label}</span>;
  }
  return (
    <div className="comparison-value">
      <p>{cell.value}</p>
      {(cell.supportStatus || cell.evidenceStatus || cell.confidence) && (
        <div className="comparison-value__semantics">
          {cell.supportStatus && (
            <div><span>Capability support</span><SupportStatusBadge status={cell.supportStatus} /></div>
          )}
          {cell.evidenceStatus && (
            <div><span>Evidence status</span><EvidenceStatusBadge status={cell.evidenceStatus} /></div>
          )}
          {cell.confidence && (
            <div><span>Capability confidence</span><strong>{confidencePresentation[cell.confidence]}</strong></div>
          )}
          {cell.verificationStatus && (
            <div>
              <span>Referenced claim</span>
              <StatusBadge status={cell.verificationStatus} />
              {cell.claimConfidence && <small>{confidencePresentation[cell.claimConfidence]}</small>}
            </div>
          )}
        </div>
      )}
      {cell.claimId && (
        <button
          className="evidence-link"
          type="button"
          onClick={(event) => onOpenEvidence(cell.claimId as string, event.currentTarget)}
        >
          View source evidence →
        </button>
      )}
    </div>
  );
}

interface EvidenceDrawerProps {
  evidence: ClaimEvidenceRecord | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
}

function EvidenceDrawer({ evidence, pending, error, onClose }: EvidenceDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !drawerRef.current) return;
    const focusable = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="drawer-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside
        className="evidence-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-title"
        onKeyDown={handleKeyDown}
      >
        <div className="drawer-header">
          <div><span>Claim evidence inspector</span><code>{evidence?.claimId ?? "LOADING"}</code></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close evidence inspector">×</button>
        </div>
        {pending && (
          <div className="drawer-state" role="status">
            <h2 className="visually-hidden" id="evidence-title">Evidence inspector</h2>
            <p>Resolving the illustrative evidence record…</p>
          </div>
        )}
        {error && (
          <div className="drawer-state drawer-state--error" role="alert">
            <h2 className="visually-hidden" id="evidence-title">Evidence inspector error</h2>
            <p>{error}</p>
          </div>
        )}
        {evidence && (
          <div className="drawer-content">
            <div className="drawer-claim-semantics">
              <div>
                <span>Claim verification</span>
                <StatusBadge status={evidence.verificationStatus} />
              </div>
              <div>
                <span>Claim confidence</span>
                <strong>{confidencePresentation[evidence.confidence]}</strong>
              </div>
            </div>
            <h2 id="evidence-title">{evidence.claim}</h2>
            <dl className="claim-ledger">
              <div><dt>Claim kind</dt><dd>{evidence.claimKind}</dd></div>
              <div><dt>Applies to</dt><dd><code>{evidence.appliesTo}</code></dd></div>
              <div>
                <dt>Assessment context</dt>
                <dd><code>{evidence.assessmentContextId ?? "Not applicable"}</code></dd>
              </div>
            </dl>
            <section>
              <h3>Why this matters</h3>
              <p>{evidence.whyItMatters}</p>
            </section>
            <div className="evidence-stack">
              <h3>Supporting evidence / {evidence.supportingEvidence.length}</h3>
              {evidence.supportingEvidence.length === 0 && (
                <p className="empty-evidence">○ No supporting evidence linked</p>
              )}
              {evidence.supportingEvidence.map((record) => (
                <div className="evidence-record" key={record.id}>
                  <div className="evidence-record__heading">
                    <div>
                      <span>Evidence status</span>
                      <EvidenceStatusBadge status={record.evidenceStatus} />
                    </div>
                    <div>
                      <span>Evidence confidence</span>
                      <strong>{confidencePresentation[record.confidence]}</strong>
                    </div>
                    <code>{record.id}</code>
                  </div>
                  <dl className="evidence-ledger">
                    <div><dt>Source</dt><dd>{record.repository}</dd></div>
                    <div><dt>Source type</dt><dd>{record.sourceType}</dd></div>
                    <div><dt>Provenance</dt><dd>{record.provenance}</dd></div>
                    <div><dt>Access</dt><dd>{record.accessScope}</dd></div>
                    <div><dt>Retrieved</dt><dd><time dateTime={record.retrievedAt}>{record.retrievedAt}</time></dd></div>
                    <div><dt>Revision</dt><dd><code>{record.revision}</code></dd></div>
                    <div><dt>Locator</dt><dd>{record.locator}</dd></div>
                  </dl>
                  <pre aria-label="Illustrative source excerpt"><code>{record.excerpt}</code></pre>
                  {record.sourceUrl ? (
                    <a className="button button--source" href={record.sourceUrl} target="_blank" rel="noreferrer">
                      Open pinned public source ↗
                    </a>
                  ) : (
                    <p className="source-unavailable">No public revision-pinned external link is available.</p>
                  )}
                </div>
              ))}
              {evidence.conflictingEvidence.length > 0 && (
                <>
                  <h3 className="evidence-stack__conflict">
                    Conflicting evidence / {evidence.conflictingEvidence.length}
                  </h3>
                  {evidence.conflictingEvidence.map((record) => (
                    <div className="evidence-record evidence-record--conflict" key={record.id}>
                      <div className="evidence-record__heading">
                        <div>
                          <span>Evidence status</span>
                          <EvidenceStatusBadge status={record.evidenceStatus} />
                        </div>
                        <div>
                          <span>Evidence confidence</span>
                          <strong>{confidencePresentation[record.confidence]}</strong>
                        </div>
                        <code>{record.id}</code>
                      </div>
                      <dl className="evidence-ledger">
                        <div><dt>Source</dt><dd>{record.repository}</dd></div>
                        <div><dt>Source type</dt><dd>{record.sourceType}</dd></div>
                        <div><dt>Provenance</dt><dd>{record.provenance}</dd></div>
                        <div><dt>Access</dt><dd>{record.accessScope}</dd></div>
                        <div><dt>Retrieved</dt><dd><time dateTime={record.retrievedAt}>{record.retrievedAt}</time></dd></div>
                        <div><dt>Revision</dt><dd><code>{record.revision}</code></dd></div>
                        <div><dt>Locator</dt><dd>{record.locator}</dd></div>
                      </dl>
                      <pre aria-label="Illustrative conflicting source excerpt"><code>{record.excerpt}</code></pre>
                      {record.sourceUrl ? (
                        <a className="button button--source" href={record.sourceUrl} target="_blank" rel="noreferrer">
                          Open pinned public source ↗
                        </a>
                      ) : (
                        <p className="source-unavailable">No public revision-pinned external link is available.</p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="drawer-warning">
              <strong>Contract-valid fixture shape.</strong> The project claim, excerpt, and locator
              are illustrative and have not been verified as project intelligence.
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export function App() {
  const [view, setView] = useState<View>("explore");
  const [query, setQuery] = useState(preparedQuery);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [evidence, setEvidence] = useState<ClaimEvidenceRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const evidenceTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && drawerOpen) closeDrawer();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  });

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const announceView = (nextView: View) => {
    setView(nextView);
    window.requestAnimationFrame(() => mainRef.current?.focus());
  };

  const search = async () => {
    setPending("search");
    setError(null);
    try {
      const result = await catalogGateway.searchProjects(query);
      setResponse(result);
      announceView("results");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The catalog could not be read.");
    } finally {
      setPending(null);
    }
  };

  const toggleProject = (projectId: string) => {
    setShortlist((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : current.length < 3
          ? [...current, projectId]
          : current,
    );
  };

  const openComparison = async () => {
    if (shortlist.length < 2) return;
    setPending("comparison");
    setError(null);
    try {
      const result = await catalogGateway.compareProjects(shortlist);
      setComparison(result);
      announceView("comparison");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The comparison could not be prepared.");
    } finally {
      setPending(null);
    }
  };

  const openEvidence = async (claimId: string, trigger: HTMLButtonElement) => {
    evidenceTriggerRef.current = trigger;
    setEvidence(null);
    setError(null);
    setDrawerOpen(true);
    setPending("evidence");
    try {
      setEvidence(await catalogGateway.getClaimEvidence(claimId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The evidence could not be resolved.");
    } finally {
      setPending(null);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEvidence(null);
    setError(null);
    window.requestAnimationFrame(() => evidenceTriggerRef.current?.focus());
  };

  const reset = () => {
    setResponse(null);
    setComparison(null);
    setShortlist([]);
    setDrawerOpen(false);
    setError(null);
    announceView("explore");
  };

  return (
    <>
      <div className="app-shell" inert={drawerOpen ? true : undefined}>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <PrototypeNotice />
        <AppHeader onExplore={reset} />
        <main id="main-content" ref={mainRef} tabIndex={-1}>
          {view === "explore" && (
            <Explore query={query} pending={pending === "search"} onQueryChange={setQuery} onSubmit={() => void search()} />
          )}
          {view === "results" && response && (
            <Results response={response} shortlist={shortlist} onToggle={toggleProject} onEdit={() => announceView("explore")} />
          )}
          {view === "comparison" && comparison && (
            <Comparison
              comparison={comparison}
              projects={response?.projects ?? []}
              onBack={() => announceView("results")}
              onOpenEvidence={(id, trigger) => void openEvidence(id, trigger)}
            />
          )}
          {error && !drawerOpen && <p className="page-error" role="alert">{error}</p>}
        </main>
        {view === "results" && shortlist.length > 0 && (
          <div className="compare-tray" aria-live="polite">
            <div>
              <span>Shortlist</span>
              <strong>{shortlist.length} / 3 projects</strong>
              <p>{shortlist.map((id) => response?.projects.find((project) => project.id === id)?.name).join(" · ")}</p>
            </div>
            <button
              className="button button--primary"
              type="button"
              disabled={shortlist.length < 2 || pending === "comparison"}
              onClick={() => void openComparison()}
            >
              {pending === "comparison" ? "Preparing…" : shortlist.length < 2 ? "Select one more" : "Compare projects →"}
            </button>
          </div>
        )}
      </div>
      {drawerOpen && (
        <EvidenceDrawer evidence={evidence} pending={pending === "evidence"} error={error} onClose={closeDrawer} />
      )}
    </>
  );
}
