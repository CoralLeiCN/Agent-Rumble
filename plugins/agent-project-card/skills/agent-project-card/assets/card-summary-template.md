# Agent Project Card Summary: {{ project.name }}

> Generated from canonical Agent Project Card `{{ card_id }}`, card version
> `{{ card_version }}`, schema `{{ schema_version }}`. Analyzed
> `{{ source_snapshot.analyzed_at }}` with
> `{{ source_snapshot.analyzer_version }}`.
>
> Canonical artifact: `{{ path to project-card.yaml }}`

<!--
Generate this summary only from a validated project-card.yaml.
Remove sections that are intentionally outside the requested view, but do not
invent values. Render unavailable fields from field_states using one of these
exact meanings:
- Unknown
- Not applicable
- Not analyzed
- No evidence found at {{ source_snapshot.analysis_depth }} depth
Never shorten these states to "not found" or treat them as proof of absence.
-->

## Snapshot

| Field | Value |
| --- | --- |
| Card ID | `{{ card_id }}` |
| Card version | `{{ card_version }}` |
| Schema version | `{{ schema_version }}` |
| Project ID | `{{ project.project_id }}` |
| Primary type | `{{ project.primary_type }}` |
| Project status | `{{ project.status }}` |
| Project boundary | {{ project.boundary or rendered field state }} |
| Primary repository | `{{ primary repository URL }}` |
| Additional sources | {{ supporting repositories, packages, services, and documentation sites or rendered field state }} |
| Source revision | `{{ primary branch, tag, and commit }}` |
| Working-tree state | {{ clean, or dirty with working-tree digest }} |
| Analyzed at | `{{ source_snapshot.analyzed_at }}` |
| Analysis depth | `{{ source_snapshot.analysis_depth }}` |
| License | {{ project.license or rendered field state }} |
| Maturity | `{{ assessment.maturity }}` |

**In one sentence:** {{ summary.one_line or rendered field state }}

## What It Is

{{ summary.purpose or rendered field state }}

- **Target users:** {{ summary.target_users or rendered field state }}
- **Primary use cases:** {{ summary.primary_use_cases or rendered field state }}

### Classification

- **Rationale:** {{ project.type_rationale or rendered field state }}
- **Secondary characteristics:** {{ classification.secondary_characteristics or rendered field state }}
- **Domains:** {{ classification.domains or rendered field state }}
- **Delivery forms:** {{ classification.delivery_forms or rendered field state }}
- **Agent patterns:** {{ classification.agent_patterns or rendered field state }}
- **Architecture layers:** {{ classification.architecture_layers or rendered field state }}
- **Supporting claims:** {{ classification.claim_ids }}

## Core Capabilities

| Capability | Support status | Verification | Evidence status | Confidence | Claims | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| {{ capability.name }} | `{{ capability.support_status or rendered field state }}` | `{{ verification status from referenced claims }}` | `{{ capability.evidence_status }}` | `{{ capability.confidence }}` | {{ capability.claim_ids }} | {{ capability.evidence_refs }} |

<!--
Keep support status, claim verification, evidence status, and confidence
independent. Never render statically_confirmed as runtime_verified.
-->

## How It Works

{{ architecture.overview or rendered field state }}

- **Data flow:** {{ architecture.data_flows or rendered field state }}
- **Control flow:** {{ architecture.control_flows or rendered field state }}

### Key Components

| Component | Path | Project type | Purpose | Claims |
| --- | --- | --- | --- | --- |
| {{ component.name }} | `{{ component.path or rendered field state }}` | `{{ component.project_type or rendered field state }}` | {{ component.purpose or rendered field state }} | {{ component.claim_ids }} |

### Architecture and Services Used

- **Languages:** {{ architecture.languages or rendered field state }}
- **Frameworks and SDKs:** {{ architecture.frameworks_and_sdks or rendered field state }}
- **Models and providers:** {{ architecture.model_providers or rendered field state }}
- **Runtime and orchestration:** {{ architecture.runtime_and_orchestration or rendered field state }}
- **Tools and MCP:** {{ architecture.tools_and_mcp.tools or rendered field state }}; MCP role `{{ architecture.tools_and_mcp.mcp_role }}`; {{ architecture.tools_and_mcp.mcp_details or rendered field state }}
- **Skills:** {{ architecture.skills or rendered field state }}
- **Memory and state:** {{ architecture.memory_and_state or rendered field state }}
- **Retrieval and knowledge:** {{ architecture.retrieval_and_knowledge or rendered field state }}
- **Document processing:** {{ architecture.document_processing or rendered field state }}
- **Execution and sandbox:** {{ architecture.execution_and_sandbox or rendered field state }}
- **Gateways and routing:** {{ architecture.gateways_and_routing or rendered field state }}
- **Storage and databases:** {{ architecture.storage_and_databases or rendered field state }}
- **Interfaces:** {{ architecture.interfaces or rendered field state }}
- **Deployment:** {{ architecture.deployment or rendered field state }}
- **Observability and evaluation:** {{ architecture.observability_and_evaluation or rendered field state }}
- **Security and permissions:** {{ architecture.security_and_permissions or rendered field state }}

