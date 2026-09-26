import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { StatusBadge } from "../status/StatusBadge";
import { confidencePresentation } from "../status/statusPresentation";
import type { ClaimEvidenceRecord } from "../types/catalog";

interface EvidenceDrawerProps {
  evidence: ClaimEvidenceRecord | null;
  pending: boolean;
  error: string | null;
  isIllustrative: boolean;
  onClose: () => void;
}

function sourcePublisherLabel(value: string) {
  if (value === "first_party") return "Project publisher";
  if (value === "third_party") return "Third-party publisher";
  return "Publisher not recorded";
}

function readableSourceValue(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function EvidenceDrawer({
  evidence,
  pending,
  error,
  isIllustrative,
  onClose,
}: EvidenceDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !drawerRef.current) return;
    const focusable = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href]",
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="drawer-layer"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        className="evidence-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-title"
        onKeyDown={handleKeyDown}
      >
        <div className="drawer-header">
          <div>
            <span>Source details</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close source details"
          >
            ×
          </button>
        </div>
        {pending && (
          <div className="drawer-state" role="status">
            <h2 className="visually-hidden" id="evidence-title">
              Source details
            </h2>
            <p>Loading source details…</p>
          </div>
        )}
        {error && (
          <div className="drawer-state drawer-state--error" role="alert">
            <h2 className="visually-hidden" id="evidence-title">
              Source details error
            </h2>
            <p>{error}</p>
          </div>
        )}
        {evidence && (
          <div className="drawer-content">
            <div className="drawer-claim-semantics">
              <div>
                <span>Verification</span>
                <StatusBadge status={evidence.verificationStatus} />
              </div>
              <div>
                <span>Confidence</span>
                <strong>{confidencePresentation[evidence.confidence]}</strong>
              </div>
            </div>
            <h2 id="evidence-title">{evidence.claim}</h2>
            <section>
              <h3>Why this matters</h3>
              <p>{evidence.whyItMatters}</p>
            </section>
            <div className="evidence-stack">
              <h3>Supporting sources / {evidence.supportingEvidence.length}</h3>
              {evidence.supportingEvidence.length === 0 && (
                <p className="empty-evidence">○ No supporting source linked</p>
              )}
              {evidence.supportingEvidence.map((record) => (
                <div className="evidence-record" key={record.id}>
                  <div className="evidence-record__heading">
                    <div>
                      <span>Confidence</span>
                      <strong>
                        {confidencePresentation[record.confidence]}
                      </strong>
                    </div>
                  </div>
                  <dl className="evidence-ledger">
                    <div>
                      <dt>Source</dt>
                      <dd>{record.repository}</dd>
                    </div>
                    <div>
                      <dt>Source type</dt>
                      <dd>{readableSourceValue(record.sourceType)}</dd>
                    </div>
                    <div>
                      <dt>Publisher</dt>
                      <dd>{sourcePublisherLabel(record.provenance)}</dd>
                    </div>
                    <div>
                      <dt>Availability</dt>
                      <dd>{readableSourceValue(record.accessScope)}</dd>
                    </div>
                    <div>
                      <dt>Checked</dt>
                      <dd>
                        <time dateTime={record.retrievedAt}>
                          {record.retrievedAt}
                        </time>
                      </dd>
                    </div>
                    <div>
                      <dt>Version reviewed</dt>
                      <dd>
                        <code>{record.revision}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Location in source</dt>
                      <dd>{record.locator}</dd>
                    </div>
                  </dl>
                  <pre aria-label="Source excerpt">
                    <code>{record.excerpt}</code>
                  </pre>
                  {record.sourceUrl ? (
                    <a
                      className="button button--source"
                      href={record.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View source ↗
                    </a>
                  ) : (
                    <p className="source-unavailable">
                      No public source link is available.
                    </p>
                  )}
                </div>
              ))}
              {evidence.conflictingEvidence.length > 0 && (
                <>
                  <h3 className="evidence-stack__conflict">
                    Conflicting evidence / {evidence.conflictingEvidence.length}
                  </h3>
                  {evidence.conflictingEvidence.map((record) => (
                    <div
                      className="evidence-record evidence-record--conflict"
                      key={record.id}
                    >
                      <div className="evidence-record__heading">
                        <div>
                          <span>Confidence</span>
                          <strong>
                            {confidencePresentation[record.confidence]}
                          </strong>
                        </div>
                      </div>
                      <dl className="evidence-ledger">
                        <div>
                          <dt>Source</dt>
                          <dd>{record.repository}</dd>
                        </div>
                        <div>
                          <dt>Source type</dt>
                          <dd>{readableSourceValue(record.sourceType)}</dd>
                        </div>
                        <div>
                          <dt>Publisher</dt>
                          <dd>{sourcePublisherLabel(record.provenance)}</dd>
                        </div>
                        <div>
                          <dt>Availability</dt>
                          <dd>{readableSourceValue(record.accessScope)}</dd>
                        </div>
                        <div>
                          <dt>Checked</dt>
                          <dd>
                            <time dateTime={record.retrievedAt}>
                              {record.retrievedAt}
                            </time>
                          </dd>
                        </div>
                        <div>
                          <dt>Version reviewed</dt>
                          <dd>
                            <code>{record.revision}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>Location in source</dt>
                          <dd>{record.locator}</dd>
                        </div>
                      </dl>
                      <pre aria-label="Conflicting source excerpt">
                        <code>{record.excerpt}</code>
                      </pre>
                      {record.sourceUrl ? (
                        <a
                          className="button button--source"
                          href={record.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View source ↗
                        </a>
                      ) : (
                        <p className="source-unavailable">
                          No public source link is available.
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
            {isIllustrative && (
              <div className="drawer-warning">
                <strong>Sample data.</strong> This source excerpt and location
                are illustrative and should be independently verified.
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
