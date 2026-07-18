import type { RumbleEntrant } from "../types/rumble";
import { humanizeRole, shortDate } from "./arenaPresentation";

interface FighterPanelProps {
  entrant: RumbleEntrant;
  corner: "left" | "right";
  highlighted?: boolean;
  subdued?: boolean;
}

export function FighterPanel({
  entrant,
  corner,
  highlighted = false,
  subdued = false,
}: FighterPanelProps) {
  const snapshot = entrant.source_snapshot;
  return (
    <article
      className={[
        "fighter-panel",
        `fighter-panel--${corner}`,
        highlighted ? "fighter-panel--edge" : "",
        subdued ? "fighter-panel--subdued" : "",
      ].filter(Boolean).join(" ")}
      aria-label={`${entrant.project_name}, ${corner} corner`}
    >
      <div className="fighter-panel__corner">
        <span aria-hidden="true">{corner === "left" ? "A" : "B"}</span>
        {corner} corner
      </div>
      <h2>{entrant.project_name}</h2>
      <ul className="fighter-panel__roles" aria-label="Project roles">
        {entrant.project_roles.map((role) => (
          <li key={role}>{humanizeRole(role)}</li>
        ))}
      </ul>
      <dl className="fighter-panel__snapshot">
        <div>
          <dt>Card</dt>
          <dd>{snapshot.card_id} · v{snapshot.card_version}</dd>
        </div>
        <div>
          <dt>Revision</dt>
          <dd><code>{snapshot.revision}</code></dd>
        </div>
        <div>
          <dt>Analyzed</dt>
          <dd><time dateTime={snapshot.analyzed_at}>{shortDate(snapshot.analyzed_at)}</time></dd>
        </div>
      </dl>
    </article>
  );
}