## Developer Experience

- **Installation:** {{ usage.installation or rendered field state }}
- **Configuration:** {{ usage.configuration or rendered field state }}
- **Minimal start:** {{ usage.minimal_start or rendered field state }}
- **Required services:** {{ usage.required_services or rendered field state }}
- **Extension points:** {{ usage.extension_points or rendered field state }}

## Assessment Context

| Field | Value |
| --- | --- |
| Context ID | `{{ assessment context.context_id }}` |
| Use case | {{ assessment context.use_case }} |
| Comparison cohort | {{ assessment context.comparison_cohort or rendered field state }} |
| Requirements | {{ assessment context.requirements or rendered field state }} |
| Organizational constraints | {{ assessment context.organizational_constraints or rendered field state }} |
| Assessed at | `{{ assessment context.assessed_at }}` |

## Assessment

### Maturity Signals

- {{ maturity signal.statement }} — {{ maturity signal.reasoning or rendered field state }} (`{{ maturity signal.confidence }}`; context `{{ maturity signal.context_id }}`; claims {{ maturity signal.claim_ids }})

### Strengths

- {{ strength.statement }} — {{ strength.reasoning or rendered field state }} (`{{ strength.confidence }}`; context `{{ strength.context_id }}`; claims {{ strength.claim_ids }})

### Limitations

- {{ limitation.statement }} — {{ limitation.reasoning or rendered field state }} (`{{ limitation.confidence }}`; context `{{ limitation.context_id }}`; claims {{ limitation.claim_ids }})

### Risks

- {{ risk.statement }} — {{ risk.reasoning or rendered field state }} (`{{ risk.confidence }}`; context `{{ risk.context_id }}`; claims {{ risk.claim_ids }})

### Best Fit

- {{ best-fit statement }} — {{ reasoning or rendered field state }} (`{{ confidence }}`; context `{{ context_id }}`; claims {{ claim_ids }})

### Poor Fit

- {{ poor-fit statement }} — {{ reasoning or rendered field state }} (`{{ confidence }}`; context `{{ context_id }}`; claims {{ claim_ids }})

### Gaps

- {{ gap statement }} — {{ reasoning or rendered field state }} (`{{ confidence }}`; context `{{ context_id }}`; claims {{ claim_ids }})

## Relationships

| Relationship | Target project | Scope | Confidence | Claims |
| --- | --- | --- | --- | --- |
| Depends on / integrates with / comparable to | {{ relationship.target_project or scalar relationship value }} | {{ relationship.scope or rendered field state }} | `{{ relationship.confidence or rendered field state }}` | {{ relationship.claim_ids or rendered field state }} |

## Open Questions

| Question | Reason | Related claims |
| --- | --- | --- |
| {{ open question.question or scalar open-question value }} | {{ open question.reason or rendered field state }} | {{ open question.related_claim_ids or rendered field state }} |

## Claim Index

| Claim ID | Statement | Kind | Verification | Confidence | Supporting evidence | Conflicting evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `{{ claim.claim_id }}` | {{ claim.statement }} | `{{ claim.claim_kind }}` | `{{ claim.verification_status }}` | `{{ claim.confidence }}` | {{ claim.supporting_evidence_ids }} | {{ claim.conflicting_evidence_ids }} |

## Evidence Index

| Evidence ID | Source ID | Precise locator | Evidence status | Confidence | Note |
| --- | --- | --- | --- | --- | --- |
| `{{ evidence.evidence_id }}` | `{{ evidence.source_id }}` | `{{ evidence.locator.path or rendered field state }}`; `{{ evidence.locator.symbol_or_section or rendered field state }}`; lines {{ evidence.locator.line_start or rendered field state }}–{{ evidence.locator.line_end or rendered field state }} | `{{ evidence.evidence_status }}` | `{{ evidence.confidence }}` | {{ evidence.note or rendered field state }} |

## Source Index

| Source ID | Type | Provenance | URI | Revision or version | Retrieved at | Digest |
| --- | --- | --- | --- | --- | --- | --- |
| `{{ source.source_id }}` | `{{ source.source_type }}` | `{{ source.provenance }}` | {{ source.uri }} | `{{ source.revision_or_version or rendered field state }}` | `{{ source.retrieved_at }}` | `{{ source.content_digest or rendered field state }}` |
