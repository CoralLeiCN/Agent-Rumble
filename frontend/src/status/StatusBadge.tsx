import { verificationPresentation } from "./statusPresentation";
import type { VerificationStatus } from "../types/catalog";
export function StatusBadge({ status }: { status: VerificationStatus }) {
  const presentation = verificationPresentation[status];
  return (
    <span className={`status-badge status-badge--${presentation.tone}`}>
      <span aria-hidden="true">{presentation.symbol}</span>
      {presentation.label}
    </span>
  );
}
