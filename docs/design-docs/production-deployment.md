# Production Deployment

**Status:** Proposed

This document proposes a path from hackathon deployment to a production-capable
Agent Project Intelligence installation. The
[YAML-first card catalog](../decisions.md#yaml-first-card-catalog) is accepted
for the first implementation. Deployment platforms, later database-backed
capabilities, authentication providers, and hosting vendors remain open until
recorded in the [architecture decisions record](../decisions.md).

## Architecture Principle

Interactive catalog use should not invoke an AI model.

Search, filtering, card viewing, and comparison operate on preprocessed,
versioned Agent Project Cards loaded directly from canonical YAML files. Codex
and the OpenAI Agents SDK run outside interactive catalog requests to manufacture
and refresh the intelligence layer.

This boundary provides:

* Predictable interactive latency
* Cacheable public pages and API responses
* Controlled preprocessing concurrency and cost
* Reusable results for both humans and agents
* Reproducible cards tied to source snapshots
* Isolation between untrusted repository analysis and public request handling

## Deferred Managed Scaling Stack

The managed stack below is a possible post-MVP scaling path. It is not required
for the YAML-first catalog, and its relational and vector projections must not
be implemented as current scope without a later accepted decision.

```text
Browser or downstream agent
          │
          ▼
React frontend on Vercel
          │
          ▼
FastAPI web service on Render ────────────┐
          │                              │
          ▼                              ▼
Supabase Postgres                  Supabase Auth
├── card projections               └── admin and saved work
├── claims and evidence
├── full-text search
├── pgvector search
├── analysis jobs
└── audit records
          │
          ▼
Supabase PGMQ
          │
          ▼
Render background worker
├── ephemeral repository clone
├── static evidence extraction
├── Agents SDK and Codex analysis
├── card-schema validation
├── immutable artifact persistence
└── relational projection update
          │
          ├── Supabase Storage
          ├── OpenAI Agents traces
          └── Sentry and structured logs

Render Cron Job ──► enqueue new or stale catalog projects
```

| Concern | Proposed service | Reason |
| --- | --- | --- |
| React frontend and CDN | Vercel | Git-connected preview and production deployments, rollback, domains, and CDN delivery |
| FastAPI | Render web service | Direct Python or container deployment with health checks |
| Preprocessing | Render background worker | Long analysis jobs remain outside HTTP request handling |
| Scheduled refresh | Render cron job | Enqueue new or stale catalog projects |
| Deferred relational state | Supabase Postgres | Possible later projections, jobs, users, and audit records |
| Deferred keyword index | PostgreSQL full-text, GIN, and trigram indexes | Scale beyond direct YAML-derived search when measurements justify it |
| Backlog semantic search | `pgvector` HNSW index | Possible later natural-language discovery combined with structured filters |
| Durable queue | Supabase PGMQ | Queueing, visibility timeouts, retries, and archival within Postgres |
| Immutable artifacts | Supabase Storage | Canonical card files and retained analysis artifacts |
| Authentication | Supabase Auth | Public anonymous browsing plus protected administration and saved work |
| Application observability | Sentry and structured logs | Frontend and backend errors, performance, and correlated requests |
| Agent observability | OpenAI Agents SDK tracing | Generations, tool calls, handoffs, guardrails, duration, and usage |
| DNS and TLS | Cloudflare DNS with provider-managed certificates | Low certificate-management overhead |
| CI/CD | GitHub Actions plus provider Git integration | Test and validation gates before automatic deployment |

Render documents web services, static sites, background workers, cron jobs,
workflows, managed Postgres, and Redis-compatible key-value services as supported
service types: [Render service types](https://render.com/docs/service-types).
Supabase provides Postgres, supported extensions, Auth, Storage, and Queues:
[database](https://supabase.com/docs/guides/database/overview),
[PGMQ](https://supabase.com/docs/guides/queues/pgmq), and
[vector indexes](https://supabase.com/docs/guides/ai/vector-indexes).

## Card Storage Model

To satisfy the
[Agent Project Card Service and Storage requirement](../requirements.md#agent-project-card-service-and-storage),
the first implementation stores each generated card once, as an immutable
canonical YAML artifact:

```text
catalog/cards/{encoded_card_id}/versions/{card_version}/project-card.yaml
```

`encoded_card_id` is the percent-encoded UTF-8 card ID used as one safe path
segment. The backend discovers and validates these files, selects the greatest
valid card version for each card ID, and reads the selected YAML directly for
service responses. Basic search and filters may use a disposable in-memory
projection, but no persistent relational or vector projection is part of the
first implementation.

Publication validates the complete card before atomically placing the YAML file
at its final versioned path. A failed publication does not expose a partial
version. Refresh creates a new file rather than changing an existing card's
meaning in place.

A later scaling design may add relational projections containing:

* Project identity and repository sources
* Card, schema, ontology, and analyzer versions
* Project type and architecture layers
* Capabilities and support statuses
* Technologies, interfaces, prerequisites, and constraints
* Claims, confidence, verification status, and evidence locators
* Assessment contexts and contextual conclusions
* Analysis revision, timestamps, and freshness

Any later projection remains derived from an identified YAML card version and
must be rebuildable. Embeddings and vector search remain in the
[backlog](../backlog.md#semantic-and-vector-search).

## Search Pipeline

The first search implementation should:

1. Load and validate the canonical YAML catalog.
2. Build disposable in-memory text and structured-field representations.
3. Apply basic keyword matching over card text.
4. Apply filters such as project role, language, license, required
   capability status, maturity, and freshness.
5. Return match explanations derived from card fields and claims.

A persistent text or vector index should be introduced only when measured
catalog scale, latency, relevance, or search analytics justify the operational
cost and a later architecture decision accepts it.

## Preprocessing Worker

The worker should:

1. Claim a queued job with a visibility timeout.
2. Clone pinned repository revisions into an ephemeral workspace.
3. Extract repository metadata and static evidence without executing repository
   code.
4. Run the Agents SDK and Codex analysis under the declared project boundary.
5. Validate the result against the versioned Agent Project Card schema.
6. Write the immutable YAML card artifact atomically.
7. Trigger a catalog reload after successful publication.
8. Complete, retry with backoff, or move the job to a dead-letter path.

An idempotency key should include:

```text
project boundary
+ repository revision set
+ schema version
+ ontology versions
+ analyzer version
+ analysis configuration digest
```

The repository-analysis process should not receive broad production credentials.
A trusted wrapper supplies scoped job data and persists validated results.
Repository content remains untrusted data and repository code is not run in the
static-analysis MVP.

## Authentication and Security

Keep catalog reads anonymous initially. Require authentication for:

* Catalog administration
* Preprocessing and refresh jobs
* Saved comparisons
* P2 private workspaces, if later approved

Controls include:

* Expose only browser-safe publishable configuration to React.
* Never expose an OpenAI key, GitHub token, database service credential, or
  worker credential in frontend environment variables.
* Validate authentication tokens and administrator roles in FastAPI.
* Give API and worker processes separate credentials and privileges.
* Restrict CORS to production and approved preview domains.
* Rate-limit search and comparison endpoints.
* Apply stricter admission control to paid preprocessing operations.
* Store secrets through provider secret management rather than source control or
  image build arguments.

Supabase Auth supports social authentication and Postgres row-level security:
[Supabase Auth](https://supabase.com/docs/guides/auth). Render supports secret
environment variables and environment groups:
[Render environment variables](https://render.com/docs/configure-environment-variables).

## Observability and Cost Control

Correlate every request and analysis run with identifiers for the request,
project, card, and analysis job.

Monitor:

* API error rate and latency
* Queue age, queue depth, and stuck jobs
* Card-schema validation failures
* Stale-card percentage
* Token usage, duration, retries, and cost per repository
* Unexpected catalog changes after analyzer upgrades
* Daily model spend

The OpenAI Agents SDK traces generations, tool calls, handoffs, guardrails, and
custom events. Long-running workers can explicitly flush traces. Because traces
may contain model or tool inputs and outputs, production should disable sensitive
trace data unless it is explicitly required:
[Agents SDK tracing](https://openai.github.io/openai-agents-python/tracing/).

Cost controls include:

* Never invoke a model for ordinary interactive catalog reads.
* Analyze only pinned revisions that changed.
* Reuse content-hashed extraction for unchanged files.
* Cap worker concurrency, repository size, and daily job admission.
* Use a cheaper mapping and triage stage before expensive synthesis.
* Persist usage and estimated cost per card.
* Add application-enforced daily spending limits in addition to provider alerts.

## Backups and Recovery

For production:

* Enable paid managed database backups.
* Create regular off-platform logical database backups.
* Replicate canonical card artifacts or enable independent object versioning.
* Test restoration rather than only checking that backups exist.
* Define recovery time and recovery point objectives.

Supabase database backups do not include Storage objects, so database and object
recovery must be designed separately:
[Supabase backups](https://supabase.com/docs/guides/platform/backups).

Cards can be regenerated from recorded source snapshots, but preprocessing cost,
manual review state, and historical card versions remain valuable production
data and require backups.

## Deployment Sequence

### Hackathon

1. Pre-generate a small curated catalog.
2. Bundle the validated versioned YAML catalog with the FastAPI deployment.
3. Deploy the React frontend to Vercel.
4. Deploy FastAPI to a Render web service.
5. Keep preprocessing manual or local for the judged demo.
6. Bundle a clearly labeled static fallback catalog so the demo survives an API
   outage.
7. Add custom domains only after the main flow is reliable.

Live preprocessing should not be a dependency of the judged demo.

### Production Transition

1. Create separate staging and production projects and credentials.
2. Publish validated YAML card versions through an atomic deployment or artifact
   synchronization process.
3. Package API and worker entry points independently.
4. Add `render.yaml` for the API, worker, cron job, health checks, and non-secret
   configuration.
5. Add authenticated catalog administration and enqueue refreshes through PGMQ.
6. Add row-level security, roles, rate limits, and budget controls.
7. Configure Vercel production and preview environments.
8. Configure custom domains and managed TLS.
9. Add GitHub Actions for tests, validation, migrations, and deployment gates.
10. Add Sentry, Agents traces, uptime checks, alerts, and backup verification.
11. Load-test search, comparison, and card pages before public launch.

Vercel and Render support Git-connected deployments, and Render manages TLS for
custom domains: [Vercel Git deployments](https://vercel.com/docs/git) and
[Render custom domains](https://render.com/docs/custom-domains).

## Indicative Cost

An early production deployment is likely to have a managed-infrastructure floor
on the order of tens to low hundreds of US dollars per month, plus variable
OpenAI usage. Current pricing must be checked immediately before purchase:
[Vercel](https://vercel.com/docs/plans),
[Render](https://render.com/pricing), and
[Supabase](https://supabase.com/pricing).

Model use may dominate the total. The preprocessing pipeline should record cost
per card and enforce its own admission and spending limits.

## Alternatives

### Fewer Vendors: Render

Render can host the React static site, FastAPI web service, background worker,
cron job, managed Postgres, and Redis-compatible queue from one dashboard and
`render.yaml`.

This reduces vendor and deployment complexity. Authentication and object storage
would require more application work or an additional provider. It is attractive
when one control plane matters more than Supabase's integrated data services.

### Enterprise Cloud: Google Cloud

A later enterprise-oriented deployment can use:

* Cloud Run for FastAPI
* Cloud Run Jobs or worker pools for preprocessing
* Cloud Tasks or Pub/Sub
* Cloud SQL PostgreSQL with `pgvector`
* Cloud Storage
* Secret Manager
* Identity Platform
* Cloud Logging and Monitoring
* Artifact Registry and GitHub Actions federation

Cloud Run supports stateless HTTP services and run-to-completion jobs:
[Cloud Run overview](https://cloud.google.com/run/docs/overview/what-is-cloud-run)
and [Cloud Run jobs](https://cloud.google.com/run/docs/create-jobs).

This path offers stronger IAM, networking, service identities, and batch scale,
but adds cost and configuration that are unnecessary for the hackathon.

## Recommendation

Start with the versioned YAML catalog bundled into the FastAPI deployment, using
Vercel and Render only if those hosting choices are later accepted. Keep all
expensive Codex work outside interactive requests. Defer Supabase, relational
search projections, and vector infrastructure until measured needs justify a
later architecture decision.
