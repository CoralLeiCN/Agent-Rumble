import type { AssessmentContextInput } from "../types/catalog";

export function ContextEditor({
  context,
  onChange,
}: {
  context: AssessmentContextInput;
  onChange: (context: AssessmentContextInput) => void;
}) {
  const fields = [
    ["requirements", "Must"],
    ["preferences", "Prefer"],
    ["exclusions", "Avoid"],
    ["comparison_cohort", "Comparison cohort"],
    ["organizational_constraints", "Organizational constraints"],
  ] as const;
  return (
    <details className="context-editor">
      <summary>Edit assessment context</summary>
      <p>
        One item per line. These constraints define the assessment; keyword
        matches alone do not prove a project satisfies them.
      </p>
      <label>
        Use case
        <input
          value={context.use_case}
          maxLength={2000}
          onChange={(event) =>
            onChange({ ...context, use_case: event.target.value })
          }
        />
      </label>
      {fields.map(([key, label]) => (
        <label key={key}>
          {label}
          <textarea
            rows={3}
            value={context[key].join("\n")}
            maxLength={4000}
            onChange={(event) =>
              onChange({ ...context, [key]: event.target.value.split("\n") })
            }
          />
        </label>
      ))}
      <label>
        Assessment date
        <input
          type="date"
          value={context.assessed_at?.slice(0, 10) ?? ""}
          onChange={(event) =>
            onChange({
              ...context,
              assessed_at: event.target.value
                ? `${event.target.value}T00:00:00Z`
                : undefined,
            })
          }
        />
      </label>
    </details>
  );
}

export function cleanContext(
  context: AssessmentContextInput,
): AssessmentContextInput {
  const clean = (items: string[]) =>
    items.map((item) => item.trim()).filter(Boolean);
  return {
    ...context,
    use_case: context.use_case.trim(),
    requirements: clean(context.requirements),
    preferences: clean(context.preferences),
    exclusions: clean(context.exclusions),
    comparison_cohort: clean(context.comparison_cohort),
    organizational_constraints: clean(context.organizational_constraints),
  };
}
