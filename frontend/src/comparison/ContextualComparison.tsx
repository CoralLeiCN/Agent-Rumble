import type {
  ClaimReference,
  ContextualComparison as ContextualResult,
  ProjectSummary,
} from "../types/catalog";
import {
  comparisonStatePresentation,
  confidencePresentation,
  verificationPresentation,
} from "../status/statusPresentation";

function readable(value: unknown): string {
  if (Array.isArray(value)) return value.map(readable).join(" · ");
  if (value && typeof value === "object" && "statement" in value)
    return String(value.statement);
  if (value && typeof value === "object")
    return Object.values(value).map(readable).join(" · ");
  return String(value ?? "");
}

export function ContextualComparison({
  result,
  projects,
  onOpenEvidence,
}: {
  result: ContextualResult;
  projects: ProjectSummary[];
  onOpenEvidence: (
    reference: ClaimReference,
    trigger: HTMLButtonElement,
  ) => void;
}) {
  return (
    <section
      className="contextual-comparison"
      aria-label="Assessment under your context"
    >
      <h2>Your assessment context</h2>
      <p>{result.assessment_context.use_case}</p>
      <details>
        <summary>Requirements and assessment scope</summary>
        <dl>
          {(
            [
              ["Must", result.assessment_context.requirements],
              ["Prefer", result.assessment_context.preferences],
              ["Avoid", result.assessment_context.exclusions],
              [
                "Comparison cohort",
                result.assessment_context.comparison_cohort,
              ],
              [
                "Organizational constraints",
                result.assessment_context.organizational_constraints,
              ],
            ] as const
          ).map(([label, items]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{items.length ? items.join(" · ") : "None specified"}</dd>
            </div>
          ))}
          <div>
            <dt>Assessment date</dt>
            <dd>
              {result.assessment_context.assessed_at?.slice(0, 10) ??
                "Not specified"}
            </dd>
          </div>
        </dl>
      </details>
      <p>
        <strong>Role relationship: </strong>
        {result.role_analysis.explanation}
      </p>
      <p>
        Missing assessments remain not analyzed; recorded card assessments below
        retain their original contexts.
      </p>
      {result.rows
        .filter((row) =>
          ["contextual-best-fit", "limitations", "maturity"].includes(row.id),
        )
        .map((row) => (
          <details key={row.id} open={row.id === "contextual-best-fit"}>
            <summary>{row.label}</summary>
            {Object.entries(row.cells).map(([projectId, cell]) => (
              <div key={projectId}>
                <h3>
                  {projects.find((project) => project.id === projectId)?.name ??
                    projectId}
                </h3>
                <p>
                  {cell.state === "value"
                    ? typeof cell.value === "string"
                      ? cell.value
                      : readable(cell.value)
                    : comparisonStatePresentation[cell.state].label}
                </p>
                <p>
                  {cell.claim_verification_status
                    ? verificationPresentation[cell.claim_verification_status]
                        .label
                    : "Verification not recorded"}
                  {" · "}
                  {cell.confidence
                    ? confidencePresentation[cell.confidence]
                    : "Confidence not recorded"}
                </p>
                {cell.claim_ids.map((claimId, index) => (
                  <button
                    className="button button--quiet"
                    key={claimId}
                    type="button"
                    onClick={(event) =>
                      onOpenEvidence(
                        { projectId, cardVersion: cell.card_version, claimId },
                        event.currentTarget,
                      )
                    }
                  >
                    Inspect supporting claim {index + 1}
                  </button>
                ))}
              </div>
            ))}
          </details>
        ))}
    </section>
  );
}
