import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ArenaScreen } from "./arena/ArenaScreen";
import { ContractComparison } from "./comparison/ContractComparison";
import { catalogGateway } from "./data/catalogGateway";
import { isPreparedRumblePair } from "./data/rumbleGateway";
import {
  confidencePresentation,
  requirementPresentation,
  verificationPresentation,
} from "./status/statusPresentation";
import type {
  CatalogGateway,
  ClaimEvidenceRecord,
  ComparisonResponse,
  EvidenceRecord,
  ProjectSummary,
  SearchResponse,
  VerificationStatus,
} from "./types/catalog";

type View = "explore" | "results" | "comparison" | "arena";
type PendingAction = "search" | "comparison" | "evidence" | null;

const DEFAULT_SEARCH_QUERY = "A biomedical research agent with domain tools";

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
        </span>
      </button>
      <nav aria-label="Primary navigation">
        <button className="nav-link nav-link--active" type="button" onClick={onExplore}>
          Explore
        </button>
      </nav>
    </header>
  );
}

function CatalogNotice() {
  return (
    <div className="prototype-notice" role="note">
      <span>Validated catalog</span>
      Project details are loaded from the backend's complete pinned, statically analyzed catalog.
    </div>
  );
}

interface ExploreProps {
  query: string;
  pending: boolean;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  onBrowseAll: () => void;
}

function Explore({ query, pending, onQueryChange, onSubmit, onBrowseAll }: ExploreProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section className="explore" aria-labelledby="explore-title">
      <div className="eyebrow"><span>Find your fit</span> Evidence-backed project discovery</div>
      <h1 id="explore-title">Find the right building block for your agent system.</h1>
      <p className="explore__intro">
        Describe what you are building. Compare relevant projects, trade-offs, and supporting
        sources side by side.
      </p>
      <form className="search-panel" onSubmit={handleSubmit}>
        <label htmlFor="project-need">Describe what you need</label>
        <div className="search-panel__control">
          <textarea
            id="project-need"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            rows={3}
            placeholder="For example: a self-hosted multi-agent app with MCP tools"
          />
          <button className="button button--primary" type="submit" disabled={pending || !query.trim()}>
            {pending ? "Finding projects…" : "Find projects"}
          </button>
        </div>
        <div className="example-line">
          <span>Try an example</span>
          <button type="button" onClick={() => onQueryChange(DEFAULT_SEARCH_QUERY)}>
            Biomedical research agent ↗
          </button>
          <button type="button" disabled={pending} onClick={onBrowseAll}>
            Browse every preprocessed project ↗
          </button>
        </div>
      </form>
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
  const resultCount = response.projects.length;
  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results__heading">
        <div>
          <div className="eyebrow"><span>Matches</span> Based on your request</div>
          <h1 id="results-title">
            {resultCount === 0
              ? "No matching projects yet"
              : `${resultCount} ${resultCount === 1 ? "project" : "projects"} to compare`}
          </h1>
        </div>
        <button className="button button--quiet" type="button" onClick={onEdit}>
          ← Edit request
        </button>
      </div>
      <section className="interpretation" aria-labelledby="interpretation-title">
        <div className="section-heading">
          <h2 id="interpretation-title">What matters for your search</h2>
          <span>Edit your request if this does not look right</span>
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
        <div className="project-list">
          {resultCount > 0 && (
            <div className="list-caption">
              <span>{resultCount} {resultCount === 1 ? "match" : "matches"}</span>
              <span>Choose up to 3</span>
            </div>
          )}
          {resultCount === 0 && (
            <div className="search-empty" role="status">
              <h2>Try a broader search</h2>
              <p>
                Search by a project name, purpose, capability, language, technology, or
                architecture term available in the catalog.
              </p>
              <button className="button button--primary" type="button" onClick={onEdit}>
                Update search
              </button>
            </div>
          )}
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
            <p>{project.owner} · Open-source project</p>
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
          <strong>What is included</strong>
          <span>{project.boundary}</span>
        </div>
        <div className="project-row__match">
          <span aria-hidden="true">↳</span>
          <p><strong>Why it matches</strong>{project.matchReason}</p>
        </div>
        <div className="project-row__constraint">
          <strong>Watch out for</strong><span>{project.constraint}</span>
        </div>
        <div className="snapshot-strip">
          <div className="snapshot-strip__primary">
            <span className="snapshot-strip__label">Match confidence</span>
            <StatusBadge status={project.matchClaim.verificationStatus} />
            <span>{confidencePresentation[project.matchClaim.confidence]}</span>
            <time dateTime={project.analyzedAt}>Reviewed {project.analyzedAt}</time>
          </div>
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

  return (
    <section className="comparison" aria-labelledby="comparison-title">
      <button className="back-link" type="button" onClick={onBack}>← Back to search results</button>
      <div className="comparison__heading">
        <div>
          <h1 id="comparison-title" tabIndex={-1}>Compare {selectedProjects.length} projects</h1>
          <p>
            See how your shortlist lines up for {comparison.assessmentContexts[0]?.useCase
              ?? "the needs in your search"}.
          </p>
        </div>
      </div>
      <ContractComparison
        comparison={comparison}
        projects={projects}
        onOpenEvidence={onOpenEvidence}
      />
    </section>
  );
}

