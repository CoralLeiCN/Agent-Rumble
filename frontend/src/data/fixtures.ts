import type {
  ComparisonResponse,
  EvidenceRecord,
  ProjectSummary,
  SearchResponse,
} from "../types/catalog";

export const preparedQuery =
  "A customer-support agent framework with human approval, durable state, and self-hosting";

export const projects: ProjectSummary[] = [
  {
    id: "openai-agents-sdk",
    name: "OpenAI Agents SDK",
    owner: "openai",
    projectType: "Agent SDK",
    role: "Application agent runtime",
    summary:
      "A compact SDK for composing agents, tools, handoffs, guardrails, and tracing in application code.",
    matchReason:
      "Matches the lightweight runtime preference and exposes an approval-oriented tool workflow.",
    constraint:
      "Durable workflow state requires application-owned infrastructure.",
    languages: ["Python", "TypeScript"],
    revision: "a94d3f2",
    analyzedAt: "2026-07-15",
    verificationStatus: "statically_confirmed",
    confidence: "high",
  },
  {
    id: "langgraph",
    name: "LangGraph",
    owner: "langchain-ai",
    projectType: "Orchestration framework",
    role: "Stateful workflow runtime",
    summary:
      "A graph-oriented runtime for long-running, stateful agent workflows with persistence and interrupts.",
    matchReason:
      "Directly addresses durable execution, pause-and-resume review, and explicit workflow state.",
    constraint:
      "The graph execution model adds concepts and operational surface area.",
    languages: ["Python", "TypeScript"],
    revision: "7bc162e",
    analyzedAt: "2026-07-15",
    verificationStatus: "statically_confirmed",
    confidence: "high",
  },
  {
    id: "crewai",
    name: "CrewAI",
    owner: "crewAIInc",
    projectType: "Multi-agent framework",
    role: "Role-based agent orchestration",
    summary:
      "A framework for assembling role-based agent teams and structured task flows.",
    matchReason:
      "Matches the self-hosted preference and offers a higher-level multi-agent composition model.",
    constraint:
      "Approval and durable-state behavior need validation for this assessment context.",
    languages: ["Python"],
    revision: "e12ab60",
    analyzedAt: "2026-07-14",
    verificationStatus: "documented",
    confidence: "medium",
  },
];

export const searchFixture: SearchResponse = {
  query: preparedQuery,
  assessmentContext:
    "Two-week customer-support prototype · self-hosted preferred · human approval required before sensitive actions",
  requirements: [
    { id: "req-approval", kind: "must", label: "Human approval controls" },
    { id: "req-python", kind: "must", label: "Python support" },
    { id: "req-state", kind: "prefer", label: "Durable workflow state" },
    { id: "req-host", kind: "prefer", label: "Self-hosted core" },
    { id: "req-avoid", kind: "avoid", label: "Mandatory hosted control plane" },
  ],
  uninterpretedTerms: ["customer-support"],
  projects,
};

export const evidence: Record<string, EvidenceRecord> = {
  "ev-openai-approval": {
    id: "ev-openai-approval",
    projectId: "openai-agents-sdk",
    claim: "Tool execution can pause while an application requests human approval.",
    whyItMatters:
      "The current assessment requires review before sensitive customer-account actions.",
    verificationStatus: "statically_confirmed",
    confidence: "high",
    repository: "openai/openai-agents-python",
    revision: "a94d3f2",
    locator: "src/agents/tool.py · lines 610–636",
    excerpt:
      "if needs_approval:\n    return ToolCallOutputItem(..., output=\"Tool execution was not approved.\")",
    sourceUrl:
      "https://github.com/openai/openai-agents-python/blob/a94d3f2/src/agents/tool.py#L610-L636",
  },
  "ev-langgraph-approval": {
    id: "ev-langgraph-approval",
    projectId: "langgraph",
    claim: "A graph can interrupt execution and resume from persisted state after review.",
    whyItMatters:
      "Approval must survive a process boundary in the prepared support workflow.",
    verificationStatus: "statically_confirmed",
    confidence: "high",
    repository: "langchain-ai/langgraph",
    revision: "7bc162e",
    locator: "libs/langgraph/langgraph/types.py · lines 420–461",
    excerpt:
      "def interrupt(value: Any) -> Any:\n    # Resume values are matched to interrupts by index.\n    raise GraphInterrupt(...) ",
    sourceUrl:
      "https://github.com/langchain-ai/langgraph/blob/7bc162e/libs/langgraph/langgraph/types.py#L420-L461",
  },
  "ev-crewai-approval": {
    id: "ev-crewai-approval",
    projectId: "crewai",
    claim: "Human input is described, but pause-and-resume approval semantics remain unverified.",
    whyItMatters:
      "A documented prompt is not yet evidence of a durable approval boundary.",
    verificationStatus: "documented",
    confidence: "medium",
    repository: "crewAIInc/crewAI",
    revision: "e12ab60",
    locator: "docs/concepts/tasks.mdx · human input section",
    excerpt:
      "human_input: Whether the task should have a human review the final answer.",
    sourceUrl:
      "https://github.com/crewAIInc/crewAI/blob/e12ab60/docs/concepts/tasks.mdx",
  },
  "ev-langgraph-state": {
    id: "ev-langgraph-state",
    projectId: "langgraph",
    claim: "Checkpointing is a first-class part of the workflow persistence model.",
    whyItMatters:
      "The support workflow should recover pending work without application-specific reconstruction.",
    verificationStatus: "statically_confirmed",
    confidence: "high",
    repository: "langchain-ai/langgraph",
    revision: "7bc162e",
    locator: "libs/checkpoint/langgraph/checkpoint/base/__init__.py · lines 120–170",
    excerpt:
      "class BaseCheckpointSaver(Generic[V]):\n    \"\"\"Base class for creating a graph checkpointer.\"\"\"",
    sourceUrl:
      "https://github.com/langchain-ai/langgraph/blob/7bc162e/libs/checkpoint/langgraph/checkpoint/base/__init__.py#L120-L170",
  },
};

