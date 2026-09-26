import { StatusBadge } from "../status/StatusBadge";
import {
  confidencePresentation,
  requirementPresentation,
} from "../status/statusPresentation";
import type { ProjectSummary, SearchResponse } from "../types/catalog";

interface ResultsProps {
  response: SearchResponse;
  shortlist: string[];
  onToggle: (projectId: string) => void;
  onEdit: () => void;
  onLoadMore: () => void;
  loadingMore: boolean;
}

export function ResultsScreen({
  response,
  shortlist,
  onToggle,
  onEdit,
  onLoadMore,
  loadingMore,
}: ResultsProps) {
  const resultCount = response.total;
  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results__heading">
        <div>
          <div className="eyebrow">
            <span>Matches</span> Based on your request
          </div>
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
      <section
        className="interpretation"
        aria-labelledby="interpretation-title"
      >
        <div className="section-heading">
          <h2 id="interpretation-title">What matters for your search</h2>
          <span>Edit your request if this does not look right</span>
        </div>
        <div className="requirement-list">
          {response.requirements.map((requirement) => (
            <span
              className={`requirement requirement--${requirement.kind}`}
              key={requirement.id}
            >
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
              <span>
                {resultCount} {resultCount === 1 ? "match" : "matches"}
              </span>
              <span>Choose up to 3</span>
            </div>
          )}
          {resultCount === 0 && (
            <div className="search-empty" role="status">
              <h2>Try a broader search</h2>
              <p>
                Search by a project name, purpose, capability, language,
                technology, or architecture term available in the catalog.
              </p>
              <button
                className="button button--primary"
                type="button"
                onClick={onEdit}
              >
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
              disabled={
                !shortlist.includes(project.id) && shortlist.length === 3
              }
              onToggle={() => onToggle(project.id)}
            />
          ))}
          {response.projects.length < response.total && (
            <button
              type="button"
              className="button button--primary"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore
                ? "Loading…"
                : `Load more projects (${response.projects.length} of ${response.total})`}
            </button>
          )}
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

function ProjectRow({
  project,
  index,
  selected,
  disabled,
  onToggle,
}: ProjectRowProps) {
  return (
    <article
      className={`project-row${selected ? " project-row--selected" : ""}`}
    >
      <div className="project-row__index" aria-hidden="true">
        {String(index).padStart(2, "0")}
      </div>
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
          <span>{project.projectType}</span>
          <span>{project.role}</span>
          {project.languages.map((language) => (
            <span key={language}>{language}</span>
          ))}
        </div>
        <p className="project-row__summary">{project.summary}</p>
        <div className="project-row__boundary">
          <strong>What is included</strong>
          <span>{project.boundary}</span>
        </div>
        <div className="project-row__match">
          <span aria-hidden="true">↳</span>
          <p>
            <strong>Why it matches</strong>
            {project.matchReason}
          </p>
        </div>
        <div className="project-row__constraint">
          <strong>Watch out for</strong>
          <span>{project.constraint}</span>
        </div>
        <div className="snapshot-strip">
          <div className="snapshot-strip__primary">
            <span className="snapshot-strip__label">Match confidence</span>
            {project.matchClaim ? (
              <>
                <StatusBadge status={project.matchClaim.verificationStatus} />
                <span>
                  {confidencePresentation[project.matchClaim.confidence]}
                </span>
              </>
            ) : (
              <span>No supporting match claim</span>
            )}
            <time dateTime={project.analyzedAt}>
              Reviewed {project.analyzedAt}
            </time>
          </div>
        </div>
      </div>
    </article>
  );
}
