import type { AssessmentContextInput } from "../types/catalog";
import { developmentContext } from "./assessmentContext";
import { readCatalogGatewayConfig } from "./catalogConfig";

const key = `agent-rumble:${readCatalogGatewayConfig().apiBaseUrl}:session`;
export interface CatalogSession {
  query: string;
  context: AssessmentContextInput;
  shortlist: string[];
}
export function restoreSession(): CatalogSession {
  const fallback = {
    query: developmentContext.use_case,
    context: developmentContext,
    shortlist: [],
  };
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw || raw.length > 20_000) return fallback;
    const value = JSON.parse(raw) as CatalogSession;
    if (
      typeof value.query !== "string" ||
      !Array.isArray(value.shortlist) ||
      value.shortlist.length > 3 ||
      value.shortlist.some((item) => typeof item !== "string" || !item) ||
      new Set(value.shortlist).size !== value.shortlist.length
    )
      return fallback;
    const context = value.context;
    if (
      !context ||
      typeof context.use_case !== "string" ||
      (context.assessed_at !== undefined &&
        (typeof context.assessed_at !== "string" ||
          !Number.isFinite(Date.parse(context.assessed_at))))
    )
      return fallback;
    if (
      [
        context.requirements,
        context.preferences,
        context.exclusions,
        context.comparison_cohort,
        context.organizational_constraints,
      ].some(
        (items) =>
          !Array.isArray(items) ||
          items.some((item) => typeof item !== "string"),
      )
    )
      return fallback;
    return value;
  } catch {
    return fallback;
  }
}

export function saveSession(value: CatalogSession) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be disabled. */
  }
}
