import { ContractComparison } from "./ContractComparison";
import { ContextualComparison } from "./ContextualComparison";
import type {
  ClaimReference,
  ComparisonResponse,
  ProjectSummary,
} from "../types/catalog";

interface ComparisonProps {
  comparison: ComparisonResponse;
  projects: ProjectSummary[];
  onBack: () => void;
  onOpenEvidence: (
    reference: ClaimReference,
    trigger: HTMLButtonElement,
  ) => void;
}

export function ComparisonScreen({
  comparison,
  projects,
  onBack,
  onOpenEvidence,
}: ComparisonProps) {
  const selectedProjects = comparison.projectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is ProjectSummary => Boolean(project));

  return (
    <section className="comparison" aria-labelledby="comparison-title">
      <button className="back-link" type="button" onClick={onBack}>
        ← Back to search results
      </button>
      <div className="comparison__heading">
        <div>
          <h1 id="comparison-title" tabIndex={-1}>
            Compare {selectedProjects.length} projects
          </h1>
          <p>
            See how your shortlist lines up for{" "}
            {comparison.contextual?.assessment_context.use_case ??
              comparison.assessmentContexts[0]?.useCase ??
              "the needs in your search"}
            .
          </p>
        </div>
      </div>
      {comparison.contextual && (
        <ContextualComparison
          result={comparison.contextual}
          projects={projects}
          onOpenEvidence={onOpenEvidence}
        />
      )}
      <ContractComparison
        comparison={comparison}
        projects={projects}
        onOpenEvidence={onOpenEvidence}
      />
    </section>
  );
}
