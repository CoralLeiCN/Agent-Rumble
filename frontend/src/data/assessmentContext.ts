import type { AssessmentContextInput } from "../types/catalog";

export const developmentContext: AssessmentContextInput = {
  use_case:
    "A Python support-agent prototype with tools and explicit workflow control",
  comparison_cohort: ["OpenAI Agents SDK", "LangGraph", "CrewAI"],
  requirements: ["Python", "Tool integration", "Workflow control"],
  preferences: [],
  exclusions: [],
  organizational_constraints: [
    "Static evidence only; runtime behavior has not been verified",
  ],
  assessed_at: "2026-09-25T00:00:00Z",
};