interface EvidenceDrawerProps {
  evidence: ClaimEvidenceRecord | null;
  pending: boolean;
  error: string | null;
  isIllustrative: boolean;
  onClose: () => void;
}

function sourcePublisherLabel(value: string) {
  if (value === "first_party") return "Project publisher";
  if (value === "third_party") return "Third-party publisher";
  return "Publisher not recorded";
}

function readableSourceValue(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function projectArenaEvidence(record: EvidenceRecord): ClaimEvidenceRecord {
  const relationship = record.relationship ?? "supporting";
  const resolvedEvidence = {
    id: record.id,
    relationship,
    confidence: record.confidence,
    sourceType: "repository_file",
    provenance: "first_party",
    retrievedAt: "Not recorded",
    accessScope: "public",
    repository: record.repository,
    revision: record.revision,
    locator: record.locator,
    excerpt: record.excerpt,
    sourceUrl: record.sourceUrl,
  };
  return {
    claimId: record.id,
    projectId: record.projectId,
    claim: record.claim,
    claimKind: "assessment",
    appliesTo: record.projectId,
    assessmentContextId: null,
    whyItMatters: record.whyItMatters,
    verificationStatus: record.verificationStatus,
    confidence: record.confidence,
    supportingEvidence: relationship === "supporting" ? [resolvedEvidence] : [],
    conflictingEvidence: relationship === "conflicting" ? [resolvedEvidence] : [],
  };
}

function EvidenceDrawer({ evidence, pending, error, isIllustrative, onClose }: EvidenceDrawerProps) {
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
          <div><span>Source details</span></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close source details">×</button>
        </div>
        {pending && (
          <div className="drawer-state" role="status">
            <h2 className="visually-hidden" id="evidence-title">Source details</h2>
            <p>Loading source details…</p>
          </div>
        )}
        {error && (
          <div className="drawer-state drawer-state--error" role="alert">
            <h2 className="visually-hidden" id="evidence-title">Source details error</h2>
            <p>{error}</p>
          </div>
        )}
        {evidence && (
          <div className="drawer-content">
            <div className="drawer-claim-semantics">
              <div>
                <span>Verification</span>
                <StatusBadge status={evidence.verificationStatus} />
              </div>
              <div>
                <span>Confidence</span>
                <strong>{confidencePresentation[evidence.confidence]}</strong>
              </div>
            </div>
            <h2 id="evidence-title">{evidence.claim}</h2>
            <section>
              <h3>Why this matters</h3>
              <p>{evidence.whyItMatters}</p>
            </section>
            <div className="evidence-stack">
              <h3>Supporting sources / {evidence.supportingEvidence.length}</h3>
              {evidence.supportingEvidence.length === 0 && (
                <p className="empty-evidence">○ No supporting source linked</p>
              )}
              {evidence.supportingEvidence.map((record) => (
                <div className="evidence-record" key={record.id}>
                  <div className="evidence-record__heading">
                    <div>
                      <span>Confidence</span>
                      <strong>{confidencePresentation[record.confidence]}</strong>
                    </div>
                  </div>
                  <dl className="evidence-ledger">
                    <div><dt>Source</dt><dd>{record.repository}</dd></div>
                    <div><dt>Source type</dt><dd>{readableSourceValue(record.sourceType)}</dd></div>
                    <div><dt>Publisher</dt><dd>{sourcePublisherLabel(record.provenance)}</dd></div>
                    <div><dt>Availability</dt><dd>{readableSourceValue(record.accessScope)}</dd></div>
                    <div><dt>Checked</dt><dd><time dateTime={record.retrievedAt}>{record.retrievedAt}</time></dd></div>
                    <div><dt>Version reviewed</dt><dd><code>{record.revision}</code></dd></div>
                    <div><dt>Location in source</dt><dd>{record.locator}</dd></div>
                  </dl>
                  <pre aria-label="Source excerpt"><code>{record.excerpt}</code></pre>
                  {record.sourceUrl ? (
                    <a className="button button--source" href={record.sourceUrl} target="_blank" rel="noreferrer">
                      View source ↗
                    </a>
                  ) : (
                    <p className="source-unavailable">No public source link is available.</p>
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
                          <span>Confidence</span>
                          <strong>{confidencePresentation[record.confidence]}</strong>
                        </div>
                      </div>
                      <dl className="evidence-ledger">
                        <div><dt>Source</dt><dd>{record.repository}</dd></div>
                        <div><dt>Source type</dt><dd>{readableSourceValue(record.sourceType)}</dd></div>
                        <div><dt>Publisher</dt><dd>{sourcePublisherLabel(record.provenance)}</dd></div>
                        <div><dt>Availability</dt><dd>{readableSourceValue(record.accessScope)}</dd></div>
                        <div><dt>Checked</dt><dd><time dateTime={record.retrievedAt}>{record.retrievedAt}</time></dd></div>
                        <div><dt>Version reviewed</dt><dd><code>{record.revision}</code></dd></div>
                        <div><dt>Location in source</dt><dd>{record.locator}</dd></div>
                      </dl>
                      <pre aria-label="Conflicting source excerpt"><code>{record.excerpt}</code></pre>
                      {record.sourceUrl ? (
                        <a className="button button--source" href={record.sourceUrl} target="_blank" rel="noreferrer">
                          View source ↗
                        </a>
                      ) : (
                        <p className="source-unavailable">No public source link is available.</p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
            {isIllustrative && (
              <div className="drawer-warning">
                <strong>Sample data.</strong> This source excerpt and location are illustrative and
                should be independently verified.
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

interface AppProps {
  gateway?: CatalogGateway;
}

export function App({ gateway = catalogGateway }: AppProps) {
  const [view, setView] = useState<View>("explore");
  const [query, setQuery] = useState(DEFAULT_SEARCH_QUERY);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [evidence, setEvidence] = useState<ClaimEvidenceRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const evidenceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const canEnterRumble = isPreparedRumblePair(shortlist);

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

  const search = async (searchQuery = query) => {
    setPending("search");
    setError(null);
    try {
      const result = await gateway.searchProjects(searchQuery);
      setResponse(result);
      setShortlist([]);
      setComparison(null);
      announceView("results");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Projects could not be loaded right now.");
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
      const result = await gateway.compareProjects(shortlist);
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
      setEvidence(await gateway.getClaimEvidence(claimId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Source details could not be loaded.");
    } finally {
      setPending(null);
    }
  };

  const openArenaEvidence = (record: EvidenceRecord, trigger: HTMLButtonElement) => {
    evidenceTriggerRef.current = trigger;
    setEvidence(projectArenaEvidence(record));
    setError(null);
    setPending(null);
    setDrawerOpen(true);
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
        <CatalogNotice />
        <AppHeader onExplore={reset} />
        <main id="main-content" ref={mainRef} tabIndex={-1}>
          {view === "explore" && (
            <Explore
              query={query}
              pending={pending === "search"}
              onQueryChange={setQuery}
              onSubmit={() => void search()}
              onBrowseAll={() => void search("")}
            />
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
          {view === "arena" && (
            <ArenaScreen
              projectIds={shortlist}
              projectNames={shortlist.map((id) =>
                response?.projects.find((project) => project.id === id)?.name ?? id
              )}
              onExit={() => announceView("results")}
              onOpenEvidence={openArenaEvidence}
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
            <div className="compare-tray__actions">
              <button
                className={`button ${canEnterRumble ? "button--tray-secondary" : "button--primary"}`}
                type="button"
                disabled={shortlist.length < 2 || pending === "comparison"}
                onClick={() => void openComparison()}
              >
                {pending === "comparison" ? "Preparing…" : shortlist.length < 2 ? "Select one more" : "Compare projects →"}
              </button>
              {canEnterRumble && (
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => announceView("arena")}
                >
                  Enter Rumble →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {drawerOpen && (
        <EvidenceDrawer
          evidence={evidence}
          pending={pending === "evidence"}
          error={error}
          isIllustrative={false}
          onClose={closeDrawer}
        />
      )}
    </>
  );
}
