import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { catalogGateway } from "./data/catalogGateway";
import { preparedQuery, projects as allProjects } from "./data/fixtures";
import {
  comparisonStatePresentation,
  confidencePresentation,
  requirementPresentation,
  verificationPresentation,
} from "./status/statusPresentation";
import type {
  ComparisonCell,
  ComparisonResponse,
  EvidenceRecord,
  ProjectSummary,
  SearchResponse,
  VerificationStatus,
} from "./types/catalog";

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
      Unvalidated fixture data · not project intelligence
    </div>
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
          <p>{response.assessmentContext}</p>
        </div>
        <button className="button button--quiet" type="button" onClick={onEdit}>
          ← Edit request
        </button>
      </div>

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
            <p>{project.owner} / public repository</p>
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
        <div className="project-row__match">
          <span aria-hidden="true">↳</span>
          <p><strong>Why it surfaced</strong>{project.matchReason}</p>
        </div>
        <div className="project-row__constraint">
          <strong>Important constraint</strong><span>{project.constraint}</span>
        </div>
        <div className="snapshot-strip">
          <StatusBadge status={project.verificationStatus} />
          <span>{confidencePresentation[project.confidence]}</span>
          <code>REV {project.revision}</code>
          <time dateTime={project.analyzedAt}>SNAPSHOT {project.analyzedAt}</time>
        </div>
      </div>
    </article>
  );
}

interface ComparisonProps {
  comparison: ComparisonResponse;
  onBack: () => void;
  onOpenEvidence: (evidenceId: string, trigger: HTMLButtonElement) => void;
}

function Comparison({ comparison, onBack, onOpenEvidence }: ComparisonProps) {
  const selectedProjects = comparison.projectIds
    .map((id) => allProjects.find((project) => project.id === id))
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
        <p>{comparison.assessmentContext}</p>
      </div>
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
      <button className="shared-attributes" type="button" disabled>
        + {comparison.sharedAttributeCount} shared attributes collapsed
        <span>Available in the production card projection</span>
      </button>
      <p className="fixture-footnote">
        Prototype safeguard: values and locators above are illustrative fixtures. They are not
        validated Agent Project Cards and must not be used for adoption decisions.
      </p>
    </section>
  );
}

interface TableGroupProps {
  group: string;
  rows: ComparisonResponse["rows"];
  projects: ProjectSummary[];
  onOpenEvidence: (evidenceId: string, trigger: HTMLButtonElement) => void;
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
  onOpenEvidence: (evidenceId: string, trigger: HTMLButtonElement) => void;
}) {
  if (cell.state !== "value") {
    const state = comparisonStatePresentation[cell.state];
    return <span className={`empty-value empty-value--${state.tone}`}><span aria-hidden="true">{state.symbol}</span>{state.label}</span>;
  }
  return (
    <div className="comparison-value">
      <p>{cell.value}</p>
      {cell.verificationStatus && (
        <div className="comparison-value__meta">
          <StatusBadge status={cell.verificationStatus} />
          {cell.confidence && <span>{confidencePresentation[cell.confidence]}</span>}
        </div>
      )}
      {cell.evidenceId && (
        <button
          className="evidence-link"
          type="button"
          onClick={(event) => onOpenEvidence(cell.evidenceId as string, event.currentTarget)}
        >
          View source evidence →
        </button>
      )}
    </div>
  );
}

interface EvidenceDrawerProps {
  evidence: EvidenceRecord | null;
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
          <div><span>Evidence inspector</span><code>{evidence?.id ?? "LOADING"}</code></div>
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
            <StatusBadge status={evidence.verificationStatus} />
            <span className="drawer-confidence">{confidencePresentation[evidence.confidence]}</span>
            <h2 id="evidence-title">{evidence.claim}</h2>
            <section>
              <h3>Why this matters</h3>
              <p>{evidence.whyItMatters}</p>
            </section>
            <dl className="evidence-ledger">
              <div><dt>Repository</dt><dd>{evidence.repository}</dd></div>
              <div><dt>Revision</dt><dd><code>{evidence.revision}</code></dd></div>
              <div><dt>Locator</dt><dd>{evidence.locator}</dd></div>
            </dl>
            <pre aria-label="Illustrative source excerpt"><code>{evidence.excerpt}</code></pre>
            <div className="drawer-warning">
              <strong>Illustrative only.</strong> This excerpt and locator have not passed Agent
              Project Card validation.
            </div>
            <a className="button button--source" href={evidence.sourceUrl} target="_blank" rel="noreferrer">
              Open pinned source ↗
            </a>
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
  const [evidence, setEvidence] = useState<EvidenceRecord | null>(null);
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

  const openEvidence = async (evidenceId: string, trigger: HTMLButtonElement) => {
    evidenceTriggerRef.current = trigger;
    setEvidence(null);
    setError(null);
    setDrawerOpen(true);
    setPending("evidence");
    try {
      setEvidence(await catalogGateway.getEvidence(evidenceId));
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
          <Comparison comparison={comparison} onBack={() => announceView("results")} onOpenEvidence={(id, trigger) => void openEvidence(id, trigger)} />
        )}
        {error && !drawerOpen && <p className="page-error" role="alert">{error}</p>}
      </main>
      {view === "results" && shortlist.length > 0 && (
        <div className="compare-tray" aria-live="polite">
          <div>
            <span>Shortlist</span>
            <strong>{shortlist.length} / 3 projects</strong>
            <p>{shortlist.map((id) => allProjects.find((project) => project.id === id)?.name).join(" · ")}</p>
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
      {drawerOpen && (
        <EvidenceDrawer evidence={evidence} pending={pending === "evidence"} error={error} onClose={closeDrawer} />
      )}
    </>
  );
}
