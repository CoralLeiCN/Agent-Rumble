import type { EvidenceRecord } from "../types/catalog";
import type {
  RumbleCell,
  RumbleClaim,
  RumbleEntrant,
  RumbleRound,
} from "../types/rumble";
import { toCatalogEvidenceRecord } from "../data/rumbleGateway";
import {
  alignmentLabels,
  comparisonStateFor,
  confidenceFor,
  verdictPresentation,
  verificationFor,
} from "./arenaPresentation";

export type OpenArenaEvidence = (
  evidence: EvidenceRecord,
  trigger: HTMLButtonElement,
) => void;

interface RoundCardProps {
  round: RumbleRound;
  entrants: RumbleEntrant[];
  claims: RumbleClaim[];
  isFinalRound: boolean;
  onAdvance: () => void;
  onOpenEvidence: OpenArenaEvidence;
}

function RumbleStatus({ cell }: { cell: RumbleCell }) {
  const verification = verificationFor(cell.verification_status);
  return (
    <div className="round-finding__status">
      <span className={`arena-status arena-status--${verification.tone}`}>
        <span aria-hidden="true">{verification.symbol}</span>
        {verification.label}
      </span>
      <span>{confidenceFor(cell.confidence)}</span>
    </div>
  );
}

interface ClaimSourcesProps {
  claim: RumbleClaim;
  onOpenEvidence: OpenArenaEvidence;
}

function ClaimSources({ claim, onOpenEvidence }: ClaimSourcesProps) {
  const sources = [
    ...claim.supporting_evidence.map((evidence) => ({ evidence, relationship: "supporting" as const })),
    ...claim.conflicting_evidence.map((evidence) => ({ evidence, relationship: "conflicting" as const })),
  ];

  return (
    <li className="claim-source">
      <code>{claim.claim_id}</code>
      {sources.length === 0 && <span>No evidence locator is attached to this claim.</span>}
      {sources.map(({ evidence, relationship }, index) => {
        const catalogEvidence = toCatalogEvidenceRecord(claim, evidence, relationship);
        if (!catalogEvidence) {
          return (
            <span key={`${relationship}-${evidence.evidence_id}`}>
              {relationship === "conflicting" ? "Conflicting source" : "Source"} recorded · status cannot be projected in this drawer
            </span>
          );
        }
        return (
          <button
            className={`claim-source__button claim-source__button--${relationship}`}
            key={`${relationship}-${evidence.evidence_id}`}
            type="button"
            onClick={(event) => onOpenEvidence(catalogEvidence, event.currentTarget)}
            aria-label={`${relationship === "conflicting" ? "Inspect conflicting evidence" : "Inspect evidence"} for ${claim.statement}`}
          >
            {relationship === "conflicting" ? "Conflicting source" : "Inspect evidence"}
            {sources.length > 1 ? ` ${index + 1}` : ""} →
          </button>
        );
      })}
    </li>
  );
}

interface RoundFindingProps {
  cell: RumbleCell;
  entrant: RumbleEntrant;
  side: "a" | "b";
  hasEdge: boolean;
  claims: RumbleClaim[];
  onOpenEvidence: OpenArenaEvidence;
}

function RoundFinding({
  cell,
  entrant,
  side,
  hasEdge,
  claims,
  onOpenEvidence,
}: RoundFindingProps) {
  const resolvedClaims = cell.claim_ids
    .map((claimId) => claims.find((claim) => claim.claim_id === claimId))
    .filter((claim): claim is RumbleClaim => Boolean(claim));

  return (
    <article
      className={`round-finding round-finding--${side}${hasEdge ? " round-finding--edge" : ""}`}
      aria-label={`${entrant.project_name} finding`}
    >
      <header>
        <span>{side === "a" ? "Left corner" : "Right corner"}</span>
        <h3>{entrant.project_name}</h3>
        <code>REV {entrant.source_snapshot.revision}</code>
      </header>
      <div className="round-finding__body">
        {cell.state === "value" ? (
          <>
            <p>{cell.value}</p>
            <span className={`alignment alignment--${cell.alignment}`}>
              {alignmentLabels[cell.alignment]}
            </span>
          </>
        ) : (
          <div className={`arena-null arena-null--${comparisonStateFor(cell.state).tone}`}>
            <span aria-hidden="true">{comparisonStateFor(cell.state).symbol}</span>
            <span>
              <strong>{comparisonStateFor(cell.state).label}</strong>
              Absence of evidence is not evidence that the capability is absent.
            </span>
          </div>
        )}
        <RumbleStatus cell={cell} />
        {cell.claim_ids.length > 0 && resolvedClaims.length === 0 && (
          <p className="round-finding__claim-warning" role="note">
            Claim reference {cell.claim_ids.join(", ")} is not present in this demo bundle.
          </p>
        )}
        {resolvedClaims.length > 0 && (
          <ul className="claim-sources" aria-label={`Claim evidence for ${entrant.project_name}`}>
            {resolvedClaims.map((claim) => (
              <ClaimSources key={claim.claim_id} claim={claim} onOpenEvidence={onOpenEvidence} />
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function RoundCard({
  round,
  entrants,
  claims,
  isFinalRound,
  onAdvance,
  onOpenEvidence,
}: RoundCardProps) {
  const entrantA = entrants[0];
  const entrantB = entrants[1];
  if (!entrantA || !entrantB) return null;
  const verdict = verdictPresentation[round.verdict];

  return (
    <section className="round-card" aria-labelledby={`${round.round_id}-title`}>
      <header className="round-card__header">
        <div>
          <span className="round-card__dimension">{round.dimension}</span>
          <h2 id={`${round.round_id}-title`} tabIndex={-1}>{round.title}</h2>
          <p>{round.label}</p>
        </div>
        <div className={`round-verdict round-verdict--${verdict.tone}`}>
          <span aria-hidden="true">{verdict.symbol}</span>
          <strong>{verdict.label}</strong>
        </div>
      </header>

      <div className="round-requirement">
        <strong>Requirement in this Assessment Context</strong>
        <p>{round.requirement}</p>
      </div>

      <div className="round-findings">
        <RoundFinding
          cell={round.entrant_a}
          entrant={entrantA}
          side="a"
          hasEdge={round.verdict === "entrant_a_advantage"}
          claims={claims}
          onOpenEvidence={onOpenEvidence}
        />
        <div className="round-findings__versus" aria-hidden="true">VS</div>
        <RoundFinding
          cell={round.entrant_b}
          entrant={entrantB}
          side="b"
          hasEdge={round.verdict === "entrant_b_advantage"}
          claims={claims}
          onOpenEvidence={onOpenEvidence}
        />
      </div>

      <footer className={`round-callout round-callout--${verdict.tone}`}>
        <div>
          <span>Ring call</span>
          <strong>{round.callout}</strong>
        </div>
        <button className="button button--primary" type="button" onClick={onAdvance}>
          {isFinalRound ? "See contextual recap →" : "Next round →"}
        </button>
      </footer>
    </section>
  );
}
