import payload from "./canonicalRumble.json";
import type { CanonicalRumbleResult, RumbleGateway } from "../types/rumble";

// First three rows of a local /catalog/rumble response for the two SDK v2 cards
// under developmentContext. Kept only in tests; production loads the API.
export const canonicalRumble = payload as CanonicalRumbleResult;

export class FixtureRumbleGateway implements RumbleGateway {
  async load() {
    return structuredClone(canonicalRumble);
  }
}