export function makeComparison(projectIds: string[]): ComparisonResponse {
  return {
    assessmentContext: searchFixture.assessmentContext,
    projectIds,
    sharedAttributeCount: 12,
    rows: [
      {
        id: "role",
        label: "Architecture role",
        group: "Role and fit",
        cells: {
          "openai-agents-sdk": {
            state: "value",
            value: "Application-level SDK; adjacent to a durable orchestrator.",
          },
          langgraph: {
            state: "value",
            value: "Stateful workflow runtime; can substitute for application orchestration.",
          },
          crewai: {
            state: "value",
            value: "Role-based multi-agent framework; overlaps at a higher abstraction level.",
          },
        },
      },
      {
        id: "approval",
        label: "Human approval",
        group: "Material differences",
        cells: {
          "openai-agents-sdk": {
            state: "value",
            value: "Tool approval is represented before execution.",
            verificationStatus: "statically_confirmed",
            confidence: "high",
            evidenceId: "ev-openai-approval",
          },
          langgraph: {
            state: "value",
            value: "Execution can interrupt for review and resume.",
            verificationStatus: "statically_confirmed",
            confidence: "high",
            evidenceId: "ev-langgraph-approval",
          },
          crewai: {
            state: "value",
            value: "Human review is documented; durable approval needs validation.",
            verificationStatus: "documented",
            confidence: "medium",
            evidenceId: "ev-crewai-approval",
          },
        },
      },
      {
        id: "state",
        label: "Durable state",
        group: "Material differences",
        cells: {
          "openai-agents-sdk": {
            state: "value",
            value: "Session state exists; durable workflow recovery is application-owned.",
            verificationStatus: "documented",
            confidence: "medium",
          },
          langgraph: {
            state: "value",
            value: "Checkpointing is central to the graph execution model.",
            verificationStatus: "statically_confirmed",
            confidence: "high",
            evidenceId: "ev-langgraph-state",
          },
          crewai: {
            state: "not_analyzed",
          },
        },
      },
      {
        id: "boundary",
        label: "Hosted dependency",
        group: "Material differences",
        cells: {
          "openai-agents-sdk": {
            state: "value",
            value: "Core SDK is installable; model-provider dependencies remain.",
            verificationStatus: "statically_confirmed",
            confidence: "high",
          },
          langgraph: {
            state: "value",
            value: "Open-source runtime; hosted platform is optional.",
            verificationStatus: "documented",
            confidence: "medium",
          },
          crewai: {
            state: "unknown",
          },
        },
      },
      {
        id: "prototype-when",
        label: "Prototype when…",
        group: "Prototype guidance",
        cells: {
          "openai-agents-sdk": {
            state: "value",
            value: "You want a small application SDK and can own durable state.",
          },
          langgraph: {
            state: "value",
            value: "Pause, resume, and stateful workflows are the center of the design.",
          },
          crewai: {
            state: "value",
            value: "Role-based teams are more important than low-level workflow control.",
          },
        },
      },
    ],
  };
}
