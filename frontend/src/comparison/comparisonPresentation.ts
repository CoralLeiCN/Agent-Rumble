import type {
  ComparisonContractField,
  ComparisonGroup,
  ComparisonRow,
} from "../types/catalog";

export const HIGHLIGHT_ROW_LIMIT = 4;

interface SectionDefinition {
  id: string;
  label: string;
  groupIds: string[];
  priority: "primary" | "secondary";
}

const sectionDefinitions: SectionDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    groupIds: ["summary", "project", "classification"],
    priority: "primary",
  },
  {
    id: "capabilities",
    label: "Capabilities",
    groupIds: ["capabilities"],
    priority: "primary",
  },
  {
    id: "architecture-setup",
    label: "Architecture & setup",
    groupIds: ["architecture", "components", "usage"],
    priority: "primary",
  },
  {
    id: "fit-tradeoffs",
    label: "Fit & trade-offs",
    groupIds: ["assessment", "open_questions"],
    priority: "primary",
  },
  {
    id: "integrations-dependencies",
    label: "Integrations & dependencies",
    groupIds: ["relationships"],
    priority: "primary",
  },
  {
    id: "sources-freshness",
    label: "Sources & freshness",
    groupIds: ["source_snapshot", "claims", "sources", "evidence"],
    priority: "secondary",
  },
  {
    id: "technical-details",
    label: "Technical details",
    groupIds: ["schema_version", "card_id", "card_version", "field_states"],
    priority: "secondary",
  },
];

export interface PresentedComparisonRow extends ComparisonRow {
  sourceGroupId: string;
}

export interface PresentedContractField extends ComparisonContractField {
  sourceGroupId: string;
}

export interface ComparisonPresentationSection {
  id: string;
  label: string;
  priority: "primary" | "secondary";
  highlights: PresentedComparisonRow[];
  details: PresentedComparisonRow[];
  contractOnlyFields: PresentedContractField[];
}

function rowPriority(row: ComparisonRow, originalIndex: number) {
  let score = 0;
  const pattern = row.fieldPattern;
  const isIdentifier = /(?:^|\/)(?:.*_id|.*_ids|schema_version|card_version|revision_or_version|commit|content_digest|url|uri|path|line_start|line_end)$/.test(
    pattern,
  );
  const repeatsHeader = /^\/(?:card_id|card_version|schema_version)$/.test(pattern)
    || /^\/project\/(?:project_id|name)$/.test(pattern);
  const isAssessmentContext = pattern.startsWith("/assessment/contexts/");
  const isDecisionDetail = /\/(?:one_line|purpose|primary_type|description|overview|support_status|maturity|statement|limitations|prerequisites|required_services|interfaces|languages|deployment|security_and_permissions|scope)$/.test(
    pattern,
  );

  if (isDecisionDetail) score += 500;
  if (row.semanticKind !== "value") score += 350;
  if (row.isDifferent) score += 300;
  if (Object.values(row.cells).some(({ state }) => state !== "value" && state !== "not_present")) {
    score += 100;
  }
  if (isAssessmentContext) score -= 500;
  if (isIdentifier) score -= 700;
  if (repeatsHeader) score -= 900;

  return { score, originalIndex };
}

function prioritizedRows(groups: ComparisonGroup[]): PresentedComparisonRow[] {
  const rows = groups.flatMap((group) => group.rows.map((row) => ({
    ...row,
    sourceGroupId: group.id,
  })));
  return rows
    .map((row, originalIndex) => ({ row, ...rowPriority(row, originalIndex) }))
    .sort((left, right) => right.score - left.score || left.originalIndex - right.originalIndex)
    .map(({ row }) => row);
}

function fieldsForGroups(groups: ComparisonGroup[]): PresentedContractField[] {
  return groups.flatMap((group) => group.contractOnlyFields.map((field) => ({
    ...field,
    sourceGroupId: group.id,
  })));
}

export function buildComparisonPresentation(
  groups: ComparisonGroup[],
): ComparisonPresentationSection[] {
  const assignedGroups = new Set(sectionDefinitions.flatMap(({ groupIds }) => groupIds));
  const unknownGroups = groups.filter(({ id }) => !assignedGroups.has(id));

  return sectionDefinitions.map((section) => {
    const sectionGroups = groups.filter(({ id }) => section.groupIds.includes(id));
    if (section.id === "technical-details") sectionGroups.push(...unknownGroups);
    const rows = prioritizedRows(sectionGroups);
    const highlightCount = section.priority === "primary"
      ? Math.min(HIGHLIGHT_ROW_LIMIT, rows.length)
      : 0;
    return {
      id: section.id,
      label: section.label,
      priority: section.priority,
      highlights: rows.slice(0, highlightCount),
      details: rows.slice(highlightCount),
      contractOnlyFields: fieldsForGroups(sectionGroups),
    };
  }).filter((section) => (
    section.highlights.length > 0
    || section.details.length > 0
    || section.contractOnlyFields.length > 0
  ));
}
