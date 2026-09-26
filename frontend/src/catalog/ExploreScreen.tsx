import type { FormEvent } from "react";
import { ContextEditor } from "../comparison/ContextEditor";
import { GenerationForm } from "../GenerationForm";
import { developmentContext } from "../data/assessmentContext";
import type { AssessmentContextInput } from "../types/catalog";
const DEFAULT_SEARCH_QUERY = "A biomedical research agent with domain tools";

interface ExploreProps {
  context: AssessmentContextInput;
  onContextChange: (context: AssessmentContextInput) => void;
  query: string;
  pending: boolean;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  onBrowseAll: () => void;
}

export function ExploreScreen({
  context,
  onContextChange,
  query,
  pending,
  onQueryChange,
  onSubmit,
  onBrowseAll,
}: ExploreProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section className="explore" aria-labelledby="explore-title">
      <div className="eyebrow">
        <span>Find your fit</span> Evidence-backed project discovery
      </div>
      <h1 id="explore-title">
        Find the right building block for your agent system.
      </h1>
      <p className="explore__intro">
        Describe what you are building. Compare relevant projects, trade-offs,
        and supporting sources side by side.
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
          <button
            className="button button--primary"
            type="submit"
            disabled={pending || !query.trim()}
          >
            {pending ? "Finding projects…" : "Find projects"}
          </button>
        </div>
        <div className="example-line">
          <span>Try an example</span>
          <button
            type="button"
            onClick={() => {
              onQueryChange(DEFAULT_SEARCH_QUERY);
              onContextChange({
                ...context,
                use_case: DEFAULT_SEARCH_QUERY,
                requirements: [],
                preferences: [],
                exclusions: [],
                comparison_cohort: ["Public biomedical agent projects"],
                assessed_at: undefined,
              });
            }}
          >
            Biomedical research agent ↗
          </button>
          <button
            type="button"
            onClick={() => {
              onQueryChange(developmentContext.use_case);
              onContextChange(developmentContext);
            }}
          >
            Python support-agent prototype ↗
          </button>
          <button type="button" disabled={pending} onClick={onBrowseAll}>
            Browse every preprocessed project ↗
          </button>
        </div>
      </form>
      <ContextEditor context={context} onChange={onContextChange} />
      <GenerationForm />
    </section>
  );
}
